import { v4 as uuidv4 } from 'uuid';
import {
  EncumbranceDomainEvent,
  EncumbranceEventType,
  EncumbranceOutcome,
  CersaiSearchInitiatedPayload,
  CersaiChargeIdentifiedPayload,
  CersaiChargeSatisfiedPayload,
  CourtCaseQueriedPayload,
  LisPendensInjunctionDetectedPayload,
  TitleEncumbranceAggregatedPayload
} from './encumbranceEvents';
import { EncumbranceEventsRepository } from '../db/encumbranceEventsRepository';

export type EncumbranceEventHandler = (event: EncumbranceDomainEvent) => void | Promise<void>;

export class EncumbranceEventDispatcher {
  private static instance: EncumbranceEventDispatcher;
  private handlers: Map<EncumbranceEventType, EncumbranceEventHandler[]> = new Map();
  private globalHandlers: EncumbranceEventHandler[] = [];
  private repo: EncumbranceEventsRepository;

  private constructor() {
    this.repo = EncumbranceEventsRepository.getInstance();

    // Default internal subscriber: Audit logger
    this.subscribeAll((event) => {
      try {
        this.repo.insert({
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          propertyId: event.propertyId,
          surveyNumber: event.surveyNumber,
          state: event.state,
          district: event.district,
          village: event.village,
          timestamp: event.timestamp,
          outcome: event.outcome,
          payload: typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
          version: event.version || 1,
          metadata: typeof event.metadata === 'string' ? event.metadata : JSON.stringify(event.metadata || {}),
          createdAt: event.timestamp
        });
      } catch (err: any) {
        console.error('[EncumbranceEventBus] Error persisting audit event to SQLite:', err?.message);
      }
    });
  }

  public static getInstance(): EncumbranceEventDispatcher {
    if (!EncumbranceEventDispatcher.instance) {
      EncumbranceEventDispatcher.instance = new EncumbranceEventDispatcher();
    }
    return EncumbranceEventDispatcher.instance;
  }

  public on(type: EncumbranceEventType, handler: EncumbranceEventHandler): () => void {
    const list = this.handlers.get(type) || [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  public subscribeAll(handler: EncumbranceEventHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const idx = this.globalHandlers.indexOf(handler);
      if (idx !== -1) this.globalHandlers.splice(idx, 1);
    };
  }

  public async dispatch<T>(event: EncumbranceDomainEvent<T>): Promise<void> {
    // Notify specific type handlers
    const typeHandlers = this.handlers.get(event.eventType) || [];
    for (const h of typeHandlers) {
      try {
        await Promise.resolve(h(event));
      } catch (err) {
        console.error(`[EncumbranceEventBus] Handler error for ${event.eventType}:`, err);
      }
    }

    // Notify global handlers (including persistence)
    for (const gh of this.globalHandlers) {
      try {
        await Promise.resolve(gh(event));
      } catch (err) {
        console.error(`[EncumbranceEventBus] Global handler error for ${event.eventType}:`, err);
      }
    }
  }

  // --- Convenience Helpers ---

  public async emitSearchInitiated(
    aggregateId: string,
    state: string,
    payload: CersaiSearchInitiatedPayload,
    district?: string,
    village?: string
  ): Promise<EncumbranceDomainEvent> {
    const event: EncumbranceDomainEvent<CersaiSearchInitiatedPayload> = {
      eventId: `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      eventType: 'CersaiSearchInitiated',
      aggregateId,
      surveyNumber: aggregateId,
      state,
      district,
      village,
      timestamp: new Date().toISOString(),
      outcome: 'CLEAN',
      payload,
      version: 1,
      metadata: { source: 'DiligenceEngine' }
    };
    await this.dispatch(event);
    return event;
  }

  public async emitChargeIdentified(
    aggregateId: string,
    state: string,
    payload: CersaiChargeIdentifiedPayload,
    district?: string,
    village?: string
  ): Promise<EncumbranceDomainEvent> {
    const event: EncumbranceDomainEvent<CersaiChargeIdentifiedPayload> = {
      eventId: `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      eventType: 'CersaiChargeIdentified',
      aggregateId,
      surveyNumber: aggregateId,
      state,
      district,
      village,
      timestamp: new Date().toISOString(),
      outcome: 'ENCUMBERED',
      payload,
      version: 1,
      metadata: { institution: payload.financialInstitution, cersaiId: payload.cersaiSecurityInterestId }
    };
    await this.dispatch(event);
    return event;
  }

  public async emitCourtCaseQueried(
    aggregateId: string,
    state: string,
    payload: CourtCaseQueriedPayload,
    district?: string,
    village?: string
  ): Promise<EncumbranceDomainEvent> {
    const event: EncumbranceDomainEvent<CourtCaseQueriedPayload> = {
      eventId: `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      eventType: 'CourtCaseQueried',
      aggregateId,
      surveyNumber: aggregateId,
      state,
      district,
      village,
      timestamp: new Date().toISOString(),
      outcome: payload.stayOrderActive ? 'DISPUTED' : 'CLEAN',
      payload,
      version: 1,
      metadata: { cnr: payload.cnrNumber, dispute: payload.disputeCategory }
    };
    await this.dispatch(event);
    return event;
  }

  public async emitLisPendensDetected(
    aggregateId: string,
    state: string,
    payload: LisPendensInjunctionDetectedPayload,
    district?: string,
    village?: string
  ): Promise<EncumbranceDomainEvent> {
    const event: EncumbranceDomainEvent<LisPendensInjunctionDetectedPayload> = {
      eventId: `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      eventType: 'LisPendensInjunctionDetected',
      aggregateId,
      surveyNumber: aggregateId,
      state,
      district,
      village,
      timestamp: new Date().toISOString(),
      outcome: 'DISPUTED',
      payload,
      version: 1,
      metadata: { hardVeto: true, rule: 'Section 52 TPA Lis Pendens' }
    };
    await this.dispatch(event);
    return event;
  }

  public async emitTitleAggregated(
    aggregateId: string,
    state: string,
    payload: TitleEncumbranceAggregatedPayload,
    district?: string,
    village?: string
  ): Promise<EncumbranceDomainEvent> {
    const event: EncumbranceDomainEvent<TitleEncumbranceAggregatedPayload> = {
      eventId: `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      eventType: 'TitleEncumbranceAggregated',
      aggregateId,
      surveyNumber: aggregateId,
      state,
      district,
      village,
      timestamp: new Date().toISOString(),
      outcome: payload.hardVetoTripped ? 'DISPUTED' : (payload.activeMortgageCount > 0 ? 'ENCUMBERED' : 'CLEAN'),
      payload,
      version: 1,
      metadata: { hardVeto: payload.hardVetoTripped, debtInr: payload.totalActiveDebtInr }
    };
    await this.dispatch(event);
    return event;
  }
}
