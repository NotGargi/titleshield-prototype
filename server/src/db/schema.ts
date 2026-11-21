import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core';

/**
 * 1. Properties Table: Core Cadastral Holding Parcel Registry
 * Models authentic Indian land parcels across 36 States & UTs.
 */
export const properties = sqliteTable(
  'properties',
  {
    id: text('id').primaryKey(), // e.g. "prop_wagholi_4821_a9f1"
    surveyNumber: text('survey_number').notNull(),
    subDivision: text('sub_division'),
    district: text('district').notNull(),
    taluk: text('taluk').notNull(),
    hobli: text('hobli'),
    village: text('village').notNull(),
    state: text('state').notNull(),
    extent: text('extent'), // e.g. "0 Hectare 18 R", "2,400 sq.ft"
    landType: text('land_type'), // e.g. "Agricultural", "Residential Freehold"
    claimedOwner: text('claimed_owner').notNull(),
    cleanTitleScore: integer('clean_title_score').default(90).notNull(),
    status: text('status').default('CLEAN').notNull(), // 'CLEAN' | 'REVIEW_NEEDED' | 'DISPUTED' | 'ENCUMBERED'
    guidanceValueInr: text('guidance_value_inr'),
    marketValueInr: text('market_value_inr'),
    canonicalHash: text('canonical_hash').notNull(),
    hasActiveMortgage: integer('has_active_mortgage', { mode: 'boolean' }).default(false).notNull(),
    pendingLitigationCount: integer('pending_litigation_count').default(0).notNull(),
    pdfStoragePath: text('pdf_storage_path'),
    docType: text('doc_type'),
    rawMetadata: text('raw_metadata'), // JSON stringified metadata
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_properties_state_dist').on(table.state, table.district),
    index('idx_properties_survey').on(table.surveyNumber),
    index('idx_properties_hash').on(table.canonicalHash),
  ]
);

/**
 * 2. Records Table: Persisted Landeed Extracted Records
 * Replaces the in-memory RECORD_STORE Map, offloading PDF buffers to disk.
 */
export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(), // e.g. "rec-up-ghaziabad-panchsheel-112" or UUID
    propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }),
    state: text('state').notNull(),
    docType: text('doc_type').notNull(),
    district: text('district').notNull(),
    taluka: text('taluka').notNull(),
    village: text('village').notNull(),
    surveyNo: text('survey_no').notNull(),
    khataNo: text('khata_no'),
    ownerName: text('owner_name'),
    documentTitle: text('document_title').notNull(),
    rawText: text('raw_text').notNull(),
    docHash: text('doc_hash').notNull(), // Document SHA-256 digest for O(1) verify lookups
    pdfPath: text('pdf_path').notNull(), // Relative disk path: data/pdfs/{id}.pdf
    agentResult: text('agent_result').notNull(), // JSON string of TinyFishAgentResult
    proof: text('proof').notNull(), // JSON string of BlockchainAnchorProof
    mutationData: text('mutation_data'), // JSON string of Village Form 6 MutationData
    index2Data: text('index_2_data'), // JSON string of IGR Index-II Index2Data
    riskAnalysis: text('risk_analysis'), // JSON string of RiskFormulaResult
    params: text('params'), // JSON string of LandRecordFetchParams
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_records_state_dist').on(table.state, table.district),
    index('idx_records_survey').on(table.surveyNo),
    index('idx_records_prop_id').on(table.propertyId),
    index('idx_records_doc_hash').on(table.docHash),
    index('idx_records_created').on(table.createdAt),
  ]
);

/**
 * 3. Title Lineage Records: 30-Year Chain-of-Title DAG Nodes
 * Models chronological conveyance deeds, partitions, and mortgage liens.
 */
export const titleLineageRecords = sqliteTable(
  'title_lineage_records',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    year: text('year').notNull(),
    deedType: text('deed_type').notNull(), // e.g. "Partition Deed", "Registered Sale Deed"
    transferor: text('transferor').notNull(),
    transferee: text('transferee').notNull(),
    docNumber: text('doc_number').notNull(),
    sroOffice: text('sro_office').notNull(),
    considerationInr: text('consideration_inr'),
    status: text('status').default('CLEAN').notNull(), // 'CLEAN' | 'WARNING' | 'BREACH'
    legacyFont: text('legacy_font'), // Pre-2002 legacy Indic font string
    transcodedUtf8: text('transcoded_utf8'), // Normalized Unicode UTF-8 string
    notes: text('notes'),
    orderIndex: integer('order_index').notNull(), // Sequence: 1, 2, 3...
    leafHash: text('leaf_hash'), // SHA-256 Merkle leaf hash
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_lineage_prop').on(table.propertyId),
    index('idx_lineage_order').on(table.propertyId, table.orderIndex),
  ]
);

/**
 * 4. Multi-Engine Registry Verification Results
 * Stores outcomes of parallel fan-out checks across 5 independent portals.
 */
export const verificationEngineResults = sqliteTable(
  'verification_engine_results',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    engineName: text('engine_name').notNull(), // 'State Revenue RoR', 'SRO Encumbrance', 'eCourts NJDG', 'CERSAI', 'RERA'
    source: text('source').notNull(),
    status: text('status').notNull(), // 'CLEAN' | 'REVIEW' | 'FLAGGED'
    finding: text('finding').notNull(),
    evidenceHash: text('evidence_hash').notNull(),
    details: text('details'), // JSON string
    verifiedAt: text('verified_at').notNull(),
  },
  (table) => [
    index('idx_verif_prop').on(table.propertyId),
    index('idx_verif_engine').on(table.propertyId, table.engineName),
  ]
);

/**
 * 5. Title Certificates: Section 63 BSA 2023 Digital Evidence Certificates
 * Cryptographically stamped certificates with Class-3 DSC signatures & EAS Amoy UIDs.
 */
export const titleCertificates = sqliteTable(
  'title_certificates',
  {
    id: text('id').primaryKey(),
    certificateNumber: text('certificate_number').unique().notNull(), // e.g. "TS-MH-2024-4821"
    propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    advocateName: text('advocate_name').notNull(),
    advocateBarId: text('advocate_bar_id').notNull(),
    dscSignatureHash: text('dsc_signature_hash').notNull(),
    score: integer('score').notNull(),
    status: text('status').notNull(), // 'VALID' | 'CONDITIONAL' | 'REVOKED'
    easAttestationUid: text('eas_attestation_uid').notNull(),
    merkleRoot: text('merkle_root').notNull(),
    ipfsEvidenceCid: text('ipfs_evidence_cid').notNull(),
    issuedAt: text('issued_at').notNull(),
    validUntil: text('valid_until').notNull(),
    details: text('details'), // JSON string
  },
  (table) => [
    index('idx_cert_prop').on(table.propertyId),
    index('idx_cert_number').on(table.certificateNumber),
    index('idx_cert_eas').on(table.easAttestationUid),
  ]
);

// Type Inference Exports
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type RecordRow = typeof records.$inferSelect;
export type NewRecordRow = typeof records.$inferInsert;

export type TitleLineageRecord = typeof titleLineageRecords.$inferSelect;
export type NewTitleLineageRecord = typeof titleLineageRecords.$inferInsert;

export type VerificationEngineResult = typeof verificationEngineResults.$inferSelect;
export type NewVerificationEngineResult = typeof verificationEngineResults.$inferInsert;

export type TitleCertificate = typeof titleCertificates.$inferSelect;
export type NewTitleCertificate = typeof titleCertificates.$inferInsert;

/**
 * 6. Parcels Table: High-Precision Spatial Cadastral Plots
 * Models GIS polygon boundaries, bounding boxes, centroids, and attributes
 * imported from official state cadastral Shapefiles and GeoJSON datasets.
 */
export const parcels = sqliteTable(
  'parcels',
  {
    id: text('id').primaryKey(), // e.g. "parcel_mh_haveli_wagholi_142_2a"
    propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
    state: text('state').notNull(),
    district: text('district').notNull(),
    taluka: text('taluka').notNull(),
    village: text('village').notNull(),
    surveyNumber: text('survey_number').notNull(),
    subDivision: text('sub_division'),
    claimedOwner: text('claimed_owner').default('Record Protected').notNull(),
    extent: text('extent'), // e.g. "0 Hectare 18 R", "1.25 Acres"
    landType: text('land_type').default('Agricultural Freehold').notNull(),
    guidanceValueInr: text('guidance_value_inr'),
    marketValueInr: text('market_value_inr'),
    cleanTitleScore: integer('clean_title_score').default(90).notNull(),
    cleanTitleTier: text('clean_title_tier').default('LOW').notNull(), // 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
    encumbranceStatus: text('encumbrance_status').default('CLEAN').notNull(),
    centroidLat: real('centroid_lat').notNull(),
    centroidLng: real('centroid_lng').notNull(),
    bboxMinLat: real('bbox_min_lat').notNull(),
    bboxMinLng: real('bbox_min_lng').notNull(),
    bboxMaxLat: real('bbox_max_lat').notNull(),
    bboxMaxLng: real('bbox_max_lng').notNull(),
    polygonCoordinates: text('polygon_coordinates').notNull(), // JSON array of [lat, lng] pairs for SVG
    geojsonGeometry: text('geojson_geometry').notNull(),       // Standard RFC 7946 GeoJSON geometry
    sourceFormat: text('source_format').notNull(),             // 'SHAPEFILE' | 'GEOJSON'
    sourceDataset: text('source_dataset'),                     // e.g. 'haveli_taluka_2024'
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_parcels_spatial').on(table.bboxMinLat, table.bboxMaxLat, table.bboxMinLng, table.bboxMaxLng),
    index('idx_parcels_centroid').on(table.centroidLat, table.centroidLng),
    index('idx_parcels_jurisdiction').on(table.state, table.district, table.taluka, table.village),
    index('idx_parcels_survey').on(table.surveyNumber),
    index('idx_parcels_property_id').on(table.propertyId),
  ]
);

export type Parcel = typeof parcels.$inferSelect;
export type NewParcel = typeof parcels.$inferInsert;

/**
 * 7. Users Table: Sovereign Identity & Credential Registry
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(), // e.g. "usr_..."
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    phone: text('phone'),
    role: text('role').default('CITIZEN').notNull(), // 'CITIZEN' | 'BUYER' | 'ADVOCATE' | 'BANK' | 'ADMIN'
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: text('locked_until'), // ISO timestamp for lockout expiration
    lastLoginAt: text('last_login_at'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    metadata: text('metadata'), // JSON stringified metadata
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_phone').on(table.phone),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * 8. Sessions Table: Active Bearer Session Tokens & Expiration
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // e.g. "sess_..."
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').unique().notNull(), // 64-char hex cryptographically random token
    role: text('role').notNull(),
    deviceInfo: text('device_info'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: text('expires_at').notNull(), // ISO timestamp
    createdAt: text('created_at').notNull(),
    lastAccessedAt: text('last_accessed_at').notNull(),
  },
  (table) => [
    index('idx_sessions_token').on(table.token),
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_expires').on(table.expiresAt),
  ]
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * 9. Auth Events Table: Section 63 BSA 2023 Compliant Audit Event Store
 */
export const authEvents = sqliteTable(
  'auth_events',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    timestamp: text('timestamp').notNull(),
    outcome: text('outcome').notNull(), // 'SUCCESS' | 'FAILURE'
    payload: text('payload').notNull(), // JSON string (strictly sanitized)
    metadata: text('metadata').notNull(), // JSON string (IP, UA, etc.)
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_auth_events_user').on(table.userId),
    index('idx_auth_events_type').on(table.eventType),
    index('idx_auth_events_timestamp').on(table.timestamp),
    index('idx_auth_events_type_time').on(table.eventType, table.timestamp),
    index('idx_auth_events_user_time').on(table.userId, table.timestamp),
  ]
);

export type AuthEventRow = typeof authEvents.$inferSelect;
export type NewAuthEventRow = typeof authEvents.$inferInsert;

/**
 * 10. CERSAI Charges Table: Central Registry of Securitisation Asset Reconstruction
 * and Security Interest of India.
 * Official statutory registry for institutional bank mortgages & financial charges.
 */
export const cersaiCharges = sqliteTable(
  'cersai_charges',
  {
    id: text('id').primaryKey(), // e.g. "cersai_chg_gzb_404_a1"
    cersaiSecurityInterestId: text('cersai_security_interest_id').unique().notNull(), // e.g. "CERSAI-UP-GZB-2021-008192"
    propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
    surveyNumber: text('survey_number').notNull(),
    state: text('state').notNull(),
    district: text('district').notNull(),
    taluka: text('taluka'),
    village: text('village').notNull(),
    borrowerName: text('borrower_name').notNull(),
    financialInstitution: text('financial_institution').notNull(), // e.g. "State Bank of India"
    branchName: text('branch_name'),
    chargeAmountInr: real('charge_amount_inr').notNull(),
    chargeType: text('charge_type').default('EQUITABLE_MORTGAGE').notNull(), // 'EQUITABLE_MORTGAGE' | 'REGISTERED_MORTGAGE' | 'HYPOTHECATION'
    creationDate: text('creation_date').notNull(),
    satisfactionDate: text('satisfaction_date'),
    status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'SATISFIED' | 'MODIFIED'
    rocChargeId: text('roc_charge_id'), // ROC Form CHG-1 filing
    filingOfficer: text('filing_officer'),
    remarks: text('remarks'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_cersai_survey').on(table.surveyNumber),
    index('idx_cersai_jurisdiction').on(table.state, table.district, table.village),
    index('idx_cersai_status').on(table.status),
    index('idx_cersai_borrower').on(table.borrowerName),
    index('idx_cersai_institution').on(table.financialInstitution),
    index('idx_cersai_prop_id').on(table.propertyId),
  ]
);

export type CersaiCharge = typeof cersaiCharges.$inferSelect;
export type NewCersaiCharge = typeof cersaiCharges.$inferInsert;

/**
 * 11. Court Cases Table: e-Courts National Judicial Data Grid (NJDG) Litigation Tracker
 * Tracks civil disputes, partition suits, and Lis Pendens injunctions under Sec 52 TPA.
 */
export const courtCases = sqliteTable(
  'court_cases',
  {
    id: text('id').primaryKey(), // e.g. "case_up_gzb_2022_412"
    cnrNumber: text('cnr_number').unique().notNull(), // Official 16-character CNR, e.g. "UPGZ01-004291-2022"
    propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
    surveyNumber: text('survey_number').notNull(),
    state: text('state').notNull(),
    district: text('district').notNull(),
    taluka: text('taluka'),
    village: text('village').notNull(),
    courtName: text('court_name').notNull(), // e.g. "Civil Court (Senior Division) Ghaziabad"
    caseType: text('case_type').notNull(), // e.g. "Special Civil Suit (S.C.S.)"
    caseNumber: text('case_number').notNull(), // e.g. "SCS/412/2022"
    filingYear: integer('filing_year').notNull(),
    filingDate: text('filing_date').notNull(),
    petitioner: text('petitioner').notNull(),
    respondent: text('respondent').notNull(),
    petitionerAdvocate: text('petitioner_advocate'),
    respondentAdvocate: text('respondent_advocate'),
    disputeCategory: text('dispute_category').notNull(), // 'TITLE_DISPUTE' | 'PARTITION_SUIT' | 'SPECIFIC_PERFORMANCE' | 'BOUNDARY_ENCROACHMENT'
    prayerSummary: text('prayer_summary').notNull(),
    stayOrderActive: integer('stay_order_active', { mode: 'boolean' }).default(false).notNull(), // True = Injunction active under Order XXXIX CPC
    stayOrderDetails: text('stay_order_details'),
    caseStatus: text('case_status').default('PENDING').notNull(), // 'PENDING' | 'DISPOSED' | 'STAY_GRANTED' | 'DISMISSED'
    stageOfCase: text('stage_of_case'),
    nextHearingDate: text('next_hearing_date'),
    rawMetadata: text('raw_metadata'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_court_cnr').on(table.cnrNumber),
    index('idx_court_survey').on(table.surveyNumber),
    index('idx_court_jurisdiction').on(table.state, table.district, table.village),
    index('idx_court_stay').on(table.stayOrderActive),
    index('idx_court_status').on(table.caseStatus),
    index('idx_court_prop_id').on(table.propertyId),
  ]
);

export type CourtCase = typeof courtCases.$inferSelect;
export type NewCourtCase = typeof courtCases.$inferInsert;

/**
 * 12. Encumbrance Audit Events Table: Event-Driven Diligence Log
 * Event Sourcing and Section 63 BSA 2023 compliant audit log for CERSAI and litigation queries.
 */
export const encumbranceAuditEvents = sqliteTable(
  'encumbrance_audit_events',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    aggregateId: text('aggregate_id').notNull(), // e.g. survey number or property ID
    propertyId: text('property_id'),
    surveyNumber: text('survey_number'),
    state: text('state').notNull(),
    district: text('district'),
    village: text('village'),
    timestamp: text('timestamp').notNull(),
    outcome: text('outcome').notNull(), // 'CLEAN' | 'ENCUMBERED' | 'DISPUTED' | 'ERROR'
    payload: text('payload').notNull(), // JSON string
    version: integer('version').default(1).notNull(),
    metadata: text('metadata').notNull(), // JSON string
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_enc_events_agg').on(table.aggregateId),
    index('idx_enc_events_type').on(table.eventType),
    index('idx_enc_events_survey').on(table.surveyNumber),
    index('idx_enc_events_state').on(table.state),
    index('idx_enc_events_time').on(table.timestamp),
  ]
);

export type EncumbranceAuditEvent = typeof encumbranceAuditEvents.$inferSelect;
export type NewEncumbranceAuditEvent = typeof encumbranceAuditEvents.$inferInsert;


