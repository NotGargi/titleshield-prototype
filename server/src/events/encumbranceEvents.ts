export type EncumbranceEventType =
  | 'CersaiSearchInitiated'
  | 'CersaiChargeIdentified'
  | 'CersaiChargeSatisfied'
  | 'CourtCaseQueried'
  | 'LisPendensInjunctionDetected'
  | 'TitleEncumbranceAggregated';

export type EncumbranceOutcome = 'CLEAN' | 'ENCUMBERED' | 'DISPUTED' | 'ERROR';

export interface EncumbranceDomainEvent<T = any> {
  eventId: string;
  eventType: EncumbranceEventType;
  aggregateId: string;
  propertyId?: string;
  surveyNumber?: string;
  state: string;
  district?: string;
  village?: string;
  timestamp: string;
  outcome: EncumbranceOutcome;
  payload: T;
  version: number;
  metadata?: Record<string, any>;
}

export interface CersaiSearchInitiatedPayload {
  query: string;
  state: string;
  district?: string;
  village?: string;
  initiatedBy?: string;
}

export interface CersaiChargeIdentifiedPayload {
  cersaiSecurityInterestId: string;
  financialInstitution: string;
  chargeAmountInr: number;
  chargeType: string;
  creationDate: string;
  status: string;
}

export interface CersaiChargeSatisfiedPayload {
  cersaiSecurityInterestId: string;
  financialInstitution: string;
  chargeAmountInr: number;
  satisfactionDate: string;
}

export interface CourtCaseQueriedPayload {
  cnrNumber: string;
  courtName: string;
  caseType: string;
  disputeCategory: string;
  petitioner: string;
  respondent: string;
  stayOrderActive: boolean;
}

export interface LisPendensInjunctionDetectedPayload {
  cnrNumber: string;
  courtName: string;
  caseNumber: string;
  disputeCategory: string;
  stayOrderDetails: string;
  statutoryBasis: string; // e.g. "Section 52 Transfer of Property Act, 1882 & Order XXXIX CPC"
}

export interface TitleEncumbranceAggregatedPayload {
  surveyNumber: string;
  state: string;
  district?: string;
  activeMortgageCount: number;
  totalActiveDebtInr: number;
  satisfiedMortgageCount: number;
  activeLitigationCount: number;
  injunctionStayCount: number;
  overallEncumbranceStatus: 'CLEAN' | 'ENCUMBERED' | 'DISPUTED';
  hardVetoTripped: boolean;
  hardVetoReason?: string;
}
