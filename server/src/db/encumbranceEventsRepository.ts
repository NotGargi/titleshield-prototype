import { sqlite } from './index';
import { EncumbranceAuditEvent, NewEncumbranceAuditEvent } from './schema';

export class EncumbranceEventsRepository {
  private static instance: EncumbranceEventsRepository;

  public static getInstance(): EncumbranceEventsRepository {
    if (!EncumbranceEventsRepository.instance) {
      EncumbranceEventsRepository.instance = new EncumbranceEventsRepository();
    }
    return EncumbranceEventsRepository.instance;
  }

  public insert(event: NewEncumbranceAuditEvent): EncumbranceAuditEvent {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO encumbrance_audit_events (
        event_id, event_type, aggregate_id, property_id, survey_number, state,
        district, village, timestamp, outcome, payload, version, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.eventId,
      event.eventType,
      event.aggregateId,
      event.propertyId || null,
      event.surveyNumber || null,
      event.state.toUpperCase(),
      event.district || null,
      event.village || null,
      event.timestamp || now,
      event.outcome,
      typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
      event.version || 1,
      typeof event.metadata === 'string' ? event.metadata : JSON.stringify(event.metadata),
      event.createdAt || now
    );

    return this.findById(event.eventId)!;
  }

  public findById(eventId: string): EncumbranceAuditEvent | null {
    const row = sqlite.prepare(`SELECT * FROM encumbrance_audit_events WHERE event_id = ?`).get(eventId) as any;
    return row ? this.mapRow(row) : null;
  }

  public findByAggregateId(aggregateId: string): EncumbranceAuditEvent[] {
    const rows = sqlite.prepare(`
      SELECT * FROM encumbrance_audit_events 
      WHERE aggregate_id = ? 
      ORDER BY timestamp DESC
    `).all(aggregateId) as any[];
    return rows.map(this.mapRow);
  }

  public findRecent(limit: number = 50): EncumbranceAuditEvent[] {
    const rows = sqlite.prepare(`
      SELECT * FROM encumbrance_audit_events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(Math.min(limit, 100)) as any[];
    return rows.map(this.mapRow);
  }

  public count(): number {
    const row = sqlite.prepare(`SELECT count(*) as count FROM encumbrance_audit_events`).get() as { count: number };
    return row ? row.count : 0;
  }

  private mapRow(row: any): EncumbranceAuditEvent {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      propertyId: row.property_id,
      surveyNumber: row.survey_number,
      state: row.state,
      district: row.district,
      village: row.village,
      timestamp: row.timestamp,
      outcome: row.outcome,
      payload: row.payload,
      version: row.version,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }
}
