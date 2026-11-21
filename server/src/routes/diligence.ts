import { Router, Request, Response } from 'express';
import { CersaiRepository } from '../db/cersaiRepository';
import { CourtCasesRepository } from '../db/courtCasesRepository';
import { EncumbranceEventsRepository } from '../db/encumbranceEventsRepository';
import { EncumbranceEventDispatcher } from '../events/encumbranceEventDispatcher';

export const diligenceRouter = Router();

const cersaiRepo = CersaiRepository.getInstance();
const courtRepo = CourtCasesRepository.getInstance();
const eventsRepo = EncumbranceEventsRepository.getInstance();
const dispatcher = EncumbranceEventDispatcher.getInstance();

/**
 * GET /api/diligence/stats
 * Macro encumbrance & litigation KPI indicators for data apps/dashboards
 */
diligenceRouter.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cersaiStats = cersaiRepo.getStats();
    const courtStats = courtRepo.getStats();

    res.json({
      success: true,
      data: {
        cersai: cersaiStats,
        court: courtStats,
        summary: {
          totalEncumbrancesTracked: cersaiStats.totalCharges + courtStats.totalCases,
          criticalRiskAssets: cersaiStats.activeCharges + courtStats.activeStays,
          activeDebtExposureInr: cersaiStats.totalActiveAmountInr,
          activeDebtExposureCr: (cersaiStats.totalActiveAmountInr / 10000000).toFixed(2),
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch diligence stats' });
  }
});

/**
 * GET /api/diligence/cersai
 * Query CERSAI institutional security charges
 */
diligenceRouter.get('/cersai', async (req: Request, res: Response): Promise<void> => {
  try {
    const { surveyNumber, state, district, village, borrowerName, institution, status, limit, offset } = req.query;

    const result = cersaiRepo.search({
      surveyNumber: surveyNumber as string,
      state: state as string,
      district: district as string,
      village: village as string,
      borrowerName: borrowerName as string,
      institution: institution as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      success: true,
      total: result.total,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      charges: result.charges
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to search CERSAI charges' });
  }
});

/**
 * GET /api/diligence/court-cases
 * Query e-Courts NJDG litigation records
 */
diligenceRouter.get('/court-cases', async (req: Request, res: Response): Promise<void> => {
  try {
    const { surveyNumber, cnrNumber, state, district, village, partyName, disputeCategory, stayOnly, status, limit, offset } = req.query;

    const result = courtRepo.search({
      surveyNumber: surveyNumber as string,
      cnrNumber: cnrNumber as string,
      state: state as string,
      district: district as string,
      village: village as string,
      partyName: partyName as string,
      disputeCategory: disputeCategory as string,
      stayOnly: stayOnly === 'true' || stayOnly === '1',
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      success: true,
      total: result.total,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      cases: result.cases
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to search court cases' });
  }
});

/**
 * GET /api/diligence/check
 * Unified property encumbrance audit: queries both CERSAI & e-Courts by survey number
 * Emits event-driven lifecycle domain events to audit store.
 */
diligenceRouter.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const surveyNumber = (req.query.surveyNumber as string || req.query.survey as string || '').trim();
    const state = ((req.query.state as string) || 'MH').toUpperCase();
    const district = req.query.district as string;
    const village = req.query.village as string;

    if (!surveyNumber) {
      res.status(400).json({ success: false, error: "Missing required parameter 'surveyNumber'" });
      return;
    }

    // 1. Emit CersaiSearchInitiated domain event
    await dispatcher.emitSearchInitiated(
      surveyNumber,
      state,
      {
        query: surveyNumber,
        state,
        district,
        village,
        initiatedBy: (req as any).user?.email || 'AnonymousAuditor'
      },
      district,
      village
    );

    // 2. Query CERSAI institutional mortgage database
    const allCharges = cersaiRepo.findBySurvey(surveyNumber, state, district, village);
    const activeCharges = allCharges.filter((c) => c.status === 'ACTIVE');
    const satisfiedCharges = allCharges.filter((c) => c.status === 'SATISFIED');
    const totalActiveDebtInr = activeCharges.reduce((sum, c) => sum + c.chargeAmountInr, 0);

    // Emit domain events for identified active charges
    for (const chg of activeCharges) {
      await dispatcher.emitChargeIdentified(
        surveyNumber,
        state,
        {
          cersaiSecurityInterestId: chg.cersaiSecurityInterestId,
          financialInstitution: chg.financialInstitution,
          chargeAmountInr: chg.chargeAmountInr,
          chargeType: chg.chargeType,
          creationDate: chg.creationDate,
          status: chg.status
        },
        district,
        village
      );
    }

    // 3. Query e-Courts NJDG litigation database
    const allCases = courtRepo.findBySurvey(surveyNumber, state, district, village);
    const activeStayCases = allCases.filter((c) => c.stayOrderActive);

    // Emit domain events for court cases
    for (const cs of allCases) {
      await dispatcher.emitCourtCaseQueried(
        surveyNumber,
        state,
        {
          cnrNumber: cs.cnrNumber,
          courtName: cs.courtName,
          caseType: cs.caseType,
          disputeCategory: cs.disputeCategory,
          petitioner: cs.petitioner,
          respondent: cs.respondent,
          stayOrderActive: cs.stayOrderActive
        },
        district,
        village
      );

      if (cs.stayOrderActive) {
        await dispatcher.emitLisPendensDetected(
          surveyNumber,
          state,
          {
            cnrNumber: cs.cnrNumber,
            courtName: cs.courtName,
            caseNumber: cs.caseNumber,
            disputeCategory: cs.disputeCategory,
            stayOrderDetails: cs.stayOrderDetails || 'Active Injunction under Order XXXIX CPC',
            statutoryBasis: 'Section 52 Transfer of Property Act, 1882 (Lis Pendens)'
          },
          district,
          village
        );
      }
    }

    // 4. Deterministic Diligence Assessment
    const hasStay = activeStayCases.length > 0;
    const hasActiveMortgage = activeCharges.length > 0;
    const hardVetoTripped = hasStay;
    let hardVetoReason: string | null = null;

    if (hasStay) {
      const topStay = activeStayCases[0];
      hardVetoReason = `Active Lis Pendens court injunction detected (${topStay.courtName}, CNR: ${topStay.cnrNumber}). Title transfer clouded under Section 52 Transfer of Property Act.`;
    }

    let overallStatus: 'CLEAN' | 'ENCUMBERED' | 'DISPUTED' = 'CLEAN';
    let suggestedScore = 95;

    if (hasStay) {
      overallStatus = 'DISPUTED';
      suggestedScore = 0; // Collapses strictly to 0 under Multiplicative Zero Guarantee
    } else if (hasActiveMortgage) {
      overallStatus = 'ENCUMBERED';
      suggestedScore = Math.max(40, 90 - activeCharges.length * 20);
    } else if (satisfiedCharges.length > 0 || allCases.length > 0) {
      suggestedScore = 88;
    }

    // 5. Emit TitleEncumbranceAggregated domain event
    await dispatcher.emitTitleAggregated(
      surveyNumber,
      state,
      {
        surveyNumber,
        state,
        district,
        activeMortgageCount: activeCharges.length,
        totalActiveDebtInr,
        satisfiedMortgageCount: satisfiedCharges.length,
        activeLitigationCount: allCases.length,
        injunctionStayCount: activeStayCases.length,
        overallEncumbranceStatus: overallStatus,
        hardVetoTripped,
        hardVetoReason: hardVetoReason || undefined
      },
      district,
      village
    );

    res.json({
      success: true,
      surveyNumber,
      state,
      district,
      village,
      diligence: {
        overallStatus,
        suggestedTitleScore: suggestedScore,
        hardVetoTripped,
        hardVetoReason,
        metrics: {
          activeMortgageCount: activeCharges.length,
          satisfiedMortgageCount: satisfiedCharges.length,
          totalActiveDebtInr,
          totalActiveDebtLakhs: (totalActiveDebtInr / 100000).toFixed(2),
          litigationCaseCount: allCases.length,
          activeStayCount: activeStayCases.length
        },
        cersai: {
          active: activeCharges,
          satisfied: satisfiedCharges
        },
        litigation: {
          cases: allCases,
          injunctions: activeStayCases
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Diligence check failed' });
  }
});

/**
 * GET /api/diligence/events
 * Audit trail of encumbrance events
 */
diligenceRouter.get('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const aggregateId = req.query.surveyNumber as string || req.query.aggregateId as string;

    const events = aggregateId
      ? eventsRepo.findByAggregateId(aggregateId)
      : eventsRepo.findRecent(limit);

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch encumbrance events' });
  }
});
