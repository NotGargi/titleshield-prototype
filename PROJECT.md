# Project: Landeed 2.0 Map Explore Enhancements

## Architecture
Landeed 2.0 is a sovereign land records platform with an Express/TypeScript backend (port 4000) backed by SQLite (`better-sqlite3`), and an Expo React Native Web frontend (port 8081).
- **Backend Services**:
  - `cadastreIngest.ts`: Ingests and seeds official cadastral parcel polygons across multiple states (MH, KA, TG, UP, TN).
  - `cadastre.ts` (`GET /api/cadastre/parcels`): Spatial and jurisdictional query endpoint executing indexed queries in <10ms.
  - `tiles.ts` (`GET /api/tiles/wms/:state/:z/:x/:y`): OGC WMS caching tile proxy translating slippy coordinates to EPSG:3857, bypassing CORS and providing transparent fallback.
  - `terra.ts` (`POST /api/terra/chat`): Autonomous due-diligence engine assessing title risks, encumbrances, and state-specific land laws.
- **Frontend Applications**:
  - `CadastralMap.tsx`: Vector and WMS raster cadastral map supporting mouse scroll-wheel zoom (12–19) and pinch-to-zoom with centroid preservation.
  - `explorer.tsx`: Cadastral map explorer integrating backend parcel search, camera flying, and property summary.
  - `PropertySummarySheet.tsx`: Action sheet providing 1-click "Fetch Official 7/12 & RoR" deep linking to `/search/[state]`.
  - `terra.tsx`: Terra AI chat interface connected to `POST /api/terra/chat` displaying structured risk analysis.
- **Testing Architecture**:
  - Cross-platform test runner in `tests/` with dynamic browser resolution (`browserResolver.js`), verifying all endpoints and browser UI flows on macOS, Linux, and Windows.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Backend Cadastral Parcel Search | `GET /api/cadastre/parcels` dynamic filters (`surveyNo`, `state`, `district`, `village`), sub-10ms response | M1 | R1, Survey Backend |
| 2 | Multi-State Cadastre Seeding | Seed verified cadastral polygons for MH, KA, TG, UP Noida, TN in SQLite DB | M1 | R3, Survey Backend |
| 3 | Server-Side WMS Tile Proxy | `GET /api/tiles/wms/:state/:z/:x/:y` with EPSG:3857 math, two-tier cache, CORS headers, transparent PNG fallback | M2 | R4, Survey Backend |
| 4 | Autonomous Due Diligence Backend | `POST /api/terra/chat` analyzing jurisdiction, risk score, encumbrances, and state land laws | M2 | R6, Survey Backend |
| 5 | Map Ergonomics (Scroll-Wheel & Pinch) | Mouse scroll-wheel web zoom (levels 12–19) and touch pinch-to-zoom with centroid preservation | M3 | R2, Survey Frontend |
| 6 | Frontend Tile Proxy Streaming | Update `geoProjection.ts` and `CadastralMap.tsx` to stream through `/api/tiles/wms/...` with raster fallback | M3 | R4, Survey Frontend |
| 7 | Regional Preset Chips | Add Hyderabad (`TG`) chip alongside Pune, Bengaluru, Noida in `cadastralData.ts` | M3 | R3, Survey Frontend |
| 8 | Explorer Locate Parcel & Camera Fly | Wire `handleLocateParcel` to backend API and fly camera to selected parcel coordinates | M3 | R1, Survey Frontend |
| 9 | Parcel-to-Record Deep Linking | "Fetch Official 7/12 & RoR" 1-click action in `PropertySummarySheet` and `explorer.tsx` prefilling `/search/[state]` | M3 | R5, Survey Frontend |
| 10 | Frontend Terra AI Grounded Chat | Connect `app/app/terra.tsx` to `POST /api/terra/chat` with structured risk badges and legal findings | M3 | R6, Survey Frontend |
| 11 | Cross-Platform Browser Resolver | Helper resolving macOS `/Applications/Google Chrome.app`, Linux, and Windows browsers | M4 | R7, Survey Tests |
| 12 | Updated Test Suite 06 | Modernize `06_test_explore_cadastral_map.js` for macOS Chrome and cross-platform verification | M4 | R7, Survey Tests |
| 13 | Dedicated Enhancements Test Suite | Create `tests/test_map_explore_enhancements.js` with Tiers 1–4 comprehensive automated tests | M4 | R7, Survey Tests |
| 14 | E2E Regression Pass | Ensure all test suites (01–09, enhancements) pass 100% on macOS | M4 | R7, Survey Tests |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Cadastre Search & Multi-State Seeding | R1 Backend (`GET /api/cadastre/parcels`), R3 multi-state cadastre seeding (MH, KA, TG, UP, TN) in `cadastreIngest.ts` and `cadastre.ts` | None | DONE |
| M2 | WMS Tile Proxy & Real Terra AI Backend | R4 Backend (`GET /api/tiles/wms/:state/:z/:x/:y`), R6 Backend (`POST /api/terra/chat`), mount in `index.ts`, rebuild server | M1 | DONE |
| M3 | Frontend Map Ergonomics, Proxy Stream, Search & Deep Linking, Terra AI UI | R1 Frontend (`explorer.tsx`), R2 (`CadastralMap.tsx` scroll/pinch), R4 Frontend (`geoProjection.ts`), R5 (`PropertySummarySheet.tsx`), R6 Frontend (`terra.tsx`), R3 (`cadastralData.ts`) | M1, M2 | DONE |
| M4 | Automated Verification Suite & Cross-Platform Harness | R7 `browserResolver.js`, update `06_test_explore_cadastral_map.js`, create `test_map_explore_enhancements.js`, pass 100% E2E tests | M1, M2, M3 | DONE |

## Interface Contracts

### Frontend ↔ Backend: `GET /api/cadastre/parcels`
- Request query: `?surveyNo=...&state=...&district=...&village=...&bbox=...`
- Response:
  ```json
  {
    "parcels": [
      {
        "id": "KA-BLR-001",
        "surveyNumber": "142",
        "state": "KA",
        "district": "Bengaluru Urban",
        "taluka": "Bengaluru South",
        "village": "Whitefield",
        "coordinates": { "lat": 12.9698, "lng": 77.7499 },
        "boundaries": [[[77.748, 12.968], ...]],
        "areaAcres": 2.4,
        "ownerName": "..."
      }
    ],
    "total": 1,
    "bbox": [...]
  }
  ```

### Frontend ↔ Backend: `GET /api/tiles/wms/:state/:z/:x/:y`
- Path params: `state` (e.g. MH, KA, TG, UP, TN), `z` (zoom), `x` (slippy x), `y` (slippy y)
- Response: `Content-Type: image/png`, HTTP 200, CORS header `Access-Control-Allow-Origin: *`
- Error behavior: Return HTTP 200 with 256x256 transparent PNG on upstream network error/timeout.

### Frontend ↔ Backend: `POST /api/terra/chat`
- Request body:
  ```json
  {
    "prompt": "Check legal status and encumbrances",
    "parcelContext": {
      "id": "TG-HYD-101",
      "surveyNumber": "101",
      "state": "TG",
      "district": "Hyderabad",
      "taluka": "Serilingampally",
      "village": "Gachibowli",
      "coordinates": { "lat": 17.4820, "lng": 78.3315 }
    }
  }
  ```
- Response:
  ```json
  {
    "reply": "Legal title assessment for Survey No. 101...",
    "riskScore": 25,
    "riskTier": "LOW",
    "findings": [
      {
        "category": "Statutory List (Dharani 22-A)",
        "status": "PASS",
        "description": "Parcel not listed on Section 22-A prohibited register."
      },
      {
        "category": "HYDRAA Waterbody Buffer",
        "status": "PASS",
        "description": "Clear of FTL and lake buffer zones."
      }
    ],
    "citations": ["Telangana Rights in Land and Pattadar Passbooks Act 2020", "HYDRAA Notification 2024"]
  }
  ```

### Explorer ↔ Search Deep Linking: `/search/[state]`
- Query params: `?state=MH&district=Pune&taluka=Haveli&village=Wagholi&surveyNo=142&docType=7_12&autoFetch=true`

## Code Layout
- `server/src/routes/cadastre.ts` [Owned by M1 Worker]
- `server/src/services/cadastreIngest.ts` [Owned by M1 Worker]
- `server/data/samples/cadastre/*` [Owned by M1 Worker]
- `server/src/routes/tiles.ts` [Owned by M2 Worker]
- `server/src/routes/terra.ts` [Owned by M2 Worker]
- `server/src/index.ts` [Owned by M2 Worker]
- `app/components/CadastralMap.tsx` [Owned by M3 Worker]
- `app/utils/geoProjection.ts` [Owned by M3 Worker]
- `app/constants/cadastralData.ts` [Owned by M3 Worker]
- `app/app/explorer.tsx` [Owned by M3 Worker]
- `app/components/PropertySummarySheet.tsx` [Owned by M3 Worker]
- `app/app/terra.tsx` [Owned by M3 Worker]
- `tests/helpers/browserResolver.js` [Owned by M4 Worker]
- `tests/06_test_explore_cadastral_map.js` [Owned by M4 Worker]
- `tests/test_map_explore_enhancements.js` [Owned by M4 Worker]
- `tests/run_all_e2e_tests.js` [Owned by M4 Worker]
