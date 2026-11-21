import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../constants/api';

export interface MilestoneStep {
  key: string;
  label: string;
  description: string;
  stepIndex: number;
  totalSteps: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'degraded';
  timestamp?: string;
}

export type DataProvenance = 'LIVE_PORTAL' | 'VERIFIED_PRESEEDED_CACHE' | 'REGIONAL_EMULATOR_SYNTHETIC';

export interface UseJobStreamState {
  jobId: string | null;
  ticketId: string | null;
  status: string;
  percent: number;
  milestones: MilestoneStep[];
  currentStepMessage: string;
  isDegraded: boolean;
  degradationReason: string | null;
  degradationNotice: string | null;
  dataProvenance: DataProvenance | null;
  isLive: boolean;
  serverTimestamp: string | null;
  recordId: string | null;
  error: string | null;
  isStreaming: boolean;
  transport: 'sse' | 'polling' | 'none';
  startStream: (jobId: string, ticketId?: string, initialStreamUrl?: string) => void;
  reset: () => void;
}

const DEFAULT_MILESTONES: Array<{ key: string; label: string; defaultDescription: string }> = [
  { key: 'queued', label: 'Query Enqueued', defaultDescription: 'Ticket ID generated; queued in asynchronous worker pool' },
  { key: 'worker_assigned', label: 'Worker Assigned', defaultDescription: 'Cloud browser worker allocated and initialized' },
  { key: 'navigating_portal', label: 'Navigating Portal', defaultDescription: 'Connecting to official state revenue portal' },
  { key: 'solving_challenge', label: 'Solving Challenge', defaultDescription: 'Bypassing session security and anti-bot verification' },
  { key: 'record_extracted', label: 'Record Extracted', defaultDescription: 'Extracting land rights, mutation entries & civic ledger' },
  { key: 'completed', label: 'Certified & Anchored', defaultDescription: 'Cryptographically anchored on Polygon blockchain' }
];

function createInitialMilestones(): MilestoneStep[] {
  return DEFAULT_MILESTONES.map((m, idx) => ({
    key: m.key,
    label: m.label,
    description: m.defaultDescription,
    stepIndex: idx + 1,
    totalSteps: DEFAULT_MILESTONES.length,
    status: idx === 0 ? 'in_progress' : 'pending'
  }));
}

/**
 * Maps a job status string to milestone states and progress percentage
 */
function updateMilestonesFromStatus(
  prevMilestones: MilestoneStep[],
  status: string,
  percent: number,
  stepMessage?: string,
  provenance?: DataProvenance | null
): MilestoneStep[] {
  const normStatus = (status || '').toLowerCase();
  const next = prevMilestones.map((step) => ({ ...step }));

  // On degraded fallback: do not mark unreached/skipped steps (e.g. solving_challenge or record_extracted) as green completed
  if (normStatus.includes('degrad')) {
    for (let i = 0; i < next.length; i++) {
      if (i === 5) {
        next[i].status = 'degraded';
        if (provenance === 'REGIONAL_EMULATOR_SYNTHETIC') {
          next[i].label = 'Synthetic Emulator Resolved';
        } else {
          next[i].label = 'Verified Benchmark Loaded';
        }
        if (stepMessage) next[i].description = stepMessage;
      } else {
        // Enforce Section 63 BSA truth: only preserve steps that were already genuinely completed
        if (next[i].status !== 'completed') {
          // If step 0 was in_progress when fallback hit, mark queued as completed (since job was queued)
          if (i === 0) {
            next[i].status = 'completed';
          } else {
            next[i].status = 'pending';
          }
        }
      }
    }
    return next;
  }

  let activeIndex = 0;
  if (normStatus.includes('queued')) activeIndex = 0;
  else if (normStatus.includes('assigned')) activeIndex = 1;
  else if (normStatus.includes('navigat')) activeIndex = 2;
  else if (normStatus.includes('challenge') || normStatus.includes('solving')) activeIndex = 3;
  else if (normStatus.includes('extract')) activeIndex = 4;
  else if (normStatus.includes('anchor') || normStatus.includes('blockchain') || normStatus.includes('complet')) activeIndex = 5;

  for (let i = 0; i < next.length; i++) {
    if (normStatus.includes('fail') && i === activeIndex) {
      next[i].status = 'failed';
      if (stepMessage) next[i].description = stepMessage;
    } else if (i < activeIndex) {
      next[i].status = 'completed';
    } else if (i === activeIndex) {
      if (normStatus.includes('complet')) {
        next[i].status = 'completed';
        next[i].label = 'Certified & Anchored';
      } else {
        next[i].status = 'in_progress';
        if (stepMessage) next[i].description = stepMessage;
      }
    } else {
      next[i].status = 'pending';
    }
  }

  return next;
}

/**
 * Custom React hook for real-time land record query job streaming.
 * Dual-transport: Native EventSource (SSE) primary + adaptive polling (1.5s) fallback.
 * Zero external npm dependencies.
 */
export function useJobStream(): UseJobStreamState {
  const [jobId, setJobId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [percent, setPercent] = useState<number>(0);
  const [milestones, setMilestones] = useState<MilestoneStep[]>(createInitialMilestones());
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [degradationReason, setDegradationReason] = useState<string | null>(null);
  const [degradationNotice, setDegradationNotice] = useState<string | null>(null);
  const [dataProvenance, setDataProvenance] = useState<DataProvenance | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [serverTimestamp, setServerTimestamp] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [transport, setTransport] = useState<'sse' | 'polling' | 'none'>('none');

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<any>(null);
  const fallbackTimeoutRef = useRef<any>(null);
  const hasReceivedEventsRef = useRef<boolean>(false);
  const isTerminatedRef = useRef<boolean>(false);

  // Clean up all active listeners, SSE connections, and timers
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      eventSourceRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    isTerminatedRef.current = false;
    hasReceivedEventsRef.current = false;
    setJobId(null);
    setTicketId(null);
    setStatus('idle');
    setPercent(0);
    setMilestones(createInitialMilestones());
    setCurrentStepMessage('');
    setIsDegraded(false);
    setDegradationReason(null);
    setDegradationNotice(null);
    setDataProvenance(null);
    setIsLive(false);
    setServerTimestamp(null);
    setRecordId(null);
    setError(null);
    setIsStreaming(false);
    setTransport('none');
  }, [cleanup]);

  // Adaptive Polling Fallback Implementation (1.5s interval)
  const startPolling = useCallback((activeJobId: string, currentTicket?: string) => {
    if (isTerminatedRef.current) return;
    if (pollingTimerRef.current) return; // Already polling

    setTransport('polling');

    const pollJob = async () => {
      if (isTerminatedRef.current) return;
      try {
        const response = await fetch(`${API_BASE_URL}/records/jobs/${encodeURIComponent(activeJobId)}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Job might not have propagated yet, keep polling
            return;
          }
          throw new Error(`Polling HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.success) return;

        const jobStatus = data.status || data.job?.status || 'QUEUED';
        const progressPct = data.progressPercent ?? data.job?.progressPercent ?? 0;
        const stepMsg = data.currentStepMessage || data.job?.currentStepMessage || '';
        const ticket = data.ticketId || data.ticket || currentTicket || '';
        const isDeg = Boolean(data.isDegraded || data.job?.isDegraded);
        const degReason = data.degradationReason || data.job?.degradationReason || null;
        const degNotice = degReason || stepMsg;
        const recId = data.recordId || data.result?.recordId || data.job?.resultRecordId;
        const prov: DataProvenance | null = data.dataProvenance || data.job?.dataProvenance || (isDeg ? 'VERIFIED_PRESEEDED_CACHE' : null);
        const live = typeof data.isLive === 'boolean' ? data.isLive : (typeof data.job?.isLive === 'boolean' ? data.job.isLive : (!isDeg && prov === 'LIVE_PORTAL'));
        const srvTime = data.timestamp || data.job?.updatedAt || data.job?.createdAt || null;

        if (ticket) setTicketId(ticket);
        setStatus(jobStatus);
        setPercent(progressPct);
        if (stepMsg) setCurrentStepMessage(stepMsg);
        if (prov) setDataProvenance(prov);
        setIsLive(Boolean(live));
        if (degReason) setDegradationReason(degReason);
        if (srvTime) setServerTimestamp(srvTime);

        setMilestones((prev) => updateMilestonesFromStatus(prev, jobStatus, progressPct, stepMsg, prov));

        if (jobStatus === 'COMPLETED') {
          isTerminatedRef.current = true;
          setPercent(100);
          setStatus('completed');
          setIsStreaming(false);
          if (recId) setRecordId(recId);
          cleanup();
        } else if (jobStatus === 'DEGRADED_FALLBACK') {
          isTerminatedRef.current = true;
          setPercent(100);
          setStatus('degraded_fallback');
          setIsDegraded(true);
          setDegradationNotice(degNotice);
          if (degReason) setDegradationReason(degReason);
          setIsStreaming(false);
          if (recId) setRecordId(recId);
          cleanup();
        } else if (jobStatus === 'FAILED') {
          isTerminatedRef.current = true;
          setStatus('failed');
          setError(data.errorDetails || data.errorCode || 'Job execution encountered an unrecoverable error');
          setIsStreaming(false);
          cleanup();
        }
      } catch (err: any) {
        console.warn('[useJobStream] Polling error:', err?.message || err);
      }
    };

    // Immediate first poll
    pollJob();
    pollingTimerRef.current = setInterval(pollJob, 1500);
  }, [cleanup]);

  // Main Stream Entrypoint: Primary EventSource + Polling Fallback
  const startStream = useCallback(
    (targetJobId: string, targetTicketId?: string, initialStreamUrl?: string) => {
      cleanup();
      isTerminatedRef.current = false;
      hasReceivedEventsRef.current = false;

      setJobId(targetJobId);
      if (targetTicketId) setTicketId(targetTicketId);
      setStatus('QUEUED');
      setPercent(10);
      setMilestones(createInitialMilestones());
      setCurrentStepMessage('Query accepted; connecting real-time streaming channel...');
      setIsDegraded(false);
      setDegradationReason(null);
      setDegradationNotice(null);
      setDataProvenance(null);
      setIsLive(false);
      setServerTimestamp(null);
      setRecordId(null);
      setError(null);
      setIsStreaming(true);

      // Determine stream URL
      let streamUrl = `${API_BASE_URL}/records/jobs/${encodeURIComponent(targetJobId)}/stream`;
      if (initialStreamUrl) {
        if (initialStreamUrl.startsWith('http://') || initialStreamUrl.startsWith('https://')) {
          streamUrl = initialStreamUrl;
        } else if (initialStreamUrl.startsWith('/')) {
          const baseOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
          streamUrl = `${baseOrigin}${initialStreamUrl}`;
        }
      }

      // Check if native EventSource is available in this environment
      const hasEventSource = typeof EventSource !== 'undefined';

      if (!hasEventSource) {
        // Direct polling fallback for environments without EventSource (e.g. bare React Native Hermes without polyfill)
        startPolling(targetJobId, targetTicketId);
        return;
      }

      setTransport('sse');

      try {
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        const handleProgressOrMilestone = (evt: MessageEvent) => {
          hasReceivedEventsRef.current = true;
          try {
            const data = JSON.parse(evt.data);
            if (data.ticketId) setTicketId(data.ticketId);
            if (data.status) setStatus(data.status);
            const p = data.percent ?? data.progressPct ?? 0;
            setPercent(p);
            const msg = data.milestone?.description || data.stepMessage || data.message || currentStepMessage;
            if (msg) setCurrentStepMessage(msg);
            if (data.dataProvenance) setDataProvenance(data.dataProvenance);
            if (typeof data.isLive === 'boolean') setIsLive(data.isLive);
            if (data.timestamp) setServerTimestamp(data.timestamp);

            setMilestones((prev) =>
              updateMilestonesFromStatus(prev, data.status || 'in_progress', p, msg, data.dataProvenance)
            );
          } catch (e) {
            console.warn('[useJobStream] Failed to parse progress event:', e);
          }
        };

        es.addEventListener('progress', handleProgressOrMilestone);
        es.addEventListener('milestone', handleProgressOrMilestone);

        es.addEventListener('completed', (evt: MessageEvent) => {
          hasReceivedEventsRef.current = true;
          isTerminatedRef.current = true;
          try {
            const data = JSON.parse(evt.data);
            if (data.ticketId) setTicketId(data.ticketId);
            setStatus('completed');
            setPercent(100);
            if (data.recordId) setRecordId(data.recordId);
            const prov: DataProvenance = data.dataProvenance || data.result?.dataProvenance || 'LIVE_PORTAL';
            setDataProvenance(prov);
            const live = Boolean(data.isLive !== false && prov === 'LIVE_PORTAL' && !data.isDegraded);
            setIsLive(live);
            setIsDegraded(Boolean(data.isDegraded));
            if (data.degradationReason) setDegradationReason(data.degradationReason);
            if (data.timestamp) setServerTimestamp(data.timestamp);
            setCurrentStepMessage(
              prov === 'LIVE_PORTAL'
                ? 'Document anchored on-chain and verified authentic live portal extract.'
                : 'Document verified authentic benchmark archive.'
            );
            setMilestones((prev) => updateMilestonesFromStatus(prev, 'completed', 100, undefined, prov));
            setIsStreaming(false);
          } catch (e) {
            setStatus('completed');
            setPercent(100);
            setIsStreaming(false);
          }
          cleanup();
        });

        es.addEventListener('degradation', (evt: MessageEvent) => {
          hasReceivedEventsRef.current = true;
          isTerminatedRef.current = true;
          try {
            const data = JSON.parse(evt.data);
            if (data.ticketId) setTicketId(data.ticketId);
            setStatus('degraded_fallback');
            setPercent(100);
            setIsDegraded(true);
            setIsLive(false);
            const prov: DataProvenance = data.dataProvenance || data.result?.dataProvenance || 'VERIFIED_PRESEEDED_CACHE';
            setDataProvenance(prov);
            const reason = data.degradationReason || data.reason || 'UPSTREAM_PORTAL_BARRIER';
            setDegradationReason(reason);
            const notice = data.diagnosticNotice || data.diagnosticMessage || data.reason || data.degradationReason || 'External portal barrier encountered; loaded verified offline benchmark.';
            setDegradationNotice(notice);
            if (data.timestamp) setServerTimestamp(data.timestamp);
            if (data.recordId) setRecordId(data.recordId);
            setCurrentStepMessage(`[Truth-Serum Notice] ${notice}`);
            setMilestones((prev) => updateMilestonesFromStatus(prev, 'degraded_fallback', 100, notice, prov));
            setIsStreaming(false);
          } catch (e) {
            setIsDegraded(true);
            setIsLive(false);
            setStatus('degraded_fallback');
            setPercent(100);
            setIsStreaming(false);
          }
          cleanup();
        });

        es.addEventListener('failed', (evt: MessageEvent) => {
          hasReceivedEventsRef.current = true;
          isTerminatedRef.current = true;
          try {
            const data = JSON.parse(evt.data);
            setStatus('failed');
            const errStr = data.errorDetails || data.errorCode || 'Job execution failed and routed to DLQ';
            setError(errStr);
            setCurrentStepMessage(`Failure: ${errStr}`);
            setMilestones((prev) => updateMilestonesFromStatus(prev, 'failed', percent, errStr));
            setIsStreaming(false);
          } catch (e) {
            setStatus('failed');
            setError('Job failed');
            setIsStreaming(false);
          }
          cleanup();
        });

        es.onmessage = (evt: MessageEvent) => {
          hasReceivedEventsRef.current = true;
          try {
            const data = JSON.parse(evt.data);
            if (data.ticketId) setTicketId(data.ticketId);
            if (data.dataProvenance) setDataProvenance(data.dataProvenance);
            if (typeof data.isLive === 'boolean') setIsLive(data.isLive);
            if (data.timestamp) setServerTimestamp(data.timestamp);
            if (data.status === 'COMPLETED' || data.status === 'completed') {
              setStatus('completed');
              setPercent(100);
              const prov: DataProvenance = data.dataProvenance || 'LIVE_PORTAL';
              setDataProvenance(prov);
              setIsLive(data.isLive !== false && prov === 'LIVE_PORTAL' && !data.isDegraded);
              if (data.recordId) setRecordId(data.recordId);
              setMilestones((prev) => updateMilestonesFromStatus(prev, 'completed', 100, undefined, prov));
              setIsStreaming(false);
              cleanup();
            } else if (data.status === 'DEGRADED_FALLBACK' || data.isDegraded) {
              setStatus('degraded_fallback');
              setPercent(100);
              setIsDegraded(true);
              setIsLive(false);
              const prov: DataProvenance = data.dataProvenance || 'VERIFIED_PRESEEDED_CACHE';
              setDataProvenance(prov);
              const reason = data.degradationReason || data.reason || 'UPSTREAM_PORTAL_BARRIER';
              setDegradationReason(reason);
              setDegradationNotice(data.degradationReason || data.diagnosticNotice || 'External barrier detected');
              if (data.recordId) setRecordId(data.recordId);
              setMilestones((prev) => updateMilestonesFromStatus(prev, 'degraded_fallback', 100, data.degradationReason, prov));
              setIsStreaming(false);
              cleanup();
            } else if (data.status === 'FAILED' || data.status === 'failed') {
              setStatus('failed');
              setError(data.errorDetails || 'Job failed');
              setIsStreaming(false);
              cleanup();
            }
          } catch (e) {
            // Ignore unparsed message
          }
        };

        es.onerror = () => {
          if (isTerminatedRef.current) return;
          console.warn('[useJobStream] EventSource connection dropped/failed; activating adaptive polling fallback...');
          cleanup();
          startPolling(targetJobId, targetTicketId);
        };

        // Fallback watchdog timer: If no events received within 3.5s, switch to adaptive polling
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!hasReceivedEventsRef.current && !isTerminatedRef.current) {
            console.warn('[useJobStream] EventSource timed out waiting for events; switching to polling fallback...');
            cleanup();
            startPolling(targetJobId, targetTicketId);
          }
        }, 3500);
      } catch (err: any) {
        console.warn('[useJobStream] EventSource initialization failed:', err);
        startPolling(targetJobId, targetTicketId);
      }
    },
    [cleanup, startPolling, currentStepMessage, percent]
  );

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    jobId,
    ticketId,
    status,
    percent,
    milestones,
    currentStepMessage,
    isDegraded,
    degradationReason,
    degradationNotice,
    dataProvenance,
    isLive,
    serverTimestamp,
    recordId,
    error,
    isStreaming,
    transport,
    startStream,
    reset
  };
}
