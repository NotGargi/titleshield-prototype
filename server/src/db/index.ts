import fs from 'fs';
import path from 'path';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { ensureJobsSchema } from './jobsSchema';

// Path resolution ensuring stability across ts-node-dev and compiled dist/
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');
export const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
export const DB_PATH = path.join(DATA_DIR, 'landeed.db');

// 1. Auto-provision storage directories
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

// 2. Initialize better-sqlite3 connection with performance PRAGMAs
export const sqlite: DatabaseType = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('busy_timeout = 5000');

// Node 24 compatibility: Cache prepared statements to prevent Statement::~Statement() GC assertion crash
const statementCache = new Map<string, any>();
const originalPrepare = sqlite.prepare.bind(sqlite);
(sqlite as any).prepare = function (source: string) {
  let stmt = statementCache.get(source);
  if (!stmt) {
    stmt = originalPrepare(source);
    statementCache.set(source, stmt);
  }
  return stmt;
};

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });

// 3. Auto-Migration DDL
export function ensureDatabaseSchema(): void {
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      survey_number TEXT NOT NULL,
      sub_division TEXT,
      district TEXT NOT NULL,
      taluk TEXT NOT NULL,
      hobli TEXT,
      village TEXT NOT NULL,
      state TEXT NOT NULL,
      extent TEXT,
      land_type TEXT,
      claimed_owner TEXT NOT NULL,
      clean_title_score INTEGER NOT NULL DEFAULT 90,
      status TEXT NOT NULL DEFAULT 'CLEAN',
      guidance_value_inr TEXT,
      market_value_inr TEXT,
      canonical_hash TEXT NOT NULL,
      has_active_mortgage INTEGER NOT NULL DEFAULT 0,
      pending_litigation_count INTEGER NOT NULL DEFAULT 0,
      pdf_storage_path TEXT,
      doc_type TEXT,
      raw_metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
      state TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      district TEXT NOT NULL,
      taluka TEXT NOT NULL,
      village TEXT NOT NULL,
      survey_no TEXT NOT NULL,
      khata_no TEXT,
      owner_name TEXT,
      document_title TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      doc_hash TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      agent_result TEXT NOT NULL,
      proof TEXT NOT NULL,
      mutation_data TEXT,
      index_2_data TEXT,
      risk_analysis TEXT,
      params TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS title_lineage_records (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      year TEXT NOT NULL,
      deed_type TEXT NOT NULL,
      transferor TEXT NOT NULL,
      transferee TEXT NOT NULL,
      doc_number TEXT NOT NULL,
      sro_office TEXT NOT NULL,
      consideration_inr TEXT,
      status TEXT NOT NULL DEFAULT 'CLEAN',
      legacy_font TEXT,
      transcoded_utf8 TEXT,
      notes TEXT,
      order_index INTEGER NOT NULL,
      leaf_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_engine_results (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      engine_name TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      finding TEXT NOT NULL,
      evidence_hash TEXT NOT NULL,
      details TEXT,
      verified_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS title_certificates (
      id TEXT PRIMARY KEY,
      certificate_number TEXT NOT NULL UNIQUE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      advocate_name TEXT NOT NULL,
      advocate_bar_id TEXT NOT NULL,
      dsc_signature_hash TEXT NOT NULL,
      score INTEGER NOT NULL,
      status TEXT NOT NULL,
      eas_attestation_uid TEXT NOT NULL,
      merkle_root TEXT NOT NULL,
      ipfs_evidence_cid TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      taluka TEXT NOT NULL,
      village TEXT NOT NULL,
      survey_number TEXT NOT NULL,
      sub_division TEXT,
      claimed_owner TEXT NOT NULL DEFAULT 'Record Protected',
      extent TEXT,
      land_type TEXT NOT NULL DEFAULT 'Agricultural Freehold',
      guidance_value_inr TEXT,
      market_value_inr TEXT,
      clean_title_score INTEGER NOT NULL DEFAULT 90,
      clean_title_tier TEXT NOT NULL DEFAULT 'LOW',
      encumbrance_status TEXT NOT NULL DEFAULT 'CLEAN',
      centroid_lat REAL NOT NULL,
      centroid_lng REAL NOT NULL,
      bbox_min_lat REAL NOT NULL,
      bbox_min_lng REAL NOT NULL,
      bbox_max_lat REAL NOT NULL,
      bbox_max_lng REAL NOT NULL,
      polygon_coordinates TEXT NOT NULL,
      geojson_geometry TEXT NOT NULL,
      source_format TEXT NOT NULL,
      source_dataset TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_properties_state_dist ON properties(state, district);
    CREATE INDEX IF NOT EXISTS idx_properties_survey ON properties(survey_number);
    CREATE INDEX IF NOT EXISTS idx_properties_hash ON properties(canonical_hash);

    CREATE INDEX IF NOT EXISTS idx_records_state_dist ON records(state, district);
    CREATE INDEX IF NOT EXISTS idx_records_survey ON records(survey_no);
    CREATE INDEX IF NOT EXISTS idx_records_prop_id ON records(property_id);
    CREATE INDEX IF NOT EXISTS idx_records_doc_hash ON records(doc_hash);
    CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at);

    CREATE INDEX IF NOT EXISTS idx_lineage_prop ON title_lineage_records(property_id);
    CREATE INDEX IF NOT EXISTS idx_lineage_order ON title_lineage_records(property_id, order_index);

    CREATE INDEX IF NOT EXISTS idx_verif_prop ON verification_engine_results(property_id);
    CREATE INDEX IF NOT EXISTS idx_verif_engine ON verification_engine_results(property_id, engine_name);

    CREATE INDEX IF NOT EXISTS idx_cert_prop ON title_certificates(property_id);
    CREATE INDEX IF NOT EXISTS idx_cert_number ON title_certificates(certificate_number);
    CREATE INDEX IF NOT EXISTS idx_cert_eas ON title_certificates(eas_attestation_uid);

    CREATE INDEX IF NOT EXISTS idx_parcels_spatial ON parcels(bbox_min_lat, bbox_max_lat, bbox_min_lng, bbox_max_lng);
    CREATE INDEX IF NOT EXISTS idx_parcels_centroid ON parcels(centroid_lat, centroid_lng);
    CREATE INDEX IF NOT EXISTS idx_parcels_jurisdiction ON parcels(state, district, taluka, village);
    CREATE INDEX IF NOT EXISTS idx_parcels_survey ON parcels(survey_number);
    CREATE INDEX IF NOT EXISTS idx_parcels_property_id ON parcels(property_id);

    -- 7. Users Table: Sovereign Identity & Credential Registry
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'CITIZEN',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

    -- 8. Sessions Table: Active Bearer Session Tokens & Expiration
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_accessed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    -- 9. Auth Events Table: Section 63 BSA 2023 Compliant Audit Event Store
    CREATE TABLE IF NOT EXISTS auth_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      timestamp TEXT NOT NULL,
      outcome TEXT NOT NULL,
      payload TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_events_type ON auth_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON auth_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_auth_events_type_time ON auth_events(event_type, timestamp);
    CREATE INDEX IF NOT EXISTS idx_auth_events_user_time ON auth_events(user_id, timestamp);

    -- 10. CERSAI Charges Table: Statutory Central Mortgage Registry
    CREATE TABLE IF NOT EXISTS cersai_charges (
      id TEXT PRIMARY KEY,
      cersai_security_interest_id TEXT NOT NULL UNIQUE,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      survey_number TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      taluka TEXT,
      village TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      financial_institution TEXT NOT NULL,
      branch_name TEXT,
      charge_amount_inr REAL NOT NULL,
      charge_type TEXT NOT NULL DEFAULT 'EQUITABLE_MORTGAGE',
      creation_date TEXT NOT NULL,
      satisfaction_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      roc_charge_id TEXT,
      filing_officer TEXT,
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cersai_survey ON cersai_charges(survey_number);
    CREATE INDEX IF NOT EXISTS idx_cersai_jurisdiction ON cersai_charges(state, district, village);
    CREATE INDEX IF NOT EXISTS idx_cersai_status ON cersai_charges(status);
    CREATE INDEX IF NOT EXISTS idx_cersai_borrower ON cersai_charges(borrower_name);
    CREATE INDEX IF NOT EXISTS idx_cersai_institution ON cersai_charges(financial_institution);
    CREATE INDEX IF NOT EXISTS idx_cersai_prop_id ON cersai_charges(property_id);

    -- 11. Court Cases Table: e-Courts NJDG Litigation Tracker
    CREATE TABLE IF NOT EXISTS court_cases (
      id TEXT PRIMARY KEY,
      cnr_number TEXT NOT NULL UNIQUE,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      survey_number TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      taluka TEXT,
      village TEXT NOT NULL,
      court_name TEXT NOT NULL,
      case_type TEXT NOT NULL,
      case_number TEXT NOT NULL,
      filing_year INTEGER NOT NULL,
      filing_date TEXT NOT NULL,
      petitioner TEXT NOT NULL,
      respondent TEXT NOT NULL,
      petitioner_advocate TEXT,
      respondent_advocate TEXT,
      dispute_category TEXT NOT NULL,
      prayer_summary TEXT NOT NULL,
      stay_order_active INTEGER NOT NULL DEFAULT 0,
      stay_order_details TEXT,
      case_status TEXT NOT NULL DEFAULT 'PENDING',
      stage_of_case TEXT,
      next_hearing_date TEXT,
      raw_metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_court_cnr ON court_cases(cnr_number);
    CREATE INDEX IF NOT EXISTS idx_court_survey ON court_cases(survey_number);
    CREATE INDEX IF NOT EXISTS idx_court_jurisdiction ON court_cases(state, district, village);
    CREATE INDEX IF NOT EXISTS idx_court_stay ON court_cases(stay_order_active);
    CREATE INDEX IF NOT EXISTS idx_court_status ON court_cases(case_status);
    CREATE INDEX IF NOT EXISTS idx_court_prop_id ON court_cases(property_id);

    -- 12. Encumbrance Audit Events Table: Event Sourcing Diligence Log
    CREATE TABLE IF NOT EXISTS encumbrance_audit_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      property_id TEXT,
      survey_number TEXT,
      state TEXT NOT NULL,
      district TEXT,
      village TEXT,
      timestamp TEXT NOT NULL,
      outcome TEXT NOT NULL,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_enc_events_agg ON encumbrance_audit_events(aggregate_id);
    CREATE INDEX IF NOT EXISTS idx_enc_events_type ON encumbrance_audit_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_enc_events_survey ON encumbrance_audit_events(survey_number);
    CREATE INDEX IF NOT EXISTS idx_enc_events_state ON encumbrance_audit_events(state);
    CREATE INDEX IF NOT EXISTS idx_enc_events_time ON encumbrance_audit_events(timestamp);
  `);

  // Ensure query_jobs and query_job_dlq schema
  ensureJobsSchema(sqlite);
}

// Automatically ensure schema on initialization
ensureDatabaseSchema();
