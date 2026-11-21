/**
 * Multi-State Land Registry Portal Adapter Interfaces & Normalized Record Types
 * Landeed 2.0 Architectural Specification (Milestone 2)
 */

export interface PortalJurisdictionLevel {
  id: string;
  name: string;
  nativeName?: string;
}

export interface PortalCascadeOption {
  code: string;
  name: string;
  nativeName?: string;
}

export interface PortalQueryParams {
  state: string;
  docType: string;
  district: string;
  taluka: string;
  village: string;
  surveyNo: string;
  subDivision?: string;
  hobli?: string;
  mandal?: string;
  khataNo?: string;
  pattaNo?: string;
  ownerName?: string;
  surnoc?: string;
  hissaNo?: string;
  passbookNo?: string;
  queryMode?: 'SURVEY_NO' | 'PASSBOOK_NO' | 'PATTA_NO';
  gatNo?: string;
  sacNo?: string;
  ctsNo?: string;
  ferfarNo?: string;
  deedNo?: string;
  regYear?: string;
  year?: string;
  mutationNo?: string;
  documentNo?: string;
  ward?: string;
  simulationFailure?: string;
  live?: boolean;
}

export interface NormalizedOwnerRecord {
  name: string;
  nameNative?: string;
  relationType?: 'son_of' | 'daughter_of' | 'wife_of' | 'legal_heir_of' | 'joint_holder';
  relativeName?: string;
  relativeNameNative?: string;
  sharePercentage?: number;
  extentOwned?: string;
  khataOrPattaNo?: string;
}

export interface NormalizedEncumbranceRecord {
  unencumbered: boolean;
  hasActiveMortgage: boolean;
  mortgageDetails?: {
    bankName: string;
    amount: string;
    chargeDate: string;
    loanType?: string;
  };
  hasCourtStay: boolean;
  courtCaseDetails?: {
    courtName: string;
    caseNumber: string;
    stayOrderDate: string;
    petitioners?: string;
  };
  isProhibitedCategory: boolean; // Section 22-A / PTCL / Govt / Waqf / Bhoodan
  prohibitedReason?: string;
  otherRights: string[];
}

export interface NormalizedMutationRecord {
  mutationNumber: string;
  date: string;
  type: string;
  typeNative?: string;
  status: 'PRAMANIT' | 'PENDING_NOTICE' | 'DISPUTED' | 'CANCELLED';
  statusLabel: string;
  transferor: string;
  transferee: string;
  orderNumber?: string;
  orderDate?: string;
  details?: string;
  isCurrent?: boolean;
}

export interface CropDetailRecord {
  season: 'Kharif' | 'Rabi' | 'Summer' | 'Annual';
  cropName: string;
  cropNameNative?: string;
  area: string;
  irrigationType?: string;
}

export interface NormalizedLandRecord {
  state: string;
  docType: string;
  documentTitle: string;
  documentTitleNative?: string;
  rawText: string;
  officialPortalUrl: string;
  issuanceDate: string;
  hierarchy: {
    district: string;
    districtNative?: string;
    taluk: string;
    talukNative?: string;
    hobliOrMandal?: string;
    hobliOrMandalNative?: string;
    village: string;
    villageNative?: string;
  };
  holding: {
    surveyNumber: string;
    subDivision?: string;
    hissaNo?: string;
    surnoc?: string;
    khataNumber?: string;
    pattaNumber?: string;
    passbookNumber?: string;
    totalAreaStandard: string; // e.g. "2 Acres 14 Guntas (9,510 sq.m)"
    areaHectares?: number;
    areaAcres?: number;
    areaGuntas?: number;
    areaSqMeters?: number;
    kharabExtent?: string;
    netCultivableArea?: string;
    landClassification: string; // e.g. "Agricultural (Dry Crop / Punjai)"
    landClassificationNative?: string;
    tenureType: string; // e.g. "Ryotwari Freehold", "Occupant Class 1"
    assessmentTaxInr: string;
    waterRate?: string;
    soilClass?: string;
  };
  owners: NormalizedOwnerRecord[];
  primaryOwner: string;
  primaryOwnerNative?: string;
  encumbrance: NormalizedEncumbranceRecord;
  mutations?: NormalizedMutationRecord[];
  cropDetails?: CropDetailRecord[];
  steps: Array<{
    stepIndex: number;
    message: string;
    timestamp: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
  rawMetadata?: Record<string, any>;
}

export interface IPortalAdapter {
  readonly stateCode: string;
  readonly stateName: string;
  readonly supportedDocTypes: string[];
  readonly portalUrl: string;

  validateParams(params: PortalQueryParams): { valid: boolean; missingFields: string[] };
  buildAutomationGoal(params: PortalQueryParams): string;
  parseHtmlResponse(htmlOrJson: string, params: PortalQueryParams): NormalizedLandRecord;
  getFallbackRecord(params: PortalQueryParams): NormalizedLandRecord;
  getPortalUrlForDocType?(docType: string): string;
  fetchLiveRecord?(params: PortalQueryParams): Promise<NormalizedLandRecord>;
}
