const puppeteer = require('c:/SIH/landeed-app/server/node_modules/puppeteer-core');
const assert = require('assert');

(async () => {
  console.log('🚀 Starting E2E verification of Land Papers on Cadastral Map...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Verify default parcel (Wagholi Gat 142/2A) summary card has papers
  console.log('1. Checking default parcel papers...');
  const countText = await page.$eval('[data-testid="available-papers-count"]', el => el.innerText.trim());
  console.log('  Available papers badge:', countText);
  assert.ok(countText.includes('4 PAPERS AVAILABLE'), `Expected 4 papers available, got: ${countText}`);

  // 2. Verify all 4 paper cards exist in the DOM
  console.log('2. Checking paper cards count...');
  const paperCards = await page.$$eval('[data-testid^="paper-card-"]', els => els.map(e => e.innerText));
  console.log('  Total paper cards rendered:', paperCards.length);
  assert.strictEqual(paperCards.length, 4, `Expected 4 paper cards, found ${paperCards.length}`);

  // 3. Click "View Paper" on 7/12 Extract
  console.log('3. Clicking "View Paper" for 7/12 Extract...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="view-paper-btn-paper-mh-142-2a-712"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Verify Land Paper Modal opened with authentic government ledger
  console.log('4. Verifying Land Paper Modal contents...');
  const modalText = await page.$eval('[data-testid="land-paper-modal"]', el => el.innerText);
  assert.ok(modalText.includes('सत्यमेव जयते'), 'Modal must contain Satyamev Jayate header');
  assert.ok(modalText.includes('कुलकर्णी') || modalText.includes('Kulkarni'), 'Modal must contain owner Ramesh Kulkarni');
  console.log('  Modal verified with authentic government ledger!');

  // Take screenshot of paper modal
  await page.screenshot({ path: 'c:/SIH/landeed-app/server/test_screenshots/e2e_land_paper_modal.png' });
  console.log('  Saved screenshot: e2e_land_paper_modal.png');

  // 5. Close paper modal
  console.log('5. Closing paper modal...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="paper-modal-close-btn"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 6. Select adjacent un-digitized plot (Plot 141) via client click
  console.log('6. Selecting adjacent un-digitized plot Gat 141...');
  await page.evaluate(() => {
    const polygon141 = document.querySelector('[data-testid="parcel-polygon-parcel-mh-pune-141"]');
    if (polygon141) polygon141.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1500));

  const unseededBadge = await page.$eval('[data-testid="available-papers-count"]', el => el.innerText.trim());
  console.log('  Gat 141 papers badge:', unseededBadge);
  assert.ok(unseededBadge.includes('NO PAPERS ON FILE'), `Expected NO PAPERS ON FILE, got: ${unseededBadge}`);

  const emptyCardText = await page.$eval('[data-testid="no-papers-card"]', el => el.innerText);
  console.log('  Empty state text:', emptyCardText.slice(0, 50));
  assert.ok(emptyCardText.includes('No Digitized Papers on File for Gat 141'), 'Must state no papers on file for Gat 141');

  // 7. Verify "Pull Papers from Land Registry" button exists
  console.log('7. Verifying Pull Papers button...');
  const pullBtn = await page.$('[data-testid="extract-live-papers-btn"]');
  assert.ok(pullBtn, 'Pull Papers button must exist for un-digitized plots');

  await page.screenshot({ path: 'c:/SIH/landeed-app/server/test_screenshots/e2e_no_papers_on_file.png' });
  console.log('  Saved screenshot: e2e_no_papers_on_file.png');

  // 8. Test live paper extraction for Gat 141!
  console.log('8. Clicking "Pull Papers from Land Registry" to trigger live extraction...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="extract-live-papers-btn"]');
    if (btn) btn.click();
  });

  console.log('  Waiting for TinyFish AI portal extraction to complete (up to 35s)...');
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="available-papers-count"]');
    return el && el.innerText.includes('1 PAPERS AVAILABLE');
  }, { timeout: 40000 });

  const afterExtractBadge = await page.$eval('[data-testid="available-papers-count"]', el => el.innerText.trim());
  console.log('  After live extraction badge:', afterExtractBadge);
  assert.ok(afterExtractBadge.includes('1 PAPERS AVAILABLE'), `Expected 1 paper available after extraction, got: ${afterExtractBadge}`);

  await page.screenshot({ path: 'c:/SIH/landeed-app/server/test_screenshots/e2e_live_extracted_paper.png' });
  console.log('  Saved screenshot: e2e_live_extracted_paper.png');

  await browser.close();
  console.log('🎉 ALL LAND PAPERS E2E CHECKS PASSED WITH 100% SUCCESS!');
})();
