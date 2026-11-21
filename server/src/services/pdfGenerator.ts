import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { BlockchainAnchorProof } from './blockchain';
import { TinyFishAgentResult } from './tinyfish';

export interface MutationPDFData {
  ferfarNo: string;
  entryDate: string;
  status: string; // 'PRAMANIT' | 'PENDING_NOTICE' | 'DISPUTED'
  statusLabel: string;
  mutationType: string;
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
  noticeDetails: {
    noticeDate: string;
    noticeDisplayedAt: string;
    objectionDeadline: string;
    objectionStatus: string;
    certifyingOfficer: string;
    orderNo: string;
    orderDate: string;
  };
}

export interface Index2PDFData {
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

export class PDFGeneratorService {
  private static storageDir: string = path.resolve(__dirname, '../../data/pdfs');

  /**
   * Returns the absolute path of the PDF storage directory, creating it recursively if needed.
   */
  public static getStorageDir(): string {
    const dir = process.env.PDF_STORAGE_DIR
      ? path.resolve(process.env.PDF_STORAGE_DIR)
      : PDFGeneratorService.storageDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Resolves any recordId or relative/absolute path to the canonical absolute path in server/data/pdfs.
   */
  public static getPdfAbsolutePath(recordIdOrPath: string): string {
    if (path.isAbsolute(recordIdOrPath) && fs.existsSync(recordIdOrPath)) {
      return recordIdOrPath;
    }
    const filename = path.basename(recordIdOrPath).endsWith('.pdf')
      ? path.basename(recordIdOrPath)
      : `${recordIdOrPath}.pdf`;
    return path.join(PDFGeneratorService.getStorageDir(), filename);
  }

  /**
   * Returns the canonical database relative path: data/pdfs/{recordId}.pdf
   */
  public static getRelativePdfPath(recordId: string): string {
    const cleanId = recordId.endsWith('.pdf') ? recordId.slice(0, -4) : recordId;
    return `data/pdfs/${cleanId}.pdf`;
  }

  /**
   * Reads a generated PDF into memory as a Buffer (for tests or verification tools).
   */
  public async readPdfBuffer(recordIdOrPath: string): Promise<Buffer> {
    const absPath = PDFGeneratorService.getPdfAbsolutePath(recordIdOrPath);
    return fs.promises.readFile(absPath);
  }

  /**
   * Generates a tamper-evident certified land record PDF and streams it directly to disk:
   * server/data/pdfs/${recordId}.pdf
   * Returns the relative path for database persistence.
   */
  public async generateCertifiedPDF(
    recordId: string,
    recordData: TinyFishAgentResult,
    proof: BlockchainAnchorProof,
    stateCode: string,
    docType: string
  ): Promise<string> {
    const absolutePath = PDFGeneratorService.getPdfAbsolutePath(recordId);
    const relativePath = PDFGeneratorService.getRelativePdfPath(recordId);

    const qrDataUrl = await QRCode.toDataURL(proof.verificationUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(absolutePath);

      let hasError = false;
      const onError = (err: Error) => {
        if (!hasError) {
          hasError = true;
          writeStream.destroy();
          fs.unlink(absolutePath, () => {});
          reject(err);
        }
      };

      doc.on('error', onError);
      writeStream.on('error', onError);
      writeStream.on('finish', () => {
        if (!hasError) {
          resolve(relativePath);
        }
      });

      doc.pipe(writeStream);

      // --- Background Watermark ---
      doc.save();
      doc.rotate(-45, { origin: [300, 420] });
      doc.fontSize(36);
      doc.fillColor('#e2e8f0', 0.45);
      doc.text('BLOCKCHAIN VERIFIED  •  LANDEED 2.0', 40, 400, { align: 'center' });
      doc.restore();

      // --- Header Banner ---
      doc.rect(40, 40, 515, 60).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).text('CERTIFIED DIGITAL LAND RECORD EXTRACT', 50, 52, { align: 'center' });
      doc.fontSize(10).fillColor('#94a3b8').text(`ISSUED VIA TINYFISH AI AUTOMATION  •  ${proof.network.toUpperCase()}`, 50, 74, { align: 'center' });

      // --- Document Meta Ribbon ---
      doc.moveDown(2);
      doc.rect(40, 110, 515, 24).fill('#f1f5f9');
      doc.fillColor('#1e293b').fontSize(9).text(`STATE: ${stateCode}    |    DOCUMENT TYPE: ${docType}    |    DATE: ${recordData.metadata.issuanceDate}`, 50, 117);

      // --- Primary Land Information Table ---
      let y = 145;
      const drawRow = (label: string, value: string, isAlt = false) => {
        if (isAlt) {
          doc.rect(40, y - 2, 515, 22).fill('#f8fafc');
        }
        doc.fillColor('#475569').fontSize(10).text(label, 50, y);
        doc.fillColor('#0f172a').fontSize(10).text(value, 230, y);
        y += 24;
      };

      drawRow('Primary Khatedar / Owner:', recordData.metadata.ownerName, true);
      drawRow('Survey / Khasra Number:', recordData.metadata.surveyNumber, false);
      drawRow('Khata / Account Number:', recordData.metadata.khataNumber, true);
      drawRow('Total Land Area:', recordData.metadata.totalArea, false);
      drawRow('Classification / Type:', recordData.metadata.landType, true);
      drawRow('Encumbrance Status:', recordData.metadata.unencumbered ? 'Clear (No Active Mortgages / Liens)' : 'Encumbered', false);
      drawRow('Official Portal Source:', recordData.metadata.portalSource, true);

      // --- Raw Record Abstract ---
      y += 10;
      doc.rect(40, y, 515, 110).stroke('#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).text('OFFICIAL RECORD TRANSCRIPT (EXTRACTED VIA TINYFISH)', 50, y + 8);
      doc.fontSize(8.5).fillColor('#334155').text(recordData.rawText, 50, y + 26, {
        width: 495,
        lineGap: 3
      });

      // --- Blockchain Verification Box ---
      y += 130;
      doc.rect(40, y, 515, 170).fillAndStroke('#f0fdf4', '#86efac');
      doc.fillColor('#166534').fontSize(12).text('🛡️ ON-CHAIN CRYPTOGRAPHIC VERIFICATION PROOF', 50, y + 12);

      // Place QR code inside the box
      doc.image(qrImageBuffer, 400, y + 25, { width: 120, height: 120 });

      // Verification Details
      doc.fontSize(8.5).fillColor('#14532d');
      doc.text(`Document SHA-256 Digest:`, 50, y + 36);
      doc.font('Courier').fontSize(7.5).fillColor('#0f172a').text(proof.docHash, 50, y + 49);

      doc.font('Helvetica').fontSize(8.5).fillColor('#14532d').text(`On-Chain Transaction Hash:`, 50, y + 66);
      doc.font('Courier').fontSize(7.5).fillColor('#0f172a').text(proof.transactionHash, 50, y + 79);

      doc.font('Helvetica').fontSize(8.5).fillColor('#14532d').text(`Network & Smart Contract:`, 50, y + 96);
      doc.font('Courier').fontSize(7.5).fillColor('#0f172a').text(`${proof.network} (Chain ID: ${proof.chainId}) • ${proof.contractAddress}`, 50, y + 109);

      doc.font('Helvetica').fontSize(8.5).fillColor('#15803d');
      doc.text(`Scan QR code with any mobile camera to verify on Polygon blockchain explorer.`, 50, y + 130, { width: 330 });

      // --- Footer ---
      doc.fontSize(7.5).fillColor('#94a3b8').text(
        'Landeed 2.0 Blockchain Registry • Powered by TinyFish AI Web Automation • Immutable Public Ledger Record',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    });
  }

  /**
   * Generates official Village Form 6 statutory mutation certificate and streams directly to disk.
   */
  public async generateVillageForm6PDF(
    recordId: string,
    mutation: MutationPDFData,
    proof: BlockchainAnchorProof,
    stateCode: string = 'MH'
  ): Promise<string> {
    const absolutePath = PDFGeneratorService.getPdfAbsolutePath(recordId);
    const relativePath = PDFGeneratorService.getRelativePdfPath(recordId);

    const qrDataUrl = await QRCode.toDataURL(proof.verificationUrl, {
      margin: 1,
      width: 140,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
    const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const writeStream = fs.createWriteStream(absolutePath);

      let hasError = false;
      const onError = (err: Error) => {
        if (!hasError) {
          hasError = true;
          writeStream.destroy();
          fs.unlink(absolutePath, () => {});
          reject(err);
        }
      };

      doc.on('error', onError);
      writeStream.on('error', onError);
      writeStream.on('finish', () => {
        if (!hasError) resolve(relativePath);
      });

      doc.pipe(writeStream);

      // --- Background Watermark ---
      doc.save();
      doc.rotate(-45, { origin: [300, 420] });
      doc.fontSize(32);
      doc.fillColor('#e2e8f0', 0.4);
      doc.text('MAHARASHTRA LAND REVENUE CODE  •  SEC 150', 30, 400, { align: 'center' });
      doc.restore();

      // --- Official Top Banner ---
      doc.rect(36, 36, 523, 62).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
        .text('GOVERNMENT OF MAHARASHTRA  •  REVENUE DEPARTMENT', 46, 48, { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#38bdf8')
        .text('VILLAGE FORM 6 (GAON NAMUNA 6) — REGISTER OF MUTATIONS (FERFAR)', 46, 66, { align: 'center' });
      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8')
        .text(`STATUTORY EXTRACT UNDER SECTION 150 OF MLRC 1966  •  DIGITALLY CERTIFIED VIA LANDEED 2.0`, 46, 82, { align: 'center' });

      // --- Administrative Jurisdiction Strip ---
      doc.rect(36, 104, 523, 26).fill('#f1f5f9');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
        .text(`VILLAGE: ${mutation.village.toUpperCase()}   |   TALUKA: ${mutation.taluka.toUpperCase()}   |   DISTRICT: ${mutation.district.toUpperCase()}   |   STATE: ${stateCode}`, 46, 112);

      // --- Ferfar Metadata Summary Ribbon ---
      let y = 138;
      doc.rect(36, y, 523, 30).fill('#e0f2fe');
      doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(10)
        .text(`FERFAR NO: #${mutation.ferfarNo}`, 46, y + 10);
      doc.fillColor('#0284c7').font('Helvetica').fontSize(9)
        .text(`Entry Date: ${mutation.entryDate}`, 170, y + 10);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
        .text(`Status: ${mutation.statusLabel.toUpperCase()}`, 330, y + 10);

      // --- 5-Column Official Form 6 Table Structure ---
      y += 38;
      const colW = [70, 155, 100, 65, 133];
      const colX = [36, 106, 261, 361, 426];
      const headerH = 32;

      // Table Header Row
      doc.rect(36, y, 523, headerH).fill('#334155');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
      doc.text('Col 1: Ferfar No.\n& Entry Date', colX[0] + 4, y + 6, { width: colW[0] - 8, align: 'center' });
      doc.text('Col 2: Nature of Right &\nAcquisition Details', colX[1] + 4, y + 6, { width: colW[1] - 8, align: 'center' });
      doc.text('Col 3: Survey/Gat\n& Area Transferred', colX[2] + 4, y + 6, { width: colW[2] - 8, align: 'center' });
      doc.text('Col 4: Land\nAssessment', colX[3] + 4, y + 6, { width: colW[3] - 8, align: 'center' });
      doc.text('Col 5: Sec 150 Notice &\nCircle Officer Order', colX[4] + 4, y + 6, { width: colW[4] - 8, align: 'center' });

      // Table Content Row
      y += headerH;
      const rowH = 135;
      doc.rect(36, y, 523, rowH).fillAndStroke('#ffffff', '#cbd5e1');

      // Col dividers
      for (let i = 1; i < colX.length; i++) {
        doc.moveTo(colX[i], y).lineTo(colX[i], y + rowH).stroke('#e2e8f0');
      }

      // Col 1 Data
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
        .text(`#${mutation.ferfarNo}`, colX[0] + 6, y + 12, { width: colW[0] - 12, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(`Date:\n${mutation.entryDate}`, colX[0] + 6, y + 36, { width: colW[0] - 12, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#059669')
        .text('E-HAKK\nRECORDED', colX[0] + 6, y + 80, { width: colW[0] - 12, align: 'center' });

      // Col 2 Data
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
        .text(`NATURE: ${mutation.mutationType.toUpperCase()}`, colX[1] + 6, y + 8, { width: colW[1] - 12 });
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text(`Transferor (From):`, colX[1] + 6, y + 26)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(mutation.transferor, colX[1] + 6, y + 37, { width: colW[1] - 12 })
        .font('Helvetica').fillColor('#475569')
        .text(`Transferee (To):`, colX[1] + 6, y + 54)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(mutation.transferee, colX[1] + 6, y + 65, { width: colW[1] - 12 });
      if (mutation.sroDeedNo) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#2563eb')
          .text(`SRO Ref: Deed #${mutation.sroDeedNo}`, colX[1] + 6, y + 84)
          .text(`Office: ${mutation.sroOffice || 'SRO Haveli'}`, colX[1] + 6, y + 96)
          .text(`Reg Date: ${mutation.sroRegDate || mutation.entryDate}`, colX[1] + 6, y + 108);
      }

      // Col 3 Data
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
        .text(`Gat/Survey: ${mutation.surveyNo}`, colX[2] + 6, y + 8, { width: colW[2] - 12 });
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text(`Area: ${mutation.area}`, colX[2] + 6, y + 28, { width: colW[2] - 12 })
        .text(`Hissa: Sub-division A`, colX[2] + 6, y + 44)
        .text(`Classification: Jirayat (Agricultural / Freehold)`, colX[2] + 6, y + 60, { width: colW[2] - 12 });

      // Col 4 Data
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text(`Assessment:\n${mutation.assessment}`, colX[3] + 6, y + 8, { width: colW[3] - 12, align: 'center' });
      doc.text(`Local Cess:\nRs. 1.25`, colX[3] + 6, y + 44, { width: colW[3] - 12, align: 'center' });

      // Col 5 Data (Section 150 MLRC 15-day notice & Circle Officer Order)
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#15803d')
        .text(`Sec 150 MLRC Notice:`, colX[4] + 6, y + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
        .text(`• Notice Issued: ${mutation.noticeDetails.noticeDate}`, colX[4] + 6, y + 20)
        .text(`• Display: ${mutation.noticeDetails.noticeDisplayedAt}`, colX[4] + 6, y + 32)
        .text(`• Expiry: ${mutation.noticeDetails.objectionDeadline}`, colX[4] + 6, y + 44)
        .text(`• Objections: ${mutation.noticeDetails.objectionStatus}`, colX[4] + 6, y + 56);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
        .text(`Sanction Order:`, colX[4] + 6, y + 74);
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
        .text(`• Order: ${mutation.noticeDetails.orderNo}`, colX[4] + 6, y + 86)
        .text(`• Date: ${mutation.noticeDetails.orderDate}`, colX[4] + 6, y + 98)
        .text(`• Officer: ${mutation.noticeDetails.certifyingOfficer}`, colX[4] + 6, y + 110, { width: colW[4] - 12 });

      // --- Statutory Notice Explanatory Box ---
      y += rowH + 12;
      doc.rect(36, y, 523, 72).fillAndStroke('#f8fafc', '#94a3b8');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b')
        .text('LEGAL EFFECT OF MUTATION (SECTION 150 MLRC 1966 & REVENUE LAW):', 46, y + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
        .text('1. Ferfar (Village Form 6) records all succession, sale, mortgage, partition, and lease events altering land rights in village records.', 46, y + 22, { width: 503 })
        .text('2. A statutory 15-day notice period is mandatory on Aapli Chawadi for all interested parties to register objections before certification.', 46, y + 35, { width: 503 })
        .text('3. Once certified by the Circle Officer (Mandal Adhikari), title is entered into Village Form 7/12 (Satbara) & 8A Khate accounts.', 46, y + 48, { width: 503 });

      // --- Blockchain Verification Box with QR Code ---
      y += 82;
      doc.rect(36, y, 523, 140).fillAndStroke('#f0fdf4', '#86efac');
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(11)
        .text('🛡️ ON-CHAIN CRYPTOGRAPHIC VERIFICATION & IMMUTABILITY SEAL', 46, y + 10);

      // QR Code
      doc.image(qrImageBuffer, 415, y + 15, { width: 110, height: 110 });

      // Proof details
      doc.font('Helvetica').fontSize(8).fillColor('#14532d')
        .text(`Document SHA-256 Digest:`, 46, y + 28);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(proof.docHash, 46, y + 38);

      doc.font('Helvetica').fontSize(8).fillColor('#14532d')
        .text(`Polygon EVM Transaction Hash:`, 46, y + 52);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(proof.transactionHash, 46, y + 62);

      doc.font('Helvetica').fontSize(8).fillColor('#14532d')
        .text(`EAS Attestation Network & Registry Contract:`, 46, y + 76);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(`${proof.network.toUpperCase()} • ${proof.contractAddress} • Block #${proof.blockNumber}`, 46, y + 86);

      doc.font('Helvetica').fontSize(7.5).fillColor('#15803d')
        .text(`Scan QR code with any mobile camera or verify at https://polygonscan.com to inspect immutable on-chain record.`, 46, y + 106, { width: 350 });

      // --- Footer ---
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
        'Landeed 2.0 Digital Land Registry • Official Village Form 6 Certification • Timestamped On-Chain',
        36,
        782,
        { align: 'center', width: 523 }
      );

      doc.end();
    });
  }

  /**
   * Generates official IGR Index-II (सूची क्र. २) registered deed certificate
   * under Section 55 of the Registration Act 1908 with financials, parties, property schedule & blockchain seal.
   */
  public async generateIGRIndex2PDF(
    recordId: string,
    deed: Index2PDFData,
    proof: BlockchainAnchorProof,
    stateCode: string = 'MH'
  ): Promise<string> {
    const absolutePath = PDFGeneratorService.getPdfAbsolutePath(recordId);
    const relativePath = PDFGeneratorService.getRelativePdfPath(recordId);

    const qrDataUrl = await QRCode.toDataURL(proof.verificationUrl, {
      margin: 1,
      width: 140,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
    const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const writeStream = fs.createWriteStream(absolutePath);

      let hasError = false;
      const onError = (err: Error) => {
        if (!hasError) {
          hasError = true;
          writeStream.destroy();
          fs.unlink(absolutePath, () => {});
          reject(err);
        }
      };

      doc.on('error', onError);
      writeStream.on('error', onError);
      writeStream.on('finish', () => {
        if (!hasError) resolve(relativePath);
      });

      doc.pipe(writeStream);

      // --- Background Watermark ---
      doc.save();
      doc.rotate(-45, { origin: [300, 420] });
      doc.fontSize(32);
      doc.fillColor('#e2e8f0', 0.4);
      doc.text('REGISTRATION ACT 1908  •  SECTION 55', 30, 400, { align: 'center' });
      doc.restore();

      // --- Official Top Banner ---
      doc.rect(36, 36, 523, 62).fill('#1e1b4b');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
        .text('INSPECTOR GENERAL OF REGISTRATION & STAMPS', 46, 48, { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#c084fc')
        .text('INDEX-II (सूची क्र. २) — REGISTER OF IMMOVABLE PROPERTY DOCUMENTS', 46, 66, { align: 'center' });
      doc.fontSize(8.5).font('Helvetica').fillColor('#a5b4fc')
        .text(`OFFICIAL SRO REGISTER ABSTRACT (BOOK NO. 1)  •  CERTIFIED VIA LANDEED 2.0`, 46, 82, { align: 'center' });

      // --- Document Metadata Ribbon ---
      doc.rect(36, 104, 523, 26).fill('#f5f3ff');
      doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(9)
        .text(`DOC NO: ${deed.deedNo}/${deed.regYear}   |   SRO: ${deed.sroOffice.toUpperCase()}   |   BOOK: ${deed.bookNo} (VOL: ${deed.volumeNo}, PP: ${deed.pageNos})   |   DATE: ${deed.regDate}`, 46, 112);

      // --- Financials Summary Grid (4 Cells) ---
      let y = 138;
      const cellW = 127;
      const cellH = 40;
      const cells = [
        { label: 'MARKET VALUE (बाजारमूल्य)', val: deed.marketValue, color: '#475569' },
        { label: 'CONSIDERATION (मोबदला)', val: deed.considerationAmount, color: '#059669' },
        { label: 'STAMP DUTY (मुद्रांक शुल्क)', val: deed.stampDutyPaid, color: '#2563eb' },
        { label: 'REGISTRATION FEE (नोंदणी फी)', val: deed.registrationFeePaid, color: '#7c3aed' }
      ];

      for (let i = 0; i < cells.length; i++) {
        const cx = 36 + i * 132;
        doc.rect(cx, y, cellW, cellH).fillAndStroke('#ffffff', '#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(cells[i].color)
          .text(cells[i].label, cx + 6, y + 6, { width: cellW - 12 });
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
          .text(cells[i].val, cx + 6, y + 20, { width: cellW - 12 });
      }

      // --- Nature of Document ---
      y += cellH + 8;
      doc.rect(36, y, 523, 22).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
        .text(`DOCUMENT TYPE / व्यवहाराचे स्वरूप:  ${deed.documentType.toUpperCase()} (${deed.documentTypeMarathi})`, 46, y + 6);

      // --- Parties Section (Executant & Claimant) ---
      y += 28;
      const partyBoxH = 92;
      const partyBoxW = 258;

      // Executant (Seller / देणारा)
      doc.rect(36, y, partyBoxW, partyBoxH).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(36, y, partyBoxW, 20).fill('#fee2e2');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#991b1b')
        .text('EXECUTANT / VENDOR (हक्क लिहून देणारा / विकणारा)', 44, y + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
        .text(deed.executant.name, 44, y + 26, { width: partyBoxW - 16 });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(`Role: ${deed.executant.role}`, 44, y + 42)
        .text(`Address: ${deed.executant.address}`, 44, y + 54, { width: partyBoxW - 16, lineGap: 2 });

      // Claimant (Buyer / घेणारा)
      const cx2 = 301;
      doc.rect(cx2, y, partyBoxW, partyBoxH).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(cx2, y, partyBoxW, 20).fill('#dcfce7');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534')
        .text('CLAIMANT / PURCHASER (हक्क लिहून घेणारा / खरेदीदार)', cx2 + 8, y + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
        .text(deed.claimant.name, cx2 + 8, y + 26, { width: partyBoxW - 16 });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(`Role: ${deed.claimant.role}`, cx2 + 8, y + 42)
        .text(`Address: ${deed.claimant.address}`, cx2 + 8, y + 54, { width: partyBoxW - 16, lineGap: 2 });

      // --- Schedule of Property & Boundaries ---
      y += partyBoxH + 10;
      doc.rect(36, y, 523, 90).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(36, y, 523, 20).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b')
        .text('SCHEDULE OF IMMOVABLE PROPERTY (मिलकतीचे वर्णन व चतुःसीमा)', 46, y + 6);

      // Property details
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text(`Gat / Survey / CTS No:`, 46, y + 26)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(deed.propertyDescription.surveyNo, 150, y + 26)
        .font('Helvetica').fillColor('#475569')
        .text(`Area Transferred:`, 46, y + 38)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(deed.propertyDescription.area, 150, y + 38)
        .font('Helvetica').fillColor('#475569')
        .text(`Jurisdiction:`, 46, y + 50)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(`Village ${deed.propertyDescription.village}, Taluka ${deed.propertyDescription.taluka}, Dist. ${deed.propertyDescription.district}`, 150, y + 50);

      if (deed.ferfarRef) {
        doc.font('Helvetica').fontSize(8).fillColor('#2563eb')
          .text(`Linked Revenue Mutation: Ferfar #${deed.ferfarRef} (Village Form 6)`, 46, y + 64);
      }

      // Boundaries Grid
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
        .text('BOUNDARIES (चतुःसीमा):', 330, y + 26);
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
        .text(`• North: ${deed.propertyDescription.boundaries.north}`, 330, y + 38, { width: 220 })
        .text(`• South: ${deed.propertyDescription.boundaries.south}`, 330, y + 49, { width: 220 })
        .text(`• East: ${deed.propertyDescription.boundaries.east}`, 330, y + 60, { width: 220 })
        .text(`• West: ${deed.propertyDescription.boundaries.west}`, 330, y + 71, { width: 220 });

      // --- Blockchain Verification Box with QR Code ---
      y += 100;
      doc.rect(36, y, 523, 140).fillAndStroke('#faf5ff', '#d8b4fe');
      doc.fillColor('#581c87').font('Helvetica-Bold').fontSize(11)
        .text('🛡️ ON-CHAIN CRYPTOGRAPHIC DEED ANCHOR & SRO SEAL', 46, y + 10);

      // QR Code
      doc.image(qrImageBuffer, 415, y + 15, { width: 110, height: 110 });

      // Proof details
      doc.font('Helvetica').fontSize(8).fillColor('#3b0764')
        .text(`Document SHA-256 Digest:`, 46, y + 28);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(proof.docHash, 46, y + 38);

      doc.font('Helvetica').fontSize(8).fillColor('#3b0764')
        .text(`Polygon EVM Transaction Hash:`, 46, y + 52);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(proof.transactionHash, 46, y + 62);

      doc.font('Helvetica').fontSize(8).fillColor('#3b0764')
        .text(`EAS Schema & Registry Contract:`, 46, y + 76);
      doc.font('Courier').fontSize(7).fillColor('#0f172a')
        .text(`${proof.network.toUpperCase()} • ${proof.contractAddress} • Block #${proof.blockNumber}`, 46, y + 86);

      doc.font('Helvetica').fontSize(7.5).fillColor('#6b21a8')
        .text(`Scan QR code with any mobile camera to verify certified SRO registration on Polygonscan explorer.`, 46, y + 106, { width: 350 });

      // --- Footer ---
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
        'Landeed 2.0 Sub-Registrar Registry • Official IGR Index-II Extract • Immutable Public Ledger Record',
        36,
        782,
        { align: 'center', width: 523 }
      );

      doc.end();
    });
  }
}
