import { sqlite } from './index';
import { AuthDomainEvent, AuthEventType, EventOutcome } from '../events/types';
import { sanitizePayload } from '../events/sanitizer';

export interface AuthEventFilter {
  userId?: string;
  eventType?: AuthEventType | string;
  outcome?: EventOutcome | string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export interface AuthEventsQueryResult {
  events: AuthDomainEvent[];
  total: number;
}

/**
 * Persists an authentication domain event into the SQLite auth_events audit store.
 * Automatically ensures payload is sanitized before persistence.
 */
export function saveAuthEvent(event: AuthDomainEvent): void {
  const stmt = sqlite.prepare(`
    INSERT INTO auth_events (
      event_id, event_type, user_id, timestamp, outcome, payload, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sanitizedPayload = sanitizePayload(event.payload);

  stmt.run(
    event.eventId,
    event.eventType,
    event.userId || null,
    event.timestamp,
    event.outcome,
    typeof sanitizedPayload === 'string' ? sanitizedPayload : JSON.stringify(sanitizedPayload),
    typeof event.metadata === 'string' ? event.metadata : JSON.stringify(event.metadata || {}),
    new Date().toISOString()
  );
}

/**
 * Query persisted auth events with filtering, pagination, and total count.
 */
export function queryAuthEvents(filter: AuthEventFilter = {}): AuthEventsQueryResult {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.userId) {
    conditions.push('user_id = ?');
    params.push(filter.userId);
  }
  if (filter.eventType) {
    conditions.push('event_type = ?');
    params.push(filter.eventType);
  }
  if (filter.outcome) {
    conditions.push('outcome = ?');
    params.push(filter.outcome);
  }
  if (filter.since) {
    conditions.push('timestamp >= ?');
    params.push(filter.since);
  }
  if (filter.until) {
    conditions.push('timestamp <= ?');
    params.push(filter.until);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM auth_events ${whereClause}`).get(...params) as { count: number };
  const total = countRow ? countRow.count : 0;

  const limit = Math.min(filter.limit || 50, 200);
  const offset = filter.offset || 0;

  const rows = sqlite.prepare(`
    SELECT event_id, event_type, user_id, timestamp, outcome, payload, metadata, created_at
    FROM auth_events
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const events: AuthDomainEvent[] = rows.map((r) => {
    let payload = {};
    let metadata = {};
    try {
      payload = JSON.parse(r.payload);
    } catch {
      payload = { raw: r.payload };
    }
    try {
      metadata = JSON.parse(r.metadata);
    } catch {
      metadata = { raw: r.metadata };
    }

    return {
      eventId: r.event_id,
      eventType: r.event_type as AuthEventType,
      userId: r.user_id,
      timestamp: r.timestamp,
      outcome: r.outcome as EventOutcome,
      payload,
      metadata,
    } as unknown as AuthDomainEvent;
  });

  return { events, total };
}

/**
 * Fetch a single auth event by its unique event ID.
 */
export function getAuthEventById(eventId: string): AuthDomainEvent | null {
  const row = sqlite.prepare(`
    SELECT event_id, event_type, user_id, timestamp, outcome, payload, metadata
    FROM auth_events
    WHERE event_id = ?
  `).get(eventId) as any;

  if (!row) return null;

  return {
    eventId: row.event_id,
    eventType: row.event_type as AuthEventType,
    userId: row.user_id,
    timestamp: row.timestamp,
    outcome: row.outcome as EventOutcome,
    payload: JSON.parse(row.payload),
    metadata: JSON.parse(row.metadata),
  } as unknown as AuthDomainEvent;
}

