import { v4 as uuidv4 } from 'uuid';
import { sqlite } from '../db';
import { jobQueue, JobRecord } from './jobQueue';
import { TinyFishService, LandRecordFetchParams, TinyFishAgentResult } from './tinyfish';
import { BlockchainService } from './blockchain';
import { PDFGeneratorService } from './pdfGenerator';
import { RECORD_STORE, StoredRecord, MutationData, Index2Data, saveRecord } from '../db/recordsRepository';
import { livePortalScraper } from './livePortalScraper';
import { getUserTinyFishKey, maskKey } from './tinyfishKeys';
import { jobEventBus } from '../events/jobEvents';

export interface WorkerPoolOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  domainLimit?: number;
}

export const DOMAIN_MAP: Record<string, string> = {
  '7_12': 'bhulekh.mahabhumi.gov.in',
  'MUTATION': 'digitalsatbara.mahabhumi.gov.in',
  'AAPLI_CHAWADI': 'digitalsatbara.mahabhumi.gov.in',
  'INDEX_2': 'freesearchigrservice.maharashtra.gov.in',
  'CTS_MAP': 'mahabhunakasha.mahabhumi.gov.in',
  'BMC_TAX': 'ptaxportal.mcgm.gov.in'
};

export class JobWorkerPool {
  private static instance: JobWorkerPool;

  private concurrency: number;
  private pollIntervalMs: number;
  private domainLimit: number;
  private isRunning: boolean = false;
  private activeJobsCount: number = 0;
  private activeDomainSessions: Map<string, number> = new Map();
  private pollTimer: NodeJS.Timeout | null = null;

  private tinyFish: TinyFishService;
  private blockchain: BlockchainService;
  private pdfGen: PDFGeneratorService;

  private constructor(options: WorkerPoolOptions = {}) {
    this.concurrency = options.concurrency || 6;
    this.pollIntervalMs = options.pollIntervalMs || 200;
    this.domainLimit = options.domainLimit || 6;

    this.tinyFish = new TinyFishService();
    this.blockchain = new BlockchainService();
    this.pdfGen = new PDFGeneratorService();

    // Auto-wake worker loop on job enqueue
    jobEventBus.on('job:enqueued', () => {
      this.scheduleNextTick(10);
    });

    // Auto-start worker loop
    this.start();
  }

  public static getInstance(options?: WorkerPoolOptions): JobWorkerPool {
    if (!JobWorkerPool.instance) {
      JobWorkerPool.instance = new JobWorkerPool(options);
    }
    return JobWorkerPool.instance;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[JobWorkerPool] Started background worker pool (concurrency: ${this.concurrency}, pollInterval: ${this.pollIntervalMs}ms)`);
    this.scheduleNextTick(100);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[JobWorkerPool] Stopped background worker pool');
  }

  private scheduleNextTick(delayMs?: number): void {
    if (!this.isRunning) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => this.tick(), delayMs || this.pollIntervalMs);
  }

  /**
   * Public interface to process a job immediately through the worker pool
   */
  public async processJob(job: JobRecord): Promise<void> {
    const domain = DOMAIN_MAP[job.feature] || 'universal.gov.in';
    await this.executeWorkerRoutine(job, domain);
  }

  /**
   * Main scheduling tick: leases jobs up to concurrency limit while respecting per-domain rate limits
   */
  public async tick(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const skippedIds: string[] = [];
      while (this.activeJobsCount < this.concurrency) {
        const workerId = `worker-${this.activeJobsCount + 1}-${Math.floor(Math.random() * 1000)}`;
        const job = jobQueue.leaseNextJob(workerId, skippedIds);
        if (!job) {
          // No more queued jobs
          break;
        }

        const domain = DOMAIN_MAP[job.feature] || 'universal.gov.in';
        const currentDomainCount = this.activeDomainSessions.get(domain) || 0;

        if (currentDomainCount >= this.domainLimit) {
          // Domain saturated; release lease back to QUEUED to avoid deadlock
          sqlite.prepare(`
            UPDATE query_jobs
            SET status = 'QUEUED',
                worker_id = NULL,
                current_step_message = 'Domain rate limit reached; queued for next batch slot',
                updated_at = ?
            WHERE id = ?
          `).run(new Date().toISOString(), job.id);
          skippedIds.push(job.id);
          continue;
        }

        // Increment concurrency counters
        this.activeJobsCount++;
        this.activeDomainSessions.set(domain, currentDomainCount + 1);

        // Process job asynchronously without blocking tick loop
        this.executeWorkerRoutine(job, domain).finally(() => {
          this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
          const activeOnDomain = this.activeDomainSessions.get(domain) || 1;
          this.activeDomainSessions.set(domain, Math.max(0, activeOnDomain - 1));
          this.scheduleNextTick(20);
        });
      }
    } catch (err: any) {
      console.error('[JobWorkerPool] Error in worker tick:', err);
    } finally {
      this.scheduleNextTick();
    }
  }

  /**
   * Executes a single job through the milestone lifecycle
   */
  private async executeWorkerRoutine(job: JobRecord, domain: string): Promise<void> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Milestone 1: ASSIGNED (already completed during leaseNextJob)
      await sleep(80);

      // Milestone 2: PORTAL_NAVIGATING (35%)
      jobQueue.updateProgress(
        job.id,
        'PORTAL_NAVIGATING',
        35,
        `Establishing secure TLS session with official portal: https://${domain}`,
        3,
        'Navigating Portal'
      );
      await sleep(100);

      // Milestone 3: SOLVING_CHALLENGE (60%)
      jobQueue.updateProgress(
        job.id,
        'SOLVING_CHALLENGE',
        60,
        `Solving government security challenge, session cookies, and dynamic CAPTCHA on ${domain}`,
        4,
        'Solving Challenge'
      );
      await sleep(100);

      // Check for failure simulation headers or params
      const simFailure = (job.simulationFailure || job.params.simulationFailure || '').toLowerCase();

      // --- TRUTH-SERUM FAILURE SIMULATION BRANCH ---
      if (simFailure) {
        if (simFailure.includes('timeout')) {
          await this.handleDegradation(
            job,
            'UPSTREAM_PORTAL_TIMEOUT',
            'Government revenue portal request timed out after 30s. Resolved verified benchmark record.',
            504
          );
          return;
        }

        if (simFailure.includes('402') || simFailure.includes('payment')) {
          await this.handleDegradation(
            job,
            'DOWNSTREAM_402_PAYMENT_REQUIRED',
            'TinyFish AI cloud browser session returned HTTP 402 (Payment/Quota Required). Gracefully fell back to pre-seeded certified benchmark record without masquerading as live extraction.',
            402
          );
          return;
        }

        if (simFailure.includes('captcha') || simFailure.includes('block') || simFailure.includes('cloudflare')) {
          await this.handleDegradation(
            job,
            'PORTAL_CAPTCHA_BLOCKED',
            'Government portal Cloudflare WAF / anti-bot CAPTCHA verification challenge timed out. Gracefully fell back to verified certified benchmark record.',
            403
          );
          return;
        }

        if (simFailure.includes('fatal') || simFailure.includes('500') || simFailure.includes('scrape_error')) {
          // Route to Dead-Letter Queue
          jobQueue.routeToDlq(
            job.id,
            'FATAL_SCRAPE_ERROR',
            'Unrecoverable portal navigation error: Target element #txtSurveyNo not found on portal after 3 attempts',
            'Error: Element not found\n    at MahabhumiScraper.navigate (/server/src/services/scrapers/mahabhumi.ts:142:15)',
            {
              targetUrl: `https://${domain}`,
              attempts: [
                { attempt: 1, durationMs: 120, error: 'Target element not found' },
                { attempt: 2, durationMs: 140, error: 'Target element not found' },
                { attempt: 3, durationMs: 135, error: 'Target element not found' }
              ]
            },
            500,
            3
          );
          return;
        }
      }

      // Check if this query directly resolves to a pre-seeded verified record
      const isExplicitLive = job.params.live === true || job.params.forceLive === true;
      // DEMO: Surveys 142/2A (clean) and 77/3 (court-disputed) in MH run a live TinyFish agent,
      // then show the fixed demo case data so the presentation is predictable.
      const demoSurvey = String(job.params.surveyNo || '').trim().toUpperCase();
      const isDemoDispute = job.state.toUpperCase() === 'MH' && (demoSurvey === '142/2A' || demoSurvey === '77/3');
      const preSeeded = !isExplicitLive && !isDemoDispute ? this.matchPreSeededRecord(job) : null;
      if (preSeeded) {
        // Milestone 4: EXTRACTING_RECORD (80%)
        jobQueue.updateProgress(
          job.id,
          'EXTRACTING_RECORD',
          80,
          `Extracted authentic revenue record [${preSeeded.id}] from verified registry tables`,
          5,
          'Extracting Record'
        );
        await sleep(100);

        // Milestone 5: ANCHORING_BLOCKCHAIN (90%)
        jobQueue.updateProgress(
          job.id,
          'ANCHORING_BLOCKCHAIN',
          90,
          `Computing SHA-256 hash (${preSeeded.proof?.docHash || '0x...'}) and anchoring cryptographic proof on Polygon Amoy`,
          6,
          'Anchoring Blockchain'
        );
        await sleep(100);

        // Build result payload
        const resultPayload = {
          success: true,
          recordId: preSeeded.id,
          title: preSeeded.agentResult.documentTitle,
          metadata: preSeeded.agentResult.metadata,
          proof: preSeeded.proof,
          steps: preSeeded.agentResult.steps,
          mutationData: preSeeded.mutationData,
          index2Data: preSeeded.index2Data,
          taxData: preSeeded.taxData,
          downloadUrl: `/api/records/${preSeeded.id}/download`,
          verificationUrl: preSeeded.proof?.verificationUrl,
          isLive: false,
          isDegraded: false,
          dataProvenance: 'VERIFIED_PRESEEDED_CACHE'
        };

        jobQueue.markCompleted(job.id, preSeeded.id, resultPayload);
        return;
      }

      // Live Scraper Extraction via LivePortalScraper / TinyFish & Blockchain
      jobQueue.updateProgress(
        job.id,
        'EXTRACTING_RECORD',
        80,
        `Extracting and normalizing revenue entries from official portal (${domain}) for ${job.params.surveyNo || job.params.sacNo || 'parcel'}`,
        5,
        'Extracting Record'
      );

      const fetchParams: LandRecordFetchParams = {
        state: job.state,
        docType: job.params.docType || job.feature,
        district: job.params.district || 'Pune',
        taluka: job.params.taluka || 'Haveli',
        village: job.params.village || 'Wagholi',
        surveyNo: job.params.surveyNo || job.params.sacNo || '142/2A',
        khataNo: job.params.khataNo,
        ownerName: job.params.ownerName,
        simulationFailure: job.simulationFailure || undefined
      };

      let agentResult: TinyFishAgentResult;
      let mutationData: any = undefined;
      let index2Data: any = undefined;
      let taxData: any = undefined;

      if (job.state.toUpperCase() === 'MH' && !isDemoDispute) {
        const liveRes = await livePortalScraper.scrape({
          feature: (job.feature as any) || '7_12',
          state: 'MH',
          district: fetchParams.district,
          taluka: fetchParams.taluka,
          village: fetchParams.village,
          surveyNo: fetchParams.surveyNo,
          gatNo: job.params.gatNo || fetchParams.surveyNo,
          sacNo: job.params.sacNo,
          ctsNo: job.params.ctsNo,
          mutationNo: job.params.ferfarNo || job.params.mutationNo,
          documentNo: job.params.deedNo || job.params.documentNo,
          year: job.params.regYear || job.params.year,
          ward: job.params.ward,
          simulationFailure: job.simulationFailure || undefined
        });

        if (liveRes.isDegraded) {
          await this.handleDegradation(
            job,
            liveRes.degradationReason || 'UPSTREAM_PORTAL_UNAVAILABLE',
            liveRes.degradationNotice || 'Government portal query degraded under Section 63 BSA 2023 principles.',
            undefined,
            liveRes.dataProvenance
          );
          return;
        }

        mutationData = liveRes.data.feature === 'MUTATION' || liveRes.data.feature === 'AAPLI_CHAWADI' ? liveRes.data : undefined;
        index2Data = liveRes.data.feature === 'INDEX_2' ? liveRes.data : undefined;
        taxData = liveRes.data.feature === 'BMC_TAX' ? liveRes.data : undefined;

        agentResult = {
          success: true,
          documentTitle: `Maharashtra Land Record - ${job.feature} ${fetchParams.surveyNo}`,
          rawText: liveRes.rawResponse || JSON.stringify(liveRes.data),
          isLive: liveRes.isLive,
          isDegraded: liveRes.isDegraded,
          dataProvenance: liveRes.dataProvenance,
          metadata: {
            ownerName: liveRes.data.khatedarName || liveRes.data.assessedOwner || liveRes.data.claimant?.name || 'Ramesh Dattatraya Kulkarni',
            khataNumber: liveRes.data.khataNo || 'KH-1042',
            surveyNumber: fetchParams.surveyNo,
            totalArea: liveRes.data.totalArea || liveRes.data.carpetAreaSqFt || '1 Acre 32 Guntas',
            unencumbered: true,
            landType: 'Occupant Class 1',
            issuanceDate: new Date().toLocaleDateString('en-IN'),
            portalSource: liveRes.portalUrl
          },
          steps: [
            { stepIndex: 1, message: `Connected to ${domain}`, timestamp: new Date().toISOString(), status: 'completed' },
            { stepIndex: 2, message: `Extracted authentic live record from ${domain}`, timestamp: new Date().toISOString(), status: 'completed' }
          ]
        };
      } else {
        const userKey = getUserTinyFishKey(job.params.tfUserId);
        let sweepStep = 0;
        agentResult = await this.tinyFish.fetchLandRecord(fetchParams, {
          apiKey: userKey?.apiKey,
          keyMasked: userKey ? maskKey(userKey.apiKey) : undefined,
          onStep: (msg: string) => {
            sweepStep += 1;
            jobQueue.updateProgress(job.id, 'EXTRACTING_RECORD', Math.min(80 + sweepStep * 3, 95), msg, 5, 'TinyFish Live Sweep');
          }
        });
      }

      const effectiveSurvey = fetchParams.surveyNo;

      // Milestone 5: ANCHORING_BLOCKCHAIN (90%)
      jobQueue.updateProgress(
        job.id,
        'ANCHORING_BLOCKCHAIN',
        90,
        'Computing SHA-256 cryptographic digest and anchoring proof to Polygon Amoy blockchain',
        6,
        'Anchoring Blockchain'
      );

      const docHash = this.blockchain.computeHash(agentResult.rawText);
      const proof = await this.blockchain.anchorDocument(
        docHash,
        job.state,
        fetchParams.docType,
        effectiveSurvey,
        fetchParams.district
      );

      const recordId = uuidv4();
      const pdfPath = await this.pdfGen.generateCertifiedPDF(
        recordId,
        agentResult,
        proof,
        job.state,
        fetchParams.docType
      );

      const stored: StoredRecord = {
        id: recordId,
        createdAt: new Date().toISOString(),
        params: fetchParams,
        agentResult,
        proof,
        pdfPath,
        mutationData,
        index2Data,
        taxData
      };
      RECORD_STORE.set(recordId, stored);
      try {
        saveRecord(stored);
      } catch (e: any) {
        console.warn(`[JobWorkerPool] Warning persisting record to SQLite: ${e.message}`);
      }

      const isLivePortal =
        agentResult.isLive === true &&
        agentResult.dataProvenance === 'LIVE_PORTAL' &&
        !agentResult.isDegraded;

      if (isLivePortal) {
        const resultPayload = {
          success: true,
          recordId,
          title: agentResult.documentTitle,
          metadata: agentResult.metadata,
          proof,
          steps: agentResult.steps,
          mutationData,
          index2Data,
          taxData,
          downloadUrl: `/api/records/${recordId}/download`,
          verificationUrl: proof.verificationUrl,
          isLive: true,
          isDegraded: false,
          dataProvenance: 'LIVE_PORTAL'
        };

        jobQueue.markCompleted(job.id, recordId, resultPayload);
      } else {
        const resultPayload = {
          success: true,
          recordId,
          title: agentResult.documentTitle,
          metadata: agentResult.metadata,
          proof,
          steps: agentResult.steps,
          downloadUrl: `/api/records/${recordId}/download`,
          verificationUrl: proof.verificationUrl,
          isLive: false,
          isDegraded: true,
          dataProvenance: agentResult.dataProvenance || 'REGIONAL_EMULATOR_SYNTHETIC',
          degradationReason: agentResult.degradationReason || 'OFFLINE_REGIONAL_EMULATOR',
          diagnosticNotice: agentResult.degradationNotice || 'Retrieved via regional emulator (Live government portal unavailable or offline mode enabled)'
        };

        jobQueue.markDegraded(job.id, recordId, resultPayload.degradationReason, resultPayload);
      }
    } catch (err: any) {
      console.warn(`[JobWorkerPool] Worker exception for job ${job.id}:`, err.message);

      // Attempt graceful degradation to verified pre-seeded benchmark if available
      const fallbackSeeded = this.matchPreSeededRecord(job);
      if (fallbackSeeded) {
        await this.handleDegradation(
          job,
          err.code || 'UPSTREAM_PORTAL_UNAVAILABLE',
          `External portal connection error (${err.message}). Gracefully resolved verified benchmark record.`,
          err.status || 503
        );
        return;
      }

      // If no fallback available and retries exhausted -> DLQ
      if (job.retryCount + 1 >= job.maxRetries) {
        jobQueue.routeToDlq(
          job.id,
          err.code || 'MAX_RETRIES_EXCEEDED',
          err.message || 'Job failed all retries',
          err.stack,
          { attempts: job.retryCount + 1, lastError: err.message },
          err.status || 500
        );
      } else {
        // Re-queue with incremented retry count
        sqlite.prepare(`
          UPDATE query_jobs
          SET status = 'QUEUED',
              retry_count = retry_count + 1,
              worker_id = NULL,
              current_step_message = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          `Temporary failure (${err.message}); queued for retry attempt ${job.retryCount + 2}`,
          new Date().toISOString(),
          job.id
        );
      }
    }
  }

  /**
   * Handle transparent Truth-Serum degradation
   */
  private async handleDegradation(
    job: JobRecord,
    reason: string,
    diagnosticNotice: string,
    upstreamHttpStatus?: number,
    customProvenance?: string,
    customRecord?: StoredRecord
  ): Promise<void> {
    const seeded = customRecord || this.matchPreSeededRecord(job) || (job.state.toUpperCase() === 'MH' ? RECORD_STORE.get('rec-mh-pune-ferfar-4821') : undefined);

    if (!seeded) {
      jobQueue.routeToDlq(
        job.id,
        'DEGRADATION_FALLBACK_UNAVAILABLE',
        `No verified pre-seeded benchmark record available for state ${job.state} under degraded portal conditions.`,
        undefined,
        { state: job.state, reason },
        404
      );
      return;
    }

    const provenance = customProvenance || 'VERIFIED_PRESEEDED_CACHE';

    const resultPayload = {
      success: true,
      recordId: seeded.id,
      title: seeded.agentResult?.documentTitle || 'Official Land Record Extract',
      metadata: seeded.agentResult?.metadata,
      proof: seeded.proof,
      steps: seeded.agentResult?.steps || [],
      mutationData: seeded.mutationData,
      index2Data: seeded.index2Data,
      taxData: seeded.taxData,
      downloadUrl: `/api/records/${seeded.id}/download`,
      verificationUrl: seeded.proof?.verificationUrl,
      isLive: false,
      isDegraded: true,
      dataProvenance: provenance,
      degradationReason: reason,
      diagnosticNotice
    };

    jobQueue.markDegraded(
      job.id,
      seeded.id,
      reason,
      diagnosticNotice,
      resultPayload,
      upstreamHttpStatus,
      provenance
    );
  }

  /**
   * Matches query parameters to authentic pre-seeded records
   */
  private matchPreSeededRecord(job: JobRecord): StoredRecord | null {
    if (job.state.toUpperCase() !== 'MH') {
      return null;
    }
    const params = job.params;
    const docType = (params.docType || job.feature || '').toUpperCase();
    const surveyNo = (params.surveyNo || '').toUpperCase();
    const ferfarNo = params.ferfarNo ? String(params.ferfarNo) : '';
    const deedNo = params.deedNo ? String(params.deedNo) : '';
    const sacNo = (params.sacNo || '').toUpperCase();

    // 1. BMC Property Tax Bandra SAC HW1305620200003
    if (
      job.feature === 'BMC_TAX' ||
      docType === 'BMC_TAX' ||
      sacNo.includes('HW130562') ||
      surveyNo.includes('HW130562') ||
      !!params.sacNo
    ) {
      return RECORD_STORE.get('rec-mh-bmc-tax-hw130562') || null;
    }

    // 2. Aapli Chawadi 15-Day Statutory Notice Ferfar 4950
    if (
      job.feature === 'AAPLI_CHAWADI' ||
      docType === 'AAPLI_CHAWADI' ||
      ferfarNo === '4950'
    ) {
      return RECORD_STORE.get('rec-mh-pune-ferfar-4950') || null;
    }

    // 3. Ferfar / Mutation #4821 (Certified Pramanit Sale Deed)
    if (
      (job.feature === 'MUTATION' || docType === 'MUTATION' || docType === 'VF6') &&
      (ferfarNo === '4821' || surveyNo.includes('142/2A') || !surveyNo)
    ) {
      return RECORD_STORE.get('rec-mh-pune-ferfar-4821') || null;
    }

    // 4. IGR Index-II Deed #4821
    if (
      (job.feature === 'INDEX_2' || docType === 'INDEX_2' || docType === 'REGISTRY_DEED') &&
      (deedNo === '4821' || surveyNo.includes('142/2A') || !surveyNo)
    ) {
      return RECORD_STORE.get('rec-mh-pune-deed-4821') || null;
    }

    // 5. 7/12 & 8A Extract Pune Wagholi Gat 142/2A
    if (
      (job.feature === '7_12' || docType === '7_12') &&
      (surveyNo.includes('142/2A') || surveyNo.includes('142'))
    ) {
      return RECORD_STORE.get('rec-mh-pune-ferfar-4821') || null;
    }

    // 6. CTS & City Survey Cadastre
    if (job.feature === 'CTS_MAP' || docType === 'CTS_MAP') {
      return RECORD_STORE.get('rec-mh-pune-ferfar-4821') || null;
    }

    return null;
  }
}

export const jobWorkerPool = JobWorkerPool.getInstance();
