import { EventEmitter } from 'events';
import { JobStatus, LandFeatureType } from '../db/jobsSchema';

export interface MilestoneInfo {
  key: JobStatus;
  label: string;
  description: string;
  stepIndex: number;
  totalSteps: number;
  status: 'pending' | 'in_progress' | 'completed' | 'degraded' | 'failed';
}

export interface JobMilestoneEventPayload {
  jobId: string;
  ticketId: string;
  feature: LandFeatureType;
  state: string;
  status: JobStatus;
  percent: number;
  milestone: MilestoneInfo;
  timestamp: string;
}

export interface JobCompletedEventPayload {
  jobId: string;
  ticketId: string;
  feature: LandFeatureType;
  state: string;
  status: 'completed';
  percent: 100;
  recordId: string;
  downloadUrl: string;
  isLive: boolean;
  isDegraded: false;
  dataProvenance: 'LIVE_PORTAL' | 'VERIFIED_PRESEEDED_CACHE' | 'REGIONAL_EMULATOR_SYNTHETIC';
  timestamp: string;
  resultPayload?: any;
}

export interface JobDegradedEventPayload {
  jobId: string;
  ticketId: string;
  feature: LandFeatureType;
  state: string;
  status: 'degraded_fallback' | 'degraded';
  percent: 100;
  recordId: string;
  downloadUrl: string;
  isLive: false;
  isDegraded: true;
  dataProvenance: 'VERIFIED_PRESEEDED_CACHE' | 'REGIONAL_EMULATOR_SYNTHETIC';
  degradationReason: string;
  diagnosticNotice: string;
  upstreamHttpStatus?: number;
  timestamp: string;
  resultPayload?: any;
}

export interface JobFailedEventPayload {
  jobId: string;
  ticketId: string;
  feature: LandFeatureType;
  state: string;
  status: 'failed';
  percent: number;
  errorCode: string;
  errorDetails: string;
  attemptCount: number;
  dlqRouted: boolean;
  timestamp: string;
}

export interface JobEventMap {
  'job:queued': (payload: JobMilestoneEventPayload) => void;
  'job:assigned': (payload: JobMilestoneEventPayload) => void;
  'job:milestone': (payload: JobMilestoneEventPayload) => void;
  'job:progress': (payload: JobMilestoneEventPayload) => void;
  'job:completed': (payload: JobCompletedEventPayload) => void;
  'job:degraded': (payload: JobDegradedEventPayload) => void;
  'job:failed': (payload: JobFailedEventPayload) => void;
}

export class JobEventBus extends EventEmitter {
  private static instance: JobEventBus;

  private constructor() {
    super();
    // Allow unlimited listeners for SSE clients
    this.setMaxListeners(100);
  }

  public static getInstance(): JobEventBus {
    if (!JobEventBus.instance) {
      JobEventBus.instance = new JobEventBus();
    }
    return JobEventBus.instance;
  }

  public emitMilestone(payload: JobMilestoneEventPayload): boolean {
    this.emit(`job:${payload.jobId}:milestone`, payload);
    this.emit(`job:${payload.jobId}:progress`, payload);
    this.emit('job:milestone', payload);
    return this.emit('job:progress', payload);
  }

  public emitCompleted(payload: JobCompletedEventPayload): boolean {
    this.emit(`job:${payload.jobId}:completed`, payload);
    return this.emit('job:completed', payload);
  }

  public emitDegraded(payload: JobDegradedEventPayload): boolean {
    this.emit(`job:${payload.jobId}:degradation`, payload);
    this.emit(`job:${payload.jobId}:degraded`, payload);
    return this.emit('job:degraded', payload);
  }

  public emitFailed(payload: JobFailedEventPayload): boolean {
    this.emit(`job:${payload.jobId}:failed`, payload);
    return this.emit('job:failed', payload);
  }
}

export const jobEventBus = JobEventBus.getInstance();
