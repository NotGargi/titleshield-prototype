import { v4 as uuidv4 } from 'uuid';
import { sqlite } from '../db';
import { JobStatus, LandFeatureType, JobStepLogEntry } from '../db/jobsSchema';
import { jobEventBus } from '../events/jobEvents';

export interface CreateJobInput {
  feature?: LandFeatureType;
  docType?: string;
  state: string;
  district?: string;
  taluka?: string;
  village?: string;
  surveyNo?: string;
  ferfarNo?: string;
  deedNo?: string;
  sacNo?: string;
  khataNo?: string;
  ownerName?: string;
  regYear?: string;
  sroOffice?: string;
  mutationMode?: string;
  mutationType?: string;
  simulationFailure?: string;
  [key: string]: any;
}

export interface JobRecord {
  id: string;
  ticketId: string;
  feature: LandFeatureType;
  state: string;
  params: Record<string, any>;
  status: JobStatus;
  progressPercent: number;
  currentStepMessage: string;
  stepsLog: JobStepLogEntry[];
  resultRecordId?: string | null;
  resultPayload?: any | null;
  errorCode?: string | null;
  errorDetails?: string | null;
  isDegraded: boolean;
  degradationReason?: string | null;
  dataProvenance: string;
  retryCount: number;
  maxRetries: number;
  simulationFailure?: string | null;
  workerId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface DlqRecord {
  id: string;
  jobId: string;
  ticketId: string | null;
  feature: LandFeatureType;
  state: string;
  params: Record<string, any>;
  failureReason: string;
  errorDetails: string | null;
  stackTrace: string | null;
  attemptCount: number;
  lastHttpStatus: number | null;
  diagnosticPayload: any | null;
  failedAt: string;
}

export class JobQueue {
  private static instance: JobQueue;

  private constructor() {}

  public static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Normalize feature key from docType or feature field
   */
  public normalizeFeature(input: CreateJobInput): LandFeatureType {
    if (input.feature) {
      const f = input.feature.toUpperCase();
      if (f === '7_12' || f === '7/12' || f === '7-12') return '7_12';
      if (f === 'MUTATION' || f === 'VF6' || f === 'FERFAR') return 'MUTATION';
      if (f === 'INDEX_2' || f === 'INDEX2' || f === 'DEED') return 'INDEX_2';
      if (f === 'AAPLI_CHAWADI' || f === 'CHAWADI' || f === 'NOTICE') return 'AAPLI_CHAWADI';
      if (f === 'CTS_MAP' || f === 'CTS' || f === 'CADASTRE') return 'CTS_MAP';
      if (f === 'BMC_TAX' || f === 'BMC' || f === 'PROPERTY_TAX') return 'BMC_TAX';
      return f;
    }

    const dt = (input.docType || '').toUpperCase();
    if (dt === '7_12' || dt === '7/12' || dt === '8A') return '7_12';
    if (dt === 'MUTATION' || dt === 'VF6' || !!input.ferfarNo) {
      if (input.ferfarNo === '4950' || dt === 'AAPLI_CHAWADI') return 'AAPLI_CHAWADI';
      return 'MUTATION';
    }
    if (dt === 'INDEX_2' || dt === 'REGISTRY_DEED' || dt === 'E_PANJIYAN' || !!input.deedNo) return 'INDEX_2';
    if (dt === 'AAPLI_CHAWADI') return 'AAPLI_CHAWADI';
    if (dt === 'CTS_MAP' || dt === 'PARCEL') return 'CTS_MAP';
    if (dt === 'BMC_TAX' || dt === 'PTIN' || !!input.sacNo) return 'BMC_TAX';

    return '7_12';
  }

  /**
   * Deterministically generate human-readable tracking ticket ID
   */
  public generateTicketId(feature: LandFeatureType, state: string, input: CreateJobInput): string {
    const cleanState = (state || 'MH').toUpperCase();
    let token = '';

    if (input.surveyNo) {
      token = input.surveyNo.replace(/[^a-zA-Z0-9]/g, '-');
    } else if (input.sacNo) {
      token = input.sacNo.replace(/[^a-zA-Z0-9]/g, '-');
    } else if (input.ferfarNo) {
      token = `FER-${input.ferfarNo}`;
    } else if (input.deedNo) {
      token = `DEED-${input.deedNo}`;
    } else {
      token = `${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const cleanFeature = feature.replace('_', '');
    return `TK-${cleanState}-${cleanFeature}-${token}`.toUpperCase();
  }

  /**
   * Ingest and persist a new query job in SQLite FIFO queue
   */
  public enqueueJob(input: CreateJobInput): JobRecord {
    const jobId = `job_${uuidv4()}`;
    const feature = this.normalizeFeature(input);
    const state = (input.state || 'MH').toUpperCase();
    const ticketId = this.generateTicketId(feature, state, input);
    const now = new Date().toISOString();

    const initialSteps: JobStepLogEntry[] = [
      {
        stepIndex: 1,
        key: 'QUEUED',
        label: 'Job Queued',
        message: 'Job accepted and queued for worker execution',
        timestamp: now,
        status: 'completed'
      }
    ];

    const stmt = sqlite.prepare(`
      INSERT INTO query_jobs (
        id, ticket_id, feature, state, params, status, progress_percent,
        current_step_message, steps_log, is_degraded, data_provenance,
        retry_count, max_retries, simulation_failure, created_at, updated_at
      ) VALUES (
        @id, @ticket_id, @feature, @state, @params, @status, @progress_percent,
        @current_step_message, @steps_log, @is_degraded, @data_provenance,
        @retry_count, @max_retries, @simulation_failure, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: jobId,
      ticket_id: ticketId,
      feature,
      state,
      params: JSON.stringify(input),
      status: 'QUEUED',
      progress_percent: 5,
      current_step_message: 'Job accepted and queued for worker execution',
      steps_log: JSON.stringify(initialSteps),
      is_degraded: 0,
      data_provenance: 'LIVE_PORTAL',
      retry_count: 0,
      max_retries: 3,
      simulation_failure: input.simulationFailure || null,
      created_at: now,
      updated_at: now
    });

    const job = this.getJob(jobId)!;

    // Dispatch milestone event to bus
    jobEventBus.emitMilestone({
      jobId,
      ticketId,
      feature,
      state,
      status: 'QUEUED',
      percent: 5,
      milestone: {
        key: 'QUEUED',
        label: 'Job Queued',
        description: 'Job accepted and queued for worker execution',
        stepIndex: 1,
        totalSteps: 6,
        status: 'completed'
      },
      timestamp: now
    });

    jobEventBus.emit('job:enqueued', job);

    return job;
  }

  /**
   * Retrieve a job by ID
   */
  public getJob(jobId: string): JobRecord | null {
    const row = sqlite.prepare(`SELECT * FROM query_jobs WHERE id = ?`).get(jobId) as any;
    if (!row) return null;
    return this.mapRowToJobRecord(row);
  }

  /**
   * Retrieve a job by ticket ID
   */
  public getJobByTicket(ticketId: string): JobRecord | null {
    const row = sqlite.prepare(`SELECT * FROM query_jobs WHERE ticket_id = ?`).get(ticketId) as any;
    if (!row) return null;
    return this.mapRowToJobRecord(row);
  }

  /**
   * Atomically lease the next available job for a worker
   */
  public leaseNextJob(workerId: string, excludeIds: string[] = []): JobRecord | null {
    const leaseTransaction = sqlite.transaction(() => {
      let candidate: { id: string } | undefined;
      if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(',');
        candidate = sqlite.prepare(`
          SELECT id FROM query_jobs
          WHERE status = 'QUEUED' AND id NOT IN (${placeholders})
          ORDER BY created_at ASC
          LIMIT 1
        `).get(...excludeIds) as { id: string } | undefined;
      } else {
        candidate = sqlite.prepare(`
          SELECT id FROM query_jobs
          WHERE status = 'QUEUED'
          ORDER BY created_at ASC
          LIMIT 1
        `).get() as { id: string } | undefined;
      }

      if (!candidate) return null;

      const now = new Date().toISOString();
      const updated = sqlite.prepare(`
        UPDATE query_jobs
        SET status = 'ASSIGNED',
            worker_id = ?,
            progress_percent = 15,
            current_step_message = 'Worker assigned, initializing portal connection',
            updated_at = ?
        WHERE id = ? AND status = 'QUEUED'
      `).run(workerId, now, candidate.id);

      if (updated.changes === 0) return null;

      return candidate.id;
    });

    let leasedId: string | null = null;
    let attempts = 0;
    while (attempts < 5) {
      try {
        leasedId = leaseTransaction.immediate();
        break;
      } catch (err: any) {
        attempts++;
        if (err && (err.code === 'SQLITE_BUSY' || err.message?.includes('database is locked')) && attempts < 5) {
          const waitTill = Date.now() + 50 * attempts;
          while (Date.now() < waitTill) {}
          continue;
        }
        throw err;
      }
    }

    if (!leasedId) return null;

    const job = this.getJob(leasedId)!;

    // Append ASSIGNED step to step log
    this.appendStepLog(leasedId, {
      stepIndex: 2,
      key: 'ASSIGNED',
      label: 'Worker Assigned',
      message: `Worker ${workerId} assigned, initializing portal session`,
      timestamp: new Date().toISOString(),
      status: 'in_progress'
    });

    jobEventBus.emitMilestone({
      jobId: job.id,
      ticketId: job.ticketId,
      feature: job.feature,
      state: job.state,
      status: 'ASSIGNED',
      percent: 15,
      milestone: {
        key: 'ASSIGNED',
        label: 'Worker Assigned',
        description: `Worker ${workerId} assigned, initializing portal session`,
        stepIndex: 2,
        totalSteps: 6,
        status: 'in_progress'
      },
      timestamp: new Date().toISOString()
    });

    return this.getJob(leasedId);
  }

  /**
   * Update intermediate job progress & step log
   */
  public updateProgress(
    jobId: string,
    status: JobStatus,
    percent: number,
    message: string,
    stepIndex: number,
    stepLabel: string
  ): void {
    const now = new Date().toISOString();
    sqlite.prepare(`
      UPDATE query_jobs
      SET status = ?,
          progress_percent = ?,
          current_step_message = ?,
          updated_at = ?
      WHERE id = ?
    `).run(status, percent, message, now, jobId);

    const logEntry: JobStepLogEntry = {
      stepIndex,
      key: status,
      label: stepLabel,
      message,
      timestamp: now,
      status: 'in_progress'
    };
    this.appendStepLog(jobId, logEntry);

    const job = this.getJob(jobId);
    if (job) {
      jobEventBus.emitMilestone({
        jobId: job.id,
        ticketId: job.ticketId,
        feature: job.feature,
        state: job.state,
        status,
        percent,
        milestone: {
          key: status,
          label: stepLabel,
          description: message,
          stepIndex,
          totalSteps: 6,
          status: 'in_progress'
        },
        timestamp: now
      });
    }
  }

  /**
   * Mark job as cleanly COMPLETED
   */
  public markCompleted(jobId: string, recordId: string, resultPayload: any): void {
    const now = new Date().toISOString();
    const provenance = resultPayload?.dataProvenance || 'LIVE_PORTAL';
    const isLive = resultPayload?.isLive !== undefined ? resultPayload.isLive : (provenance === 'LIVE_PORTAL');
    const isDegraded = resultPayload?.isDegraded ? 1 : 0;

    sqlite.prepare(`
      UPDATE query_jobs
      SET status = 'COMPLETED',
          progress_percent = 100,
          current_step_message = 'Land record verified, cryptographically sealed, and ready for download',
          result_record_id = ?,
          result_payload = ?,
          is_degraded = ?,
          data_provenance = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(recordId, JSON.stringify(resultPayload), isDegraded, provenance, now, now, jobId);

    this.appendStepLog(jobId, {
      stepIndex: 6,
      key: 'COMPLETED',
      label: 'Record Extracted & Verified',
      message: 'Record verified, cryptographically sealed, and ready for download',
      timestamp: now,
      status: 'completed'
    });

    const job = this.getJob(jobId);
    if (job) {
      jobEventBus.emitCompleted({
        jobId: job.id,
        ticketId: job.ticketId,
        feature: job.feature,
        state: job.state,
        status: 'completed',
        percent: 100,
        recordId,
        downloadUrl: `/api/records/${recordId}/download`,
        isLive,
        isDegraded: false,
        dataProvenance: provenance as any,
        timestamp: now,
        resultPayload
      });
    }
  }

  /**
   * Mark job as gracefully degraded to verified cache or synthetic emulator
   */
  public markDegraded(
    jobId: string,
    recordId: string,
    reason: string,
    diagnosticNoticeOrPayload: any,
    maybePayload?: any,
    upstreamHttpStatus?: number,
    customProvenance?: string
  ): void {
    let diagnosticNotice: string;
    let resultPayload: any;

    if (typeof diagnosticNoticeOrPayload === 'object' && diagnosticNoticeOrPayload !== null) {
      resultPayload = diagnosticNoticeOrPayload;
      diagnosticNotice = resultPayload.diagnosticNotice || resultPayload.degradationNotice || reason;
    } else {
      diagnosticNotice = typeof diagnosticNoticeOrPayload === 'string' ? diagnosticNoticeOrPayload : reason;
      resultPayload = maybePayload || {};
    }

    const provenance = customProvenance || resultPayload?.dataProvenance || 'VERIFIED_PRESEEDED_CACHE';

    const now = new Date().toISOString();
    sqlite.prepare(`
      UPDATE query_jobs
      SET status = 'DEGRADED_FALLBACK',
          progress_percent = 100,
          current_step_message = ?,
          result_record_id = ?,
          result_payload = ?,
          is_degraded = 1,
          degradation_reason = ?,
          data_provenance = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(diagnosticNotice, recordId, JSON.stringify(resultPayload), reason, provenance, now, now, jobId);

    this.appendStepLog(jobId, {
      stepIndex: 6,
      key: 'DEGRADED_FALLBACK',
      label: 'Truth-Serum Degradation Fallback',
      message: diagnosticNotice,
      timestamp: now,
      status: 'degraded'
    });

    const job = this.getJob(jobId);
    if (job) {
      jobEventBus.emitDegraded({
        jobId: job.id,
        ticketId: job.ticketId,
        feature: job.feature,
        state: job.state,
        status: 'degraded_fallback',
        percent: 100,
        recordId,
        downloadUrl: `/api/records/${recordId}/download`,
        isLive: false,
        isDegraded: true,
        dataProvenance: provenance as any,
        degradationReason: reason,
        diagnosticNotice,
        upstreamHttpStatus,
        timestamp: now,
        resultPayload
      });
    }
  }

  /**
   * Route unrecoverable job failure to Dead-Letter Queue (DLQ)
   */
  public routeToDlq(
    jobId: string,
    failureReason: string,
    errorDetails: string,
    stackTraceOrStatus?: string | number,
    diagnosticPayload?: any,
    lastHttpStatus?: number,
    attemptCount?: number
  ): void {
    const job = this.getJob(jobId);
    if (!job) return;

    let stackTrace: string | undefined;
    let effectiveStatus: number | undefined = lastHttpStatus;

    if (typeof stackTraceOrStatus === 'number') {
      effectiveStatus = stackTraceOrStatus;
      stackTrace = undefined;
    } else {
      stackTrace = stackTraceOrStatus;
    }

    const dlqId = `dlq_${uuidv4()}`;
    const now = new Date().toISOString();
    const finalAttempts = attemptCount !== undefined ? attemptCount : Math.max(3, job.retryCount + 1);

    const insertDlq = sqlite.prepare(`
      INSERT INTO query_job_dlq (
        id, job_id, ticket_id, feature, state, params, failure_reason,
        error_details, stack_trace, attempt_count, last_http_status,
        diagnostic_payload, failed_at
      ) VALUES (
        @id, @job_id, @ticket_id, @feature, @state, @params, @failure_reason,
        @error_details, @stack_trace, @attempt_count, @last_http_status,
        @diagnostic_payload, @failed_at
      )
    `);

    insertDlq.run({
      id: dlqId,
      job_id: job.id,
      ticket_id: job.ticketId,
      feature: job.feature,
      state: job.state,
      params: JSON.stringify(job.params),
      failure_reason: failureReason,
      error_details: errorDetails,
      stack_trace: stackTrace || null,
      attempt_count: finalAttempts,
      last_http_status: effectiveStatus || null,
      diagnostic_payload: diagnosticPayload ? JSON.stringify(diagnosticPayload) : null,
      failed_at: now
    });

    // Mark job status as FAILED
    sqlite.prepare(`
      UPDATE query_jobs
      SET status = 'FAILED',
          progress_percent = 100,
          current_step_message = ?,
          error_code = ?,
          error_details = ?,
          retry_count = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      `Job failed unrecoverably: ${failureReason}. Routed to Dead-Letter Queue.`,
      failureReason,
      errorDetails,
      finalAttempts,
      now,
      now,
      job.id
    );

    this.appendStepLog(job.id, {
      stepIndex: 6,
      key: 'FAILED',
      label: 'Job Execution Failed',
      message: `Routed to DLQ: ${failureReason}`,
      timestamp: now,
      status: 'failed'
    });

    jobEventBus.emitFailed({
      jobId: job.id,
      ticketId: job.ticketId,
      feature: job.feature,
      state: job.state,
      status: 'failed',
      percent: 100,
      errorCode: failureReason,
      errorDetails,
      attemptCount: job.retryCount + 1,
      dlqRouted: true,
      timestamp: now
    });
  }

  /**
   * Retrieve all DLQ records
   */
  public getDlqRecords(limit = 50): DlqRecord[] {
    const rows = sqlite.prepare(`
      SELECT * FROM query_job_dlq
      ORDER BY failed_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      ticketId: row.ticket_id,
      feature: row.feature,
      state: row.state,
      params: this.safeJsonParse(row.params, {}),
      failureReason: row.failure_reason,
      errorDetails: row.error_details,
      stackTrace: row.stack_trace,
      attemptCount: row.attempt_count,
      lastHttpStatus: row.last_http_status,
      diagnosticPayload: this.safeJsonParse(row.diagnostic_payload, null),
      failedAt: row.failed_at
    }));
  }

  /**
   * Append a step log entry
   */
  private appendStepLog(jobId: string, entry: JobStepLogEntry): void {
    const row = sqlite.prepare(`SELECT steps_log FROM query_jobs WHERE id = ?`).get(jobId) as any;
    if (!row) return;

    const logs: JobStepLogEntry[] = this.safeJsonParse(row.steps_log, []);
    logs.push(entry);

    sqlite.prepare(`
      UPDATE query_jobs
      SET steps_log = ?
      WHERE id = ?
    `).run(JSON.stringify(logs), jobId);
  }

  /**
   * Map database row to typed JobRecord
   */
  private mapRowToJobRecord(row: any): JobRecord {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      feature: row.feature,
      state: row.state,
      params: this.safeJsonParse(row.params, {}),
      status: row.status as JobStatus,
      progressPercent: row.progress_percent,
      currentStepMessage: row.current_step_message,
      stepsLog: this.safeJsonParse(row.steps_log, []),
      resultRecordId: row.result_record_id,
      resultPayload: this.safeJsonParse(row.result_payload, null),
      errorCode: row.error_code,
      errorDetails: row.error_details,
      isDegraded: Boolean(row.is_degraded),
      degradationReason: row.degradation_reason,
      dataProvenance: row.data_provenance || 'LIVE_PORTAL',
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      simulationFailure: row.simulation_failure,
      workerId: row.worker_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }

  private safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
    if (!val || typeof val !== 'string') return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
}

export const jobQueue = JobQueue.getInstance();
