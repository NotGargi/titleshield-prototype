import fs from 'fs';
import path from 'path';
import { db, sqlite, DATA_DIR, PDFS_DIR } from './index';
import * as schema from './schema';
import { TinyFishAgentResult, LandRecordFetchParams } from '../services/tinyfish';
import { BlockchainService, BlockchainAnchorProof } from '../services/blockchain';

const blockchain = new BlockchainService();

export interface MutationTimelineEntry {
  ferfarNo: string;
  year: string;
  date: string;
  type: string;
  typeMarathi: string;
  parties: string;
  description: string;
  status: 'PRAMANIT' | 'PENDING_NOTICE' | 'DISPUTED' | 'CANCELLED';
  statusLabel: string;
  isCurrent?: boolean;
}

export interface MutationData {
  ferfarNo: string;
  entryDate: string;
  status: 'PRAMANIT' | 'PENDING_NOTICE' | 'DISPUTED' | 'CANCELLED';
  statusLabel: string;
  statusColor: string;
  mutationType: string;
  mutationTypeMarathi: string;
  surveyNo: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  transferor: string;
  transferee: string;
  area: string;
  assessment: string;
  sroDeedNo?: string;
  sroOffice?: string;
  sroRegDate?: string;
  considerationAmount?: string;
  noticeDetails: {
    noticeDate: string;
    noticeDisplayedAt: string;
    objectionDeadline: string;
    daysRemaining?: number;
    objectionStatus: string;
    certifyingOfficer: string;
    orderNo: string;
    orderDate: string;
  };
  timeline: MutationTimelineEntry[];
}

export interface Index2Data {
  deedNo: string;
  regYear: string;
  regDate: string;
  sroOffice: string;
  bookNo: string;
  volumeNo: string;
  pageNos: string;
  serialNo: string;
  documentType: string;
  documentTypeMarathi: string;
  considerationAmount: string;
  marketValue: string;
  stampDutyPaid: string;
  registrationFeePaid: string;
  executant: {
    name: string;
    role: string;
    address: string;
  };
  claimant: {
    name: string;
    role: string;
    address: string;
  };
  propertyDescription: {
    surveyNo: string;
    village: string;
    taluka: string;
    district: string;
    state: string;
    area: string;
    ctsNo?: string;
    boundaries: {
      east: string;
      west: string;
      north: string;
      south: string;
    };
  };
  ferfarRef?: string;
}

export interface TaxAssessmentData {
  sacNo: string;
  ward: string;
  zone: string;
  buildingName: string;
  flatNo: string;
  address: string;
  assessedOwner: string;
  coOwners?: string[];
  propertyType: string;
  capitalValue: string;
  carpetAreaSqMtr: string;
  carpetAreaSqFt: string;
  deedCarpetAreaSqFt: string;
  areaDiscrepancySqFt: string;
  ocStatus: 'FULL_OC_VERIFIED' | 'PROVISIONAL_AWAITED' | 'UNASSESSED_STRUCTURE';
  ocStatusLabel: string;
  waterTaxTariff: string;
  billingPeriod: string;
  totalArrears: string;
  currentYearDemand: string;
  netPayableAmount: string;
  hasSection212Charge: boolean;
  hasSection267APenalty: boolean;
  taxBreakdown: {
    generalTax: string;
    waterTax: string;
    sewerageTax: string;
    educationCess: string;
    treeCess: string;
    streetTax: string;
    penaltyInterestSec207A: string;
  };
  lastPaymentDate?: string;
  lastReceiptNo?: string;
  discrepancyWarnings: string[];
}

export interface StoredRecord {
  id: string;
  createdAt: string;
  params: LandRecordFetchParams;
  agentResult: TinyFishAgentResult;
  proof: BlockchainAnchorProof;
  pdfPath: string;
  pdfBuffer?: Buffer;
  mutationData?: MutationData;
  index2Data?: Index2Data;
  taxData?: TaxAssessmentData;
  riskAnalysis?: any;
}

/**
 * Robust JSON parser with fallback to avoid runtime JSON syntax exceptions
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.error('[RecordsRepository] Warning: JSON parse failed:', err);
    return fallback;
  }
}

/**
 * Reconstructs a full typed StoredRecord from a SQLite records row.
 */
export function rowToStoredRecord(row: any): StoredRecord | null {
  if (!row) return null;

  const pdfPath = row.pdfPath || row.pdf_path || `data/pdfs/${row.id}.pdf`;

  const record: StoredRecord = {
    id: row.id,
    createdAt: row.createdAt || row.created_at,
    params: row.params ? safeJsonParse(row.params, {
      state: row.state,
      docType: row.docType || row.doc_type,
      district: row.district,
      taluka: row.taluka,
      village: row.village,
      surveyNo: row.surveyNo || row.survey_no,
      khataNo: (row.khataNo || row.khata_no) ?? undefined,
      ownerName: (row.ownerName || row.owner_name) ?? undefined
    }) : {
      state: row.state,
      docType: row.docType || row.doc_type,
      district: row.district,
      taluka: row.taluka,
      village: row.village,
      surveyNo: row.surveyNo || row.survey_no,
      khataNo: (row.khataNo || row.khata_no) ?? undefined,
      ownerName: (row.ownerName || row.owner_name) ?? undefined
    },
    agentResult: safeJsonParse<TinyFishAgentResult>(row.agentResult || row.agent_result, {
      success: true,
      documentTitle: row.documentTitle || row.document_title || 'Certified Land Record',
      rawText: row.rawText || row.raw_text || '',
      metadata: {
        ownerName: row.owner_name || row.ownerName || 'Record Protected',
        surveyNumber: row.survey_no || row.surveyNo || 'N/A',
        khataNumber: row.khata_no || row.khataNo || 'N/A',
        totalArea: 'N/A',
        unencumbered: true,
        landType: 'Freehold',
        issuanceDate: new Date().toLocaleDateString('en-IN'),
        portalSource: 'Official Land Records Registry'
      },
      steps: []
    }),
    proof: safeJsonParse<BlockchainAnchorProof>(row.proof, {
      docHash: row.doc_hash || row.docHash || '0x0',
      transactionHash: '0x0',
      blockNumber: 0,
      timestamp: 0,
      network: 'Polygon Amoy',
      chainId: 80002,
      contractAddress: '0x0',
      explorerUrl: '',
      verificationUrl: '',
      isVerified: true
    }),
    pdfPath,
    mutationData: row.mutationData || row.mutation_data
      ? safeJsonParse<MutationData | undefined>(row.mutationData || row.mutation_data, undefined)
      : undefined,
    index2Data: row.index2Data || row.index_2_data
      ? safeJsonParse<Index2Data | undefined>(row.index2Data || row.index_2_data, undefined)
      : undefined,
    taxData: (row.riskAnalysis || row.risk_analysis)
      ? safeJsonParse<any>(row.riskAnalysis || row.risk_analysis, {}).taxData
      : (row.agentResult || row.agent_result
         ? safeJsonParse<any>(row.agentResult || row.agent_result, {}).taxData
         : undefined),
    riskAnalysis: row.riskAnalysis || row.risk_analysis
      ? safeJsonParse<any>(row.riskAnalysis || row.risk_analysis, undefined)
      : undefined
  };

  // Provide backward-compatible lazy pdfBuffer accessor if legacy code accesses record.pdfBuffer
  Object.defineProperty(record, 'pdfBuffer', {
    configurable: true,
    enumerable: false,
    get() {
      const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(DATA_DIR, '..', pdfPath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
      return Buffer.alloc(0);
    }
  });

  return record;
}

/**
 * Retrieve a stored record by ID (synchronous better-sqlite3 query)
 */
export function getStoredRecord(id: string): StoredRecord | null {
  try {
    const row = sqlite.prepare('SELECT * FROM records WHERE id = ?').get(id);
    return rowToStoredRecord(row);
  } catch (err) {
    console.error(`[RecordsRepository] Error fetching record ${id}:`, err);
    return null;
  }
}

/**
 * Async wrapper for getStoredRecord conforming to interface contracts
 */
export async function getRecordById(id: string): Promise<StoredRecord | null> {
  return getStoredRecord(id);
}

/**
 * Retrieve all stored records ordered by creation date descending
 */
export function getAllStoredRecords(): StoredRecord[] {
  try {
    const rows = sqlite.prepare('SELECT * FROM records ORDER BY created_at DESC').all();
    return rows.map(rowToStoredRecord).filter((r): r is StoredRecord => r !== null);
  } catch (err) {
    console.error('[RecordsRepository] Error fetching all records:', err);
    return [];
  }
}

/**
 * Async wrapper for getAllStoredRecords
 */
export async function getAllRecords(): Promise<StoredRecord[]> {
  return getAllStoredRecords();
}

/**
 * Retrieve a stored record by document SHA-256 hash (used by /api/verify/:hash for O(1) indexed lookup)
 */
export function getRecordByDocHash(hash: string): StoredRecord | null {
  const cleanHash = (hash || '').toLowerCase();
  try {
    // 1. First attempt direct indexed lookup on records.doc_hash
    const row = sqlite.prepare('SELECT * FROM records WHERE lower(doc_hash) = ?').get(cleanHash);
    if (row) return rowToStoredRecord(row);

    // 2. Second attempt fast join on properties.canonical_hash
    const joinStmt = sqlite.prepare(`
      SELECT r.* FROM records r
      JOIN properties p ON r.property_id = p.id
      WHERE lower(p.canonical_hash) = ?
    `);
    const joinRow = joinStmt.get(cleanHash);
    if (joinRow) return rowToStoredRecord(joinRow);

    // 3. Fallback scan across records.proof JSON
    const all = sqlite.prepare('SELECT * FROM records').all() as any[];
    for (const r of all) {
      const proof = safeJsonParse(r.proof, {} as any);
      if (proof.docHash && proof.docHash.toLowerCase() === cleanHash) {
        return rowToStoredRecord(r);
      }
    }
    return null;
  } catch (err) {
    console.error(`[RecordsRepository] Error matching hash ${hash}:`, err);
    return null;
  }
}

/**
 * Persist or update a StoredRecord across records, properties, and titleLineageRecords
 * executed in an ACID transaction.
 */
export function saveStoredRecord(record: StoredRecord): void {
  const propertyId = `prop_${record.id.replace(/^rec-/, '')}`;
  const now = new Date().toISOString();
  const pdfStoragePath = record.pdfPath || `data/pdfs/${record.id}.pdf`;

  // If a pdfBuffer is provided, persist it to disk directly if file not yet on disk
  const absolutePdfPath = path.isAbsolute(pdfStoragePath)
    ? pdfStoragePath
    : path.resolve(DATA_DIR, '..', pdfStoragePath);

  if ((record as any).pdfBuffer && (record as any).pdfBuffer.length > 0 && !fs.existsSync(absolutePdfPath)) {
    const parentDir = path.dirname(absolutePdfPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(absolutePdfPath, (record as any).pdfBuffer);
  }

  const claimedOwner =
    record.agentResult?.metadata?.ownerName ||
    record.params?.ownerName ||
    'Record Protected';

  const extent =
    record.agentResult?.metadata?.totalArea ||
    record.mutationData?.area ||
    record.index2Data?.propertyDescription?.area ||
    null;

  const landType = record.agentResult?.metadata?.landType || 'Freehold';
  const guidanceValue = record.index2Data?.marketValue || record.mutationData?.assessment || null;
  const marketValue = record.index2Data?.considerationAmount || null;
  const canonicalHash = record.proof?.docHash || '0x0';
  const docHash = (record.proof?.docHash || '').toLowerCase();
  const hasActiveMortgage = record.agentResult?.metadata?.unencumbered === false ? 1 : 0;
  const pendingLitigationCount = record.riskAnalysis?.vetoGates?.v1_lisPendensCourtStay ? 1 : 0;
  const cleanTitleScore = record.riskAnalysis?.score ?? 90;
  const status =
    record.riskAnalysis?.riskTier ??
    (record.mutationData?.status === 'PENDING_NOTICE' ? 'REVIEW_NEEDED' : 'CLEAN');

  const executeTx = sqlite.transaction(() => {
    // 1. Upsert Properties Table
    sqlite.prepare(`
      INSERT INTO properties (
        id, survey_number, district, taluk, hobli, village, state,
        extent, land_type, claimed_owner, clean_title_score, status,
        guidance_value_inr, market_value_inr, canonical_hash,
        has_active_mortgage, pending_litigation_count, pdf_storage_path,
        doc_type, raw_metadata, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        survey_number = excluded.survey_number,
        district = excluded.district,
        taluk = excluded.taluk,
        village = excluded.village,
        state = excluded.state,
        extent = excluded.extent,
        land_type = excluded.land_type,
        claimed_owner = excluded.claimed_owner,
        clean_title_score = excluded.clean_title_score,
        status = excluded.status,
        guidance_value_inr = excluded.guidance_value_inr,
        market_value_inr = excluded.market_value_inr,
        canonical_hash = excluded.canonical_hash,
        has_active_mortgage = excluded.has_active_mortgage,
        pending_litigation_count = excluded.pending_litigation_count,
        pdf_storage_path = excluded.pdf_storage_path,
        doc_type = excluded.doc_type,
        raw_metadata = excluded.raw_metadata,
        updated_at = excluded.updated_at
    `).run(
      propertyId,
      record.params.surveyNo,
      record.params.district,
      record.params.taluka,
      record.params.taluka, // hobli
      record.params.village,
      record.params.state,
      extent,
      landType,
      claimedOwner,
      cleanTitleScore,
      status,
      guidanceValue,
      marketValue,
      canonicalHash,
      hasActiveMortgage,
      pendingLitigationCount,
      pdfStoragePath,
      record.params.docType,
      JSON.stringify(record.agentResult?.metadata || {}),
      record.createdAt || now,
      now
    );

    // 2. Upsert Records Table
    sqlite.prepare(`
      INSERT INTO records (
        id, property_id, state, doc_type, district, taluka, village,
        survey_no, khata_no, owner_name, document_title, raw_text,
        doc_hash, pdf_path, agent_result, proof, mutation_data, index_2_data,
        risk_analysis, params, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        property_id = excluded.property_id,
        state = excluded.state,
        doc_type = excluded.doc_type,
        district = excluded.district,
        taluka = excluded.taluka,
        village = excluded.village,
        survey_no = excluded.survey_no,
        khata_no = excluded.khata_no,
        owner_name = excluded.owner_name,
        document_title = excluded.document_title,
        raw_text = excluded.raw_text,
        doc_hash = excluded.doc_hash,
        pdf_path = excluded.pdf_path,
        agent_result = excluded.agent_result,
        proof = excluded.proof,
        mutation_data = excluded.mutation_data,
        index_2_data = excluded.index_2_data,
        risk_analysis = excluded.risk_analysis,
        params = excluded.params
    `).run(
      record.id,
      propertyId,
      record.params.state,
      record.params.docType,
      record.params.district,
      record.params.taluka,
      record.params.village,
      record.params.surveyNo,
      record.params.khataNo || record.agentResult?.metadata?.khataNumber || null,
      record.agentResult?.metadata?.ownerName || record.params.ownerName || null,
      record.agentResult?.documentTitle || 'Certified Land Record',
      record.agentResult?.rawText || '',
      docHash,
      pdfStoragePath,
      JSON.stringify(record.agentResult || {}),
      JSON.stringify(record.proof || {}),
      record.mutationData ? JSON.stringify(record.mutationData) : null,
      record.index2Data ? JSON.stringify(record.index2Data) : null,
      record.riskAnalysis
        ? JSON.stringify(record.taxData ? { ...record.riskAnalysis, taxData: record.taxData } : record.riskAnalysis)
        : (record.taxData ? JSON.stringify({ taxData: record.taxData }) : null),
      JSON.stringify(record.params || {}),
      record.createdAt || now
    );

    // 3. Clear and Repopulate titleLineageRecords for this Property
    sqlite.prepare('DELETE FROM title_lineage_records WHERE property_id = ?').run(propertyId);

    const lineageStmt = sqlite.prepare(`
      INSERT INTO title_lineage_records (
        id, property_id, year, deed_type, transferor, transferee,
        doc_number, sro_office, consideration_inr, status,
        legacy_font, transcoded_utf8, notes, order_index, leaf_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (record.mutationData?.timeline && Array.isArray(record.mutationData.timeline)) {
      record.mutationData.timeline.forEach((item, idx) => {
        let transferor = item.parties || 'N/A';
        let transferee = item.parties || 'N/A';
        if (item.parties && item.parties.includes('->')) {
          const parts = item.parties.split('->');
          transferor = parts[0].trim();
          transferee = parts[1].trim();
        } else if (item.parties && item.parties.includes(' to ')) {
          const parts = item.parties.split(' to ');
          transferor = parts[0].trim();
          transferee = parts[1].trim();
        }

        lineageStmt.run(
          `lineage_${record.id}_${idx}`,
          propertyId,
          item.year || `${new Date().getFullYear()}`,
          item.type || 'Mutation Entry',
          transferor,
          transferee,
          item.ferfarNo || `${idx + 100}`,
          record.mutationData!.sroOffice || `SRO ${record.params.taluka}`,
          record.mutationData!.considerationAmount || '0',
          item.status === 'PRAMANIT' ? 'CLEAN' : (item.status === 'PENDING_NOTICE' ? 'WARNING' : 'BREACH'),
          item.typeMarathi || null,
          item.description || null,
          item.statusLabel || null,
          idx,
          blockchain.computeHash(`${item.ferfarNo}-${item.year}-${item.parties}`),
          record.createdAt || now
        );
      });
    } else if (record.index2Data) {
      lineageStmt.run(
        `lineage_${record.id}_deed`,
        propertyId,
        record.index2Data.regYear || `${new Date().getFullYear()}`,
        record.index2Data.documentType || 'Registered Deed',
        record.index2Data.executant?.name || 'Declared Landholder',
        record.index2Data.claimant?.name || 'Verified Transferee',
        record.index2Data.deedNo || '1',
        record.index2Data.sroOffice || `SRO ${record.params.taluka}`,
        record.index2Data.considerationAmount || '0',
        'CLEAN',
        record.index2Data.documentTypeMarathi || null,
        `Book ${record.index2Data.bookNo}, Vol ${record.index2Data.volumeNo}, Pages ${record.index2Data.pageNos}`,
        `Stamp Duty: ${record.index2Data.stampDutyPaid}, MV: ${record.index2Data.marketValue}`,
        0,
        blockchain.computeHash(`${record.index2Data.deedNo}-${record.index2Data.regYear}-${record.index2Data.executant?.name}`),
        record.createdAt || now
      );
    }
  });

  executeTx();
}

/**
 * Async wrapper for saveStoredRecord
 */
export async function saveRecord(record: StoredRecord): Promise<void> {
  saveStoredRecord(record);
}

/**
 * Delete a stored record and cascade to property & lineage
 */
export function deleteStoredRecord(id: string): boolean {
  try {
    const propertyId = `prop_${id.replace(/^rec-/, '')}`;
    sqlite.prepare('DELETE FROM records WHERE id = ?').run(id);
    sqlite.prepare('DELETE FROM properties WHERE id = ?').run(propertyId);
    return true;
  } catch (err) {
    console.error(`[RecordsRepository] Error deleting record ${id}:`, err);
    return false;
  }
}

/**
 * Backward-compatible RECORD_STORE Proxy conforming to Map<string, StoredRecord>
 */
export const RECORD_STORE = {
  get(id: string): StoredRecord | undefined {
    return getStoredRecord(id) || undefined;
  },
  set(id: string, record: StoredRecord): any {
    record.id = id;
    saveStoredRecord(record);
    return this;
  },
  has(id: string): boolean {
    return getStoredRecord(id) !== null;
  },
  values(): IterableIterator<StoredRecord> {
    return getAllStoredRecords()[Symbol.iterator]();
  },
  delete(id: string): boolean {
    return deleteStoredRecord(id);
  },
  get size(): number {
    return getAllStoredRecords().length;
  }
};
