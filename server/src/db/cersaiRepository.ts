import { sqlite } from './index';
import { CersaiCharge, NewCersaiCharge } from './schema';

export interface CersaiQueryParams {
  surveyNumber?: string;
  state?: string;
  district?: string;
  village?: string;
  borrowerName?: string;
  institution?: string;
  status?: string; // 'ALL' | 'ACTIVE' | 'SATISFIED'
  limit?: number;
  offset?: number;
}

export interface CersaiStats {
  totalCharges: number;
  activeCharges: number;
  satisfiedCharges: number;
  totalActiveAmountInr: number;
  totalSatisfiedAmountInr: number;
}

export class CersaiRepository {
  private static instance: CersaiRepository;

  public static getInstance(): CersaiRepository {
    if (!CersaiRepository.instance) {
      CersaiRepository.instance = new CersaiRepository();
    }
    return CersaiRepository.instance;
  }

  /**
   * Find charges for a specific survey number and jurisdiction
   */
  public findBySurvey(
    surveyNumber: string,
    state?: string,
    district?: string,
    village?: string
  ): CersaiCharge[] {
    const cleanSurvey = surveyNumber.trim();
    let query = `
      SELECT * FROM cersai_charges 
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

    query += ` ORDER BY creation_date DESC`;
    const rows = sqlite.prepare(query).all(...params) as any[];
    return rows.map(this.mapRowToCersaiCharge);
  }

  /**
   * Filtered search with pagination
   */
  public search(params: CersaiQueryParams): { charges: CersaiCharge[]; total: number } {
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (params.surveyNumber) {
      whereClauses.push(`(survey_number = ? OR survey_number LIKE ?)`);
      queryParams.push(params.surveyNumber.trim(), `%${params.surveyNumber.trim()}%`);
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
    if (params.borrowerName) {
      whereClauses.push(`LOWER(borrower_name) LIKE ?`);
      queryParams.push(`%${params.borrowerName.toLowerCase()}%`);
    }
    if (params.institution) {
      whereClauses.push(`LOWER(financial_institution) LIKE ?`);
      queryParams.push(`%${params.institution.toLowerCase()}%`);
    }
    if (params.status && params.status !== 'ALL') {
      whereClauses.push(`status = ?`);
      queryParams.push(params.status.toUpperCase());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRow = sqlite.prepare(`SELECT count(*) as count FROM cersai_charges ${whereSql}`).get(...queryParams) as { count: number };
    const total = countRow ? countRow.count : 0;

    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;
    const dataSql = `
      SELECT * FROM cersai_charges 
      ${whereSql} 
      ORDER BY creation_date DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = sqlite.prepare(dataSql).all(...queryParams, limit, offset) as any[];

    return {
      charges: rows.map(this.mapRowToCersaiCharge),
      total
    };
  }

  /**
   * Get macro encumbrance statistics
   */
  public getStats(): CersaiStats {
    const statsRow = sqlite.prepare(`
      SELECT 
        COUNT(*) as totalCharges,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as activeCharges,
        SUM(CASE WHEN status = 'SATISFIED' THEN 1 ELSE 0 END) as satisfiedCharges,
        SUM(CASE WHEN status = 'ACTIVE' THEN charge_amount_inr ELSE 0 END) as totalActiveAmountInr,
        SUM(CASE WHEN status = 'SATISFIED' THEN charge_amount_inr ELSE 0 END) as totalSatisfiedAmountInr
      FROM cersai_charges
    `).get() as any;

    return {
      totalCharges: statsRow?.totalCharges || 0,
      activeCharges: statsRow?.activeCharges || 0,
      satisfiedCharges: statsRow?.satisfiedCharges || 0,
      totalActiveAmountInr: statsRow?.totalActiveAmountInr || 0,
      totalSatisfiedAmountInr: statsRow?.totalSatisfiedAmountInr || 0,
    };
  }

  /**
   * Insert new CERSAI charge
   */
  public insert(charge: NewCersaiCharge): CersaiCharge {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO cersai_charges (
        id, cersai_security_interest_id, property_id, survey_number, state, district,
        taluka, village, borrower_name, financial_institution, branch_name, charge_amount_inr,
        charge_type, creation_date, satisfaction_date, status, roc_charge_id, filing_officer,
        remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      charge.id,
      charge.cersaiSecurityInterestId,
      charge.propertyId || null,
      charge.surveyNumber,
      charge.state.toUpperCase(),
      charge.district,
      charge.taluka || null,
      charge.village,
      charge.borrowerName,
      charge.financialInstitution,
      charge.branchName || null,
      charge.chargeAmountInr,
      charge.chargeType || 'EQUITABLE_MORTGAGE',
      charge.creationDate,
      charge.satisfactionDate || null,
      charge.status || 'ACTIVE',
      charge.rocChargeId || null,
      charge.filingOfficer || null,
      charge.remarks || null,
      charge.createdAt || now,
      charge.updatedAt || now
    );

    return this.findById(charge.id)!;
  }

  public findById(id: string): CersaiCharge | null {
    const row = sqlite.prepare(`SELECT * FROM cersai_charges WHERE id = ?`).get(id) as any;
    return row ? this.mapRowToCersaiCharge(row) : null;
  }

  public count(): number {
    const row = sqlite.prepare(`SELECT count(*) as count FROM cersai_charges`).get() as { count: number };
    return row ? row.count : 0;
  }

  private mapRowToCersaiCharge(row: any): CersaiCharge {
    return {
      id: row.id,
      cersaiSecurityInterestId: row.cersai_security_interest_id,
      propertyId: row.property_id,
      surveyNumber: row.survey_number,
      state: row.state,
      district: row.district,
      taluka: row.taluka,
      village: row.village,
      borrowerName: row.borrower_name,
      financialInstitution: row.financial_institution,
      branchName: row.branch_name,
      chargeAmountInr: Number(row.charge_amount_inr),
      chargeType: row.charge_type,
      creationDate: row.creation_date,
      satisfactionDate: row.satisfaction_date,
      status: row.status,
      rocChargeId: row.roc_charge_id,
      filingOfficer: row.filing_officer,
      remarks: row.remarks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
