import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { Database as DatabaseType } from 'better-sqlite3';

export type JobStatus =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'PORTAL_NAVIGATING'
  | 'SOLVING_CHALLENGE'
  | 'EXTRACTING_RECORD'
  | 'ANCHORING_BLOCKCHAIN'
  | 'COMPLETED'
  | 'DEGRADED_FALLBACK'
  | 'FAILED';

export type LandFeatureType =
  | '7_12'
  | 'MUTATION'
  | 'INDEX_2'
  | 'AAPLI_CHAWADI'
  | 'CTS_MAP'
  | 'BMC_TAX'
  | string;

export interface JobStepLogEntry {
  stepIndex: number;
  key: string;
  label: string;
  message: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'degraded' | 'failed';
}

/**
 * Drizzle ORM Schema: query_jobs
 */
export const queryJobs = sqliteTable(
  'query_jobs',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id'),
    feature: text('feature').notNull(),
    state: text('state').notNull(),
    params: text('params').notNull(),
    status: text('status').default('QUEUED').notNull(),
    progressPercent: integer('progress_percent').default(0).notNull(),
    currentStepMessage: text('current_step_message').default('Job accepted and queued for worker execution').notNull(),
    stepsLog: text('steps_log').default('[]').notNull(),
    resultRecordId: text('result_record_id'),
    resultPayload: text('result_payload'),
    errorCode: text('error_code'),
    errorDetails: text('error_details'),
    isDegraded: integer('is_degraded').default(0).notNull(),
    degradationReason: text('degradation_reason'),
    dataProvenance: text('data_provenance').default('LIVE_PORTAL').notNull(),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    simulationFailure: text('simulation_failure'),
    workerId: text('worker_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at')
  },
  (table) => [
    index('idx_query_jobs_status').on(table.status),
    index('idx_query_jobs_ticket').on(table.ticketId),
    index('idx_query_jobs_feature').on(table.feature),
    index('idx_query_jobs_created').on(table.createdAt)
  ]
);

/**
 * Drizzle ORM Schema: query_job_dlq
 */
export const queryJobDlq = sqliteTable(
  'query_job_dlq',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull(),
    ticketId: text('ticket_id'),
    feature: text('feature').notNull(),
    state: text('state').notNull(),
    params: text('params').notNull(),
    failureReason: text('failure_reason').notNull(),
    errorDetails: text('error_details'),
    stackTrace: text('stack_trace'),
    attemptCount: integer('attempt_count').notNull(),
    lastHttpStatus: integer('last_http_status'),
    diagnosticPayload: text('diagnostic_payload'),
    failedAt: text('failed_at').notNull()
  },
  (table) => [
    index('idx_dlq_job_id').on(table.jobId),
    index('idx_dlq_failed_at').on(table.failedAt)
  ]
);

/**
 * Raw SQLite DDL Execution Helper
 */
export function ensureJobsSchema(sqlite: DatabaseType): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS query_jobs (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      feature TEXT NOT NULL,
      state TEXT NOT NULL,
      params TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      current_step_message TEXT NOT NULL DEFAULT 'Job accepted and queued for worker execution',
      steps_log TEXT NOT NULL DEFAULT '[]',
      result_record_id TEXT REFERENCES records(id),
      result_payload TEXT,
      error_code TEXT,
      error_details TEXT,
      is_degraded INTEGER NOT NULL DEFAULT 0,
      degradation_reason TEXT,
      data_provenance TEXT NOT NULL DEFAULT 'LIVE_PORTAL',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      simulation_failure TEXT,
      worker_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_query_jobs_status ON query_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_query_jobs_ticket ON query_jobs(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_query_jobs_feature ON query_jobs(feature);
    CREATE INDEX IF NOT EXISTS idx_query_jobs_created ON query_jobs(created_at);

    CREATE TABLE IF NOT EXISTS query_job_dlq (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      ticket_id TEXT,
      feature TEXT NOT NULL,
      state TEXT NOT NULL,
      params TEXT NOT NULL,
      failure_reason TEXT NOT NULL,
      error_details TEXT,
      stack_trace TEXT,
      attempt_count INTEGER NOT NULL,
      last_http_status INTEGER,
      diagnostic_payload TEXT,
      failed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dlq_job_id ON query_job_dlq(job_id);
    CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON query_job_dlq(failed_at);
  `);
}
