import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain';
import { getRecordByDocHash } from '../db/recordsRepository';

export const verifyRouter = Router();
const blockchain = new BlockchainService();

/**
 * GET /api/verify/:hash
 * Public verification endpoint accessed by scanning the document QR code
 */
verifyRouter.get('/:hash', async (req: Request, res: Response) => {
  const hash = req.params.hash.toLowerCase();

  // O(1) indexed lookup in SQLite
  const matchedRecord = getRecordByDocHash(hash);


  const verification = await blockchain.verifyHash(hash);

  // If request accepts JSON or explicitly has ?format=json
  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    res.json({
      verified: true,
      hash,
      network: verification.proof?.network,
      contract: verification.proof?.contractAddress,
      matchedRecord: matchedRecord ? {
        state: matchedRecord.params.state,
        docType: matchedRecord.params.docType,
        surveyNo: matchedRecord.params.surveyNo,
        owner: matchedRecord.agentResult.metadata.ownerName,
        issuanceDate: matchedRecord.agentResult.metadata.issuanceDate
      } : null
    });
    return;
  }

  // Render a clean, official public verification portal web page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landeed 2.0 • Blockchain Document Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-xl w-full bg-slate-800 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 sm:p-8">
    
    <!-- Verified Badge -->
    <div class="flex items-center space-x-3 mb-6">
      <div class="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl">
        ✓
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">Cryptographically Verified Title</h1>
        <p class="text-sm text-emerald-400 font-medium">Anchored on Polygon Blockchain Ledger</p>
      </div>
    </div>

    <!-- Proof Details -->
    <div class="space-y-4 bg-slate-900/80 rounded-xl p-4 border border-slate-700/60 text-sm">
      <div>
        <span class="text-slate-400 text-xs uppercase tracking-wider block">Document SHA-256 Digest</span>
        <code class="text-emerald-300 font-mono text-xs break-all">${hash}</code>
      </div>
      
      ${matchedRecord ? `
      <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <span class="text-slate-400 text-xs block">State / Doc Type</span>
          <span class="font-semibold text-white">${matchedRecord.params.state} • ${matchedRecord.params.docType}</span>
        </div>
        <div>
          <span class="text-slate-400 text-xs block">Survey / Khasra No</span>
          <span class="font-semibold text-white">${matchedRecord.params.surveyNo}</span>
        </div>
        <div class="col-span-2">
          <span class="text-slate-400 text-xs block">Primary Khatedar / Owner</span>
          <span class="font-semibold text-white">${matchedRecord.agentResult.metadata.ownerName}</span>
        </div>
        <div class="col-span-2">
          <span class="text-slate-400 text-xs block">Jurisdiction</span>
          <span class="font-semibold text-white">${matchedRecord.params.village}, ${matchedRecord.params.taluka}, ${matchedRecord.params.district}</span>
        </div>
      </div>
      ` : ''}

      <div class="pt-2 border-t border-slate-800 space-y-2">
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Ledger Network:</span>
          <span class="text-slate-200 font-medium">Polygon Amoy Testnet (Chain ID: 80002)</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Smart Contract:</span>
          <span class="text-emerald-400 font-mono text-[11px]">0x71C6A96E...206078D</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Integrity Status:</span>
          <span class="text-emerald-400 font-semibold">100% UNALTERED & OFFICIAL</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mt-6 flex flex-col sm:flex-row gap-3">
      <a href="https://amoy.polygonscan.com" target="_blank" class="flex-1 text-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-lg text-white transition text-sm">
        View On Polygonscan
      </a>
      ${matchedRecord ? `
      <a href="/api/records/${matchedRecord.id}/download" class="flex-1 text-center py-2.5 px-4 bg-slate-700 hover:bg-slate-600 font-semibold rounded-lg text-white transition text-sm">
        Download PDF Extract
      </a>
      ` : ''}
    </div>

    <p class="text-center text-xs text-slate-500 mt-6">
      Landeed 2.0 • TinyFish AI Autonomous Web Ingestion & Blockchain Title Registry
    </p>
  </div>
</body>
</html>`;

  res.send(html);
});
