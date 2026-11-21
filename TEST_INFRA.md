# E2E Test Infra: Landeed 2.0 Map Explore Enhancements

## Test Philosophy
- Opaque-box, requirement-driven automated verification.
- Cross-platform support for macOS Darwin (`/Applications/Google Chrome.app`), Linux, and Windows.
- Multi-tier testing methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | Backend Cadastral Parcel Search | R1, ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Map Navigation Ergonomics (Wheel/Pinch) | R2, ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 3 | Multi-State Cadastre Seeding | R3, ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 4 | Resilient WMS Tile Proxy & Fallback | R4, ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 5 | Parcel-to-Record Deep Linking | R5, ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| 6 | Autonomous Due Diligence Backend & UI | R6, ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| 7 | Cross-Platform macOS Chrome Resolver | R7, ORIGINAL_REQUEST §R7 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: Native Node.js `node tests/...`, `puppeteer-core`, `node:assert`, native `fetch`, `node:sqlite`.
- Browser resolution: `tests/helpers/browserResolver.js` dynamically resolving Google Chrome on macOS (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), Microsoft Edge on Windows, and Chromium on Linux.
- Target ports: Backend on `http://localhost:4000`, Expo Web on `http://localhost:8081`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Search MH Wagholi Survey 142, fly camera, zoom in 12->16 with wheel, deep link to 7/12 fetch | F1, F2, F5, F7 | High |
| 2 | Switch to Bengaluru chip, locate Whitefield parcel, stream proxy tiles, ask Terra AI Bhoomi Form 16 status | F1, F3, F4, F6, F7 | High |
| 3 | Switch to Hyderabad chip, locate Serilingampally parcel, verify Dharani 22-A & HYDRAA buffer pass in Terra AI | F1, F3, F6, F7 | High |
| 4 | Switch to Noida chip, locate Sector 62 parcel, verify UP Sec 143 conversion in Terra AI | F1, F3, F6, F7 | High |
| 5 | Verify upstream GeoServer outage triggers graceful 200 transparent tile raster fallback | F4, F7 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (Happy-path / isolated verification)
- Tier 2: ≥5 boundary & corner cases per feature (Limits, error inputs, timeouts, invalid coordinates)
- Tier 3: Pairwise cross-feature interactions (Locate -> Deep Link, Locate -> Terra AI, Region Chip -> Map Reload)
- Tier 4: ≥5 realistic end-to-end multi-state workflows
