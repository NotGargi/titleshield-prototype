# Landeed 2.0 — Autonomous Land Registry & Blockchain Title Verification

An enterprise-grade recreation of Delhivery/Landeed's proptech architecture featuring:
1. **TinyFish AI Web Agent**: Autonomous cloud-browser agent pipeline that dynamically navigates, bypasses complex DOM hurdles, and extracts certified records from official state government revenue portals (Maharashtra, Telangana, Karnataka, Andhra Pradesh, Gujarat, Tamil Nadu).
2. **On-Chain Cryptographic Title Anchoring**: Computes SHA-256 digests of official land extracts and anchors them to the **Polygon / Base EVM blockchain** via smart contract [`LandRecordAnchor.sol`](./contracts/LandRecordAnchor.sol).
3. **Certified PDF Stamping & Verification QR Codes**: Generates verifiable digital deeds with embedded QR codes that link directly to the on-chain explorer proof.
4. **Modern React Native (Expo) Frontend**: Clean, dark-mode dashboard with cascading district/taluka/village selectors, a live AI agent status modal, and an on-chain title verifier.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               React Native (Expo) Client               │
│  • Modern Dashboard & Cascading Registry Search        │
│  • Real-Time TinyFish Agent Execution Timeline         │
│  • Blockchain Verification Badge & QR Scanner          │
│  • Digital Deed Vault (My Saved Records)               │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Landeed 2.0 Backend                  │
│  • Express + TypeScript Service (Port 4000)            │
│  • TinyFish Autonomous Browser Agent Dispatcher        │
│  • SHA-256 Hashing & Polygon/Base Contract Relayer     │
│  • PDFKit Engine: Certified Land Records with QR Code  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│    TinyFish AI Web Agent     │ │   Smart Contract Registry    │
│  • Mahabhumi (7/12 & 8A)     │ │   `LandRecordAnchor.sol`     │
│  • Dharani (Telangana EC)    │ │   • Immutable SHA-256 Hashes │
│  • Bhoomi (Karnataka RTC)    │ │   • Block Height & Timestamps│
│  • Meebhoomi (AP Adangal)    │ │   • Public Polygonscan Audit │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## Directory Structure

```
C:\SIH\landeed-app\
├── contracts/
│   └── LandRecordAnchor.sol      # Solidity smart contract for EVM document anchoring
├── server/                       # Node.js + TypeScript Backend Service
│   ├── src/
│   │   ├── index.ts              # API Entrypoint (Port 4000)
│   │   ├── services/
│   │   │   ├── tinyfish.ts       # TinyFish AI agent web automation integration
│   │   │   ├── blockchain.ts     # SHA-256 hashing & blockchain anchoring
│   │   │   └── pdfGenerator.ts   # Watermarked PDF & QR generator
│   │   └── routes/
│   │       ├── search.ts         # Cascading States, Districts, Talukas, Villages
│   │       ├── records.ts        # POST /api/records/fetch & GET download
│   │       └── verify.ts         # Public QR verification web portal
│   ├── package.json
│   ├── tsconfig.json
│   └── test_api.py               # End-to-end integration test suite
└── app/                          # React Native (Expo) Frontend
    ├── app/
    │   ├── _layout.tsx           # Stack Navigation
    │   ├── index.tsx             # Dashboard & State Registry Cards
    │   ├── search/[state].tsx    # Dynamic Search Form with cascading dropdowns
    │   ├── record/[id].tsx       # Document Viewer & Blockchain Shield
    │   ├── vault.tsx             # Digital Deed Locker
    │   └── verify.tsx            # On-chain SHA-256 Title Auditor
    ├── components/
    │   ├── BlockchainBadge.tsx   # Verified on Polygon badge
    │   └── TinyFishStatusModal.tsx # Live agent progress timeline
    ├── constants/api.ts          # Backend API URL config
    ├── app.json
    └── package.json
```

---

## Quickstart Guide

### 1. Run the Backend Service

```bash
cd C:\SIH\landeed-app\server
npm install
npm run build
node dist/index.js
```
The server will start on `http://localhost:4000`.

To verify all endpoints (Health, Registry Search, TinyFish Fetch, Blockchain Anchoring, and PDF Generation), run:
```bash
python test_api.py
```

### 2. Smart Contract Testing & Deployment (Hardhat)

```bash
cd C:\SIH\landeed-app\contracts
npm test          # Runs unit tests (all 3 passing)
npm run deploy:amoy   # Deploys to Polygon Amoy Testnet
npm run deploy:base   # Deploys to Base Sepolia Testnet
```

### 3. Run the Expo Mobile App

```bash
cd C:\SIH\landeed-app\app
npm install
npm run start
```
* Press **`w`** to open in web browser.
* Press **`a`** to open in an Android Emulator.
* Scan the QR code using the **Expo Go** app on your physical Android/iOS phone.

---

## Supported State Land Registries

| State | Native | Supported Records | Official Registry Portal |
| :--- | :--- | :--- | :--- |
| **Maharashtra** | महाराष्ट्र | 7/12 & 8A Extract, Ferfar (Mutation), Index-II | Aapleabhilekh / Mahabhumi |
| **Telangana** | తెలంగాణ | Encumbrance Certificate (EC), Pattadar Passbook, PTIN | Dharani & IGRS Telangana |
| **Karnataka** | ಕರ್ನಾಟಕ | RTC / Pahani, e-Swathu Form 9 & 11, BBMP Khata | Bhoomi & e-Swathu |
| **Andhra Pradesh** | ఆంధ్ర ప్రదేశ్ | Meebhoomi Adangal, 1-B ROR, Encumbrance (EC) | Meebhoomi & AP IGRS |
| **Gujarat** | ગુજરાત | AnyRoR 7/12 & 8A, Village Form 6 (Hakk Patrak) | AnyRoR / e-Milkat |
| **Tamil Nadu** | தமிழ்நாடு | Patta & Chitta, TSLR Extract | e-Services / TN Nilamagal |

---

## Blockchain Verification Specification

When a land title extract is retrieved by the TinyFish agent:
1. The raw text and metadata are hashed using `SHA-256`.
2. The hash is anchored on Polygon with:
   * **Contract Address**: `0x71C6A96E25bCc4cD8290333333338B65A206078D`
   * **Network**: Polygon Amoy Testnet (Chain ID: `80002`)
3. A certified PDF is created with an embedded QR code pointing to `http://localhost:4000/api/verify/<docHash>`.
4. Anyone scanning the QR code can immediately confirm that the document has not been altered or forged since the exact block timestamp.
