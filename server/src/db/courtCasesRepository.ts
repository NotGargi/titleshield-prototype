import { sqlite } from './index';
import { CourtCase, NewCourtCase } from './schema';

export interface CourtCaseQueryParams {
  surveyNumber?: string;
  cnrNumber?: string;
  state?: string;
  district?: string;
  village?: string;
  partyName?: string;
  caseType?: string;
  disputeCategory?: string;
  stayOnly?: boolean;
  status?: string; // 'ALL' | 'PENDING' | 'STAY_GRANTED' | 'DISPOSED'
  limit?: number;
  offset?: number;
}

export interface CourtCaseStats {
  totalCases: number;
  pendingCases: number;
  activeStays: number;
  disposedCases: number;
  partitionSuits: number;
  titleDisputes: number;
}

export class CourtCasesRepository {
  private static instance: CourtCasesRepository;

  public static getInstance(): CourtCasesRepository {
    if (!CourtCasesRepository.instance) {
      CourtCasesRepository.instance = new CourtCasesRepository();
    }
    return CourtCasesRepository.instance;
  }

  /**
   * Find court cases attached to a specific survey number
   */
  public findBySurvey(
    surveyNumber: string,
    state?: string,
    district?: string,
    village?: string
  ): CourtCase[] {
    const cleanSurvey = surveyNumber.trim();
    let query = `
      SELECT * FROM court_cases 
      WHERE (survey_number = ? OR survey_number LIKE ?)
    `;
    const params: any[] = [cleanSurvey, `${cleanSurvey}%`];

    if (state) {
      query += ` AND UPPER(state) = ?`;
      params.push(state.toUpperCase());
    }
    if (district) {
      query += ` AND LOWER(district) = ?`;
      params.push(district.toLowerCase());
    }
    if (village) {
      query += ` AND LOWER(village) = ?`;
      params.push(village.toLowerCase());
    }

    query += ` ORDER BY stay_order_active DESC, filing_date DESC`;
    const rows = sqlite.prepare(query).all(...params) as any[];
    return rows.map(this.mapRowToCourtCase);
  }

  /**
   * Look up case by CNR number
   */
  public findByCnr(cnrNumber: string): CourtCase | null {
    const row = sqlite.prepare(`SELECT * FROM court_cases WHERE UPPER(cnr_number) = ?`).get(cnrNumber.trim().toUpperCase()) as any;
    return row ? this.mapRowToCourtCase(row) : null;
  }

  /**
   * Filtered search with pagination
   */
  public search(params: CourtCaseQueryParams): { cases: CourtCase[]; total: number } {
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (params.surveyNumber) {
      whereClauses.push(`(survey_number = ? OR survey_number LIKE ?)`);
      queryParams.push(params.surveyNumber.trim(), `%${params.surveyNumber.trim()}%`);
    }
    if (params.cnrNumber) {
      whereClauses.push(`UPPER(cnr_number) LIKE ?`);
      queryParams.push(`%${params.cnrNumber.trim().toUpperCase()}%`);
    }
    if (params.state) {
      whereClauses.push(`UPPER(state) = ?`);
      queryParams.push(params.state.toUpperCase());
    }
    if (params.district) {
      whereClauses.push(`LOWER(district) = ?`);
      queryParams.push(params.district.toLowerCase());
    }
    if (params.village) {
      whereClauses.push(`LOWER(village) = ?`);
      queryParams.push(params.village.toLowerCase());
    }
    if (params.partyName) {
      whereClauses.push(`(LOWER(petitioner) LIKE ? OR LOWER(respondent) LIKE ?)`);
      const party = `%${params.partyName.toLowerCase()}%`;
      queryParams.push(party, party);
    }
    if (params.disputeCategory && params.disputeCategory !== 'ALL') {
      whereClauses.push(`dispute_category = ?`);
      queryParams.push(params.disputeCategory);
    }
    if (params.stayOnly) {
      whereClauses.push(`stay_order_active = 1`);
    }
    if (params.status && params.status !== 'ALL') {
      whereClauses.push(`case_status = ?`);
      queryParams.push(params.status.toUpperCase());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRow = sqlite.prepare(`SELECT count(*) as count FROM court_cases ${whereSql}`).get(...queryParams) as { count: number };
    const total = countRow ? countRow.count : 0;

    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;
    const dataSql = `
      SELECT * FROM court_cases 
      ${whereSql} 
      ORDER BY stay_order_active DESC, filing_date DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = sqlite.prepare(dataSql).all(...queryParams, limit, offset) as any[];

    return {
      cases: rows.map(this.mapRowToCourtCase),
      total
    };
  }

  /**
   * High-level litigation statistics
   */
  public getStats(): CourtCaseStats {
    const statsRow = sqlite.prepare(`
      SELECT 
        COUNT(*) as totalCases,
        SUM(CASE WHEN case_status = 'PENDING' OR case_status = 'STAY_GRANTED' THEN 1 ELSE 0 END) as pendingCases,
        SUM(CASE WHEN stay_order_active = 1 THEN 1 ELSE 0 END) as activeStays,
        SUM(CASE WHEN case_status = 'DISPOSED' THEN 1 ELSE 0 END) as disposedCases,
        SUM(CASE WHEN dispute_category = 'PARTITION_SUIT' THEN 1 ELSE 0 END) as partitionSuits,
        SUM(CASE WHEN dispute_category = 'TITLE_DISPUTE' THEN 1 ELSE 0 END) as titleDisputes
      FROM court_cases
    `).get() as any;

    return {
      totalCases: statsRow?.totalCases || 0,
      pendingCases: statsRow?.pendingCases || 0,
      activeStays: statsRow?.activeStays || 0,
      disposedCases: statsRow?.disposedCases || 0,
      partitionSuits: statsRow?.partitionSuits || 0,
      titleDisputes: statsRow?.titleDisputes || 0,
    };
  }

  /**
   * Insert new Court Case record
   */
  public insert(c: NewCourtCase): CourtCase {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO court_cases (
        id, cnr_number, property_id, survey_number, state, district, taluka, village,
        court_name, case_type, case_number, filing_year, filing_date, petitioner, respondent,
        petitioner_advocate, respondent_advocate, dispute_category, prayer_summary,
        stay_order_active, stay_order_details, case_status, stage_of_case, next_hearing_date,
        raw_metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      c.id,
      c.cnrNumber.toUpperCase(),
      c.propertyId || null,
      c.surveyNumber,
      c.state.toUpperCase(),
      c.district,
      c.taluka || null,
      c.village,
      c.courtName,
      c.caseType,
      c.caseNumber,
      c.filingYear,
      c.filingDate,
      c.petitioner,
      c.respondent,
      c.petitionerAdvocate || null,
      c.respondentAdvocate || null,
      c.disputeCategory,
      c.prayerSummary,
      c.stayOrderActive ? 1 : 0,
      c.stayOrderDetails || null,
      c.caseStatus || 'PENDING',
      c.stageOfCase || null,
      c.nextHearingDate || null,
      c.rawMetadata || null,
      c.createdAt || now,
      c.updatedAt || now
    );

    return this.findById(c.id)!;
  }

  public findById(id: string): CourtCase | null {
    const row = sqlite.prepare(`SELECT * FROM court_cases WHERE id = ?`).get(id) as any;
    return row ? this.mapRowToCourtCase(row) : null;
  }

  public count(): number {
    const row = sqlite.prepare(`SELECT count(*) as count FROM court_cases`).get() as { count: number };
    return row ? row.count : 0;
  }

  private mapRowToCourtCase(row: any): CourtCase {
    return {
      id: row.id,
      cnrNumber: row.cnr_number,
      propertyId: row.property_id,
      surveyNumber: row.survey_number,
      state: row.state,
      district: row.district,
      taluka: row.taluka,
      village: row.village,
      courtName: row.court_name,
      caseType: row.case_type,
      caseNumber: row.case_number,
      filingYear: row.filing_year,
      filingDate: row.filing_date,
      petitioner: row.petitioner,
      respondent: row.respondent,
      petitionerAdvocate: row.petitioner_advocate,
      respondentAdvocate: row.respondent_advocate,
      disputeCategory: row.dispute_category,
      prayerSummary: row.prayer_summary,
      stayOrderActive: Boolean(row.stay_order_active),
      stayOrderDetails: row.stay_order_details,
      caseStatus: row.case_status,
      stageOfCase: row.stage_of_case,
      nextHearingDate: row.next_hearing_date,
      rawMetadata: row.raw_metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
