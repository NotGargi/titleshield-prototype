import { Router, Request, Response } from 'express';
import { jobQueue } from '../services/jobQueue';
import { jobEventBus } from '../events/jobEvents';
import { validateSessionToken } from '../db/sessionsRepository';
function tfUserIdFromReq(req: any): string | undefined {
  try {
    const h = req.headers?.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return undefined;
    const r = validateSessionToken(m[1].trim());
    return r?.user?.id;
  } catch { return undefined; }
}


export const jobsRouter = Router();

/**
 * GET /api/records/jobs/dlq (or /api/jobs/dlq)
 * Inspects dead-letter queue records with structured failure diagnostics
 */
jobsRouter.get('/dlq', (req: Request, res: Response): void => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const dlqRecords = jobQueue.getDlqRecords(limit);
    res.json({
      success: true,
      count: dlqRecords.length,
      dlq: dlqRecords
    });
  } catch (err: any) {
    console.error('[JobsRouter] Error fetching DLQ:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch DLQ' });
  }
});

/**
 * POST /api/records/jobs (or /api/jobs)
 * Asynchronously incepts a query for any of the 6 features, returning HTTP 202 Accepted immediately
 */
jobsRouter.post('/', (req: Request, res: Response): void => {
  try {
    const simHeader = (req.headers['x-simulate-failure'] as string) || undefined;
    const bodySim = req.body.simulationFailure || req.body.simulateFailure;
    const simulationFailure = simHeader || bodySim;

    const input = {
      ...req.body,
      tfUserId: tfUserIdFromReq(req),
      simulationFailure
    };

    const job = jobQueue.enqueueJob(input);

    res.status(202).json({
      success: true,
      status: job.status,
      jobId: job.id,
      ticketId: job.ticketId,
      ticket: job.ticketId,
      feature: job.feature,
      trackingUrl: `/api/records/jobs/${job.id}`,
      streamUrl: `/api/records/jobs/${job.id}/stream`,
      createdAt: job.createdAt
    });
  } catch (err: any) {
    console.error('[JobsRouter] Error enqueueing job:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to enqueue job' });
  }
});

/**
 * GET /api/records/jobs/:jobId
 * Returns current job state, steps log, and result (for adaptive polling fallback)
 */
jobsRouter.get('/:jobId', (req: Request, res: Response): void => {
  try {
    const { jobId } = req.params;
    let job = jobQueue.getJob(jobId);

    if (!job) {
      // Also check if lookup was by ticket ID
      job = jobQueue.getJobByTicket(jobId);
    }

    if (!job) {
      res.status(404).json({ success: false, error: `Job with ID or Ticket ${jobId} not found` });
      return;
    }

    res.json({
      success: true,
      job,
      jobId: job.id,
      ticketId: job.ticketId,
      ticket: job.ticketId,
      status: job.status,
      progressPercent: job.progressPercent,
      currentStepMessage: job.currentStepMessage,
      steps: job.stepsLog,
      isDegraded: job.isDegraded,
      degradationReason: job.degradationReason,
      dataProvenance: job.dataProvenance,
      result: job.resultPayload,
      recordId: job.resultRecordId,
      errorCode: job.errorCode,
      errorDetails: job.errorDetails
    });
  } catch (err: any) {
    console.error('[JobsRouter] Error getting job:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to get job' });
  }
});

/**
 * GET /api/records/jobs/:jobId/stream
 * Server-Sent Events (SSE) streaming live milestone progress events
 */
jobsRouter.get('/:jobId/stream', (req: Request, res: Response): void => {
  const { jobId } = req.params;
  let job = jobQueue.getJob(jobId);

  if (!job) {
    job = jobQueue.getJobByTicket(jobId);
  }

  if (!job) {
    res.status(404).json({ success: false, error: `Job with ID or Ticket ${jobId} not found` });
    return;
  }
  const currentJob = job;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  // Flush headers immediately if supported
  if ((res as any).flushHeaders) {
    (res as any).flushHeaders();
  }

  const sendEvent = (eventType: string, data: any) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Keep-alive heartbeat comment every 15s to keep NAT/proxy connections alive
  const heartbeatTimer = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  // If the job is already terminal at connection time, emit state and end stream
  if (job.status === 'COMPLETED') {
    const provenance = job.dataProvenance || job.resultPayload?.dataProvenance || 'LIVE_PORTAL';
    const isLive = job.resultPayload?.isLive !== false && provenance === 'LIVE_PORTAL';
    sendEvent('progress', {
      eventType: 'JOB_COMPLETED',
      jobId: job.id,
      ticketId: job.ticketId,
      status: 'completed',
      progressPct: 100,
      percent: 100,
      recordId: job.resultRecordId,
      isLive,
      dataProvenance: provenance
    });
    sendEvent('completed', {
      jobId: job.id,
      ticketId: job.ticketId,
      status: 'completed',
      percent: 100,
      recordId: job.resultRecordId,
      downloadUrl: `/api/records/${job.resultRecordId}/download`,
      isLive,
      dataProvenance: provenance,
      result: job.resultPayload
    });
    clearInterval(heartbeatTimer);
    res.end();
    return;
  }

  if (job.status === 'DEGRADED_FALLBACK') {
    const provenance = job.dataProvenance || job.resultPayload?.dataProvenance || 'VERIFIED_PRESEEDED_CACHE';
    const degradedData = {
      eventType: 'JOB_DEGRADED',
      jobId: job.id,
      ticketId: job.ticketId,
      status: 'degraded_fallback',
      progressPct: 100,
      percent: 100,
      recordId: job.resultRecordId,
      isLive: false,
      isDegraded: true,
      dataProvenance: provenance,
      reason: job.degradationReason,
      degradationReason: job.degradationReason,
      diagnosticMessage: job.currentStepMessage,
      diagnosticNotice: job.currentStepMessage,
      result: job.resultPayload
    };
    sendEvent('degradation', degradedData);
    sendEvent('progress', degradedData);
    sendEvent('completed', degradedData);
    clearInterval(heartbeatTimer);
    res.end();
    return;
  }

  if (job.status === 'FAILED') {
    sendEvent('failed', {
      eventType: 'JOB_FAILED',
      jobId: job.id,
      ticketId: job.ticketId,
      status: 'failed',
      progressPct: 100,
      percent: 100,
      errorCode: job.errorCode,
      errorDetails: job.errorDetails,
      dlqRouted: true
    });
    clearInterval(heartbeatTimer);
    res.end();
    return;
  }

  // For active jobs, send current initial snapshot
  const initialData = {
    eventType: `JOB_${job.status}`,
    jobId: job.id,
    ticketId: job.ticketId,
    status: job.status,
    progressPct: job.progressPercent,
    percent: job.progressPercent,
    stepMessage: job.currentStepMessage,
    message: job.currentStepMessage,
    milestone: {
      key: job.status,
      label: job.status,
      description: job.currentStepMessage,
      stepIndex: job.stepsLog.length,
      totalSteps: 6,
      status: 'in_progress'
    }
  };
  sendEvent('progress', initialData);
  sendEvent('milestone', initialData);

  function cleanup() {
    clearInterval(heartbeatTimer);
    jobEventBus.removeListener(`job:${currentJob.id}:milestone`, onMilestone);
    jobEventBus.removeListener(`job:${currentJob.id}:completed`, onCompleted);
    jobEventBus.removeListener(`job:${currentJob.id}:degradation`, onDegraded);
    jobEventBus.removeListener(`job:${currentJob.id}:failed`, onFailed);
  }

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);

  // Subscribe to live events on the JobEventBus
  const onMilestone = (payload: any) => {
    const mapped = {
      eventType: `JOB_${payload.status}`,
      jobId: payload.jobId,
      ticketId: payload.ticketId,
      status: payload.status,
      progressPct: payload.percent,
      percent: payload.percent,
      stepMessage: payload.milestone?.description || payload.message,
      message: payload.milestone?.description || payload.message,
      milestone: payload.milestone,
      timestamp: payload.timestamp
    };
    sendEvent('progress', mapped);
    sendEvent('milestone', mapped);
  };

  const onCompleted = (payload: any) => {
    const provenance = payload.dataProvenance || 'LIVE_PORTAL';
    const isLive = payload.isLive !== false && provenance === 'LIVE_PORTAL';
    const mapped = {
      eventType: 'JOB_COMPLETED',
      jobId: payload.jobId,
      ticketId: payload.ticketId,
      status: 'completed',
      progressPct: 100,
      percent: 100,
      recordId: payload.recordId,
      downloadUrl: payload.downloadUrl,
      isLive,
      isDegraded: false,
      dataProvenance: provenance,
      result: payload.resultPayload,
      timestamp: payload.timestamp
    };
    sendEvent('progress', mapped);
    sendEvent('completed', mapped);
    cleanup();
    res.end();
  };

  const onDegraded = (payload: any) => {
    const provenance = payload.dataProvenance || 'VERIFIED_PRESEEDED_CACHE';
    const mapped = {
      eventType: 'JOB_DEGRADED',
      jobId: payload.jobId,
      ticketId: payload.ticketId,
      status: 'degraded_fallback',
      progressPct: 100,
      percent: 100,
      recordId: payload.recordId,
      downloadUrl: payload.downloadUrl,
      isLive: false,
      isDegraded: true,
      dataProvenance: provenance,
      reason: payload.degradationReason,
      degradationReason: payload.degradationReason,
      diagnosticMessage: payload.diagnosticNotice,
      diagnosticNotice: payload.diagnosticNotice,
      upstreamHttpStatus: payload.upstreamHttpStatus,
      result: payload.resultPayload,
      timestamp: payload.timestamp
    };
    sendEvent('degradation', mapped);
    sendEvent('progress', mapped);
    sendEvent('completed', mapped);
    cleanup();
    res.end();
  };

  const onFailed = (payload: any) => {
    const mapped = {
      eventType: 'JOB_FAILED',
      jobId: payload.jobId,
      ticketId: payload.ticketId,
      status: 'failed',
      progressPct: 100,
      percent: 100,
      errorCode: payload.errorCode,
      errorDetails: payload.errorDetails,
      attemptCount: payload.attemptCount,
      dlqRouted: payload.dlqRouted,
      timestamp: payload.timestamp
    };
    sendEvent('failed', mapped);
    sendEvent('progress', mapped);
    cleanup();
    res.end();
  };

  jobEventBus.on(`job:${currentJob.id}:milestone`, onMilestone);
  jobEventBus.on(`job:${currentJob.id}:completed`, onCompleted);
  jobEventBus.on(`job:${currentJob.id}:degradation`, onDegraded);
  jobEventBus.on(`job:${currentJob.id}:failed`, onFailed);

  // Anti-race condition check: If job completed during listener registration, emit terminal event immediately
  const freshJob = jobQueue.getJob(currentJob.id);
  if (freshJob) {
    if (freshJob.status === 'COMPLETED') {
      console.log(`[SSE ${currentJob.id}] Anti-race: already COMPLETED`);
      onCompleted({
        jobId: freshJob.id,
        ticketId: freshJob.ticketId,
        recordId: freshJob.resultRecordId,
        downloadUrl: `/api/records/${freshJob.resultRecordId}/download`,
        dataProvenance: freshJob.dataProvenance,
        resultPayload: freshJob.resultPayload,
        timestamp: freshJob.completedAt
      });
      return;
    }
    if (freshJob.status === 'DEGRADED_FALLBACK') {
      console.log(`[SSE ${currentJob.id}] Anti-race: already DEGRADED_FALLBACK`);
      onDegraded({
        jobId: freshJob.id,
        ticketId: freshJob.ticketId,
        recordId: freshJob.resultRecordId,
        downloadUrl: `/api/records/${freshJob.resultRecordId}/download`,
        dataProvenance: freshJob.dataProvenance,
        degradationReason: freshJob.degradationReason,
        diagnosticNotice: freshJob.currentStepMessage,
        resultPayload: freshJob.resultPayload,
        timestamp: freshJob.completedAt
      });
      return;
    }
    if (freshJob.status === 'FAILED') {
      console.log(`[SSE ${currentJob.id}] Anti-race: already FAILED`);
      onFailed({
        jobId: freshJob.id,
        ticketId: freshJob.ticketId,
        errorCode: freshJob.errorCode,
        errorDetails: freshJob.errorDetails,
        dlqRouted: true,
        timestamp: freshJob.updatedAt
      });
      return;
    }
  }
});
