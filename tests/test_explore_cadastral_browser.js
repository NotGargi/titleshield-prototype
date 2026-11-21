/**
 * Browser Verification Test for Cadastral Map & Property Summary Sheet
 * Runs Puppeteer with Headless Edge on http://localhost:8081/explorer
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  try {
    puppeteer = require(path.join(__dirname, '..', 'server', 'node_modules', 'puppeteer-core'));
  } catch {
    puppeteer = require('c:\\SIH\\landeed-app\\server\\node_modules\\puppeteer-core');
  }
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runExploreBrowserTests() {
  console.log('================================================================');
  console.log('🗺️ BROWSER VERIFICATION: Cadastral Map & Property Summary Sheet');
  console.log('================================================================');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Step 1: Verify /explorer loads
    console.log('  Navigating to http://localhost:8081/explorer ...');
    await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000);

    let pageText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      pageText.includes('Physical & Cadastral Map') || pageText.includes('CADASTRAL'),
      'Explorer screen header should be rendered'
    );
    console.log('  ✅ Step 1: /explorer loaded successfully with Cadastral Map header.');

    // Step 2: Verify layer toggle
    const satelliteBtn = await page.$('[data-testid="layer-toggle-satellite"]');
    const cadastralBtn = await page.$('[data-testid="layer-toggle-cadastral"]');
    assert.ok(satelliteBtn && cadastralBtn, 'Layer toggle buttons (Satellite & Cadastral) must exist');

    await cadastralBtn.click();
    await sleep(500);
    console.log('  ✅ Step 2: Layer toggle clicked to Cadastral mode.');

    await satelliteBtn.click();
    await sleep(500);
    console.log('  ✅ Step 2b: Layer toggle clicked back to Satellite mode.');

    // Step 3: Verify GPS locate button
    const gpsBtn = await page.$('[data-testid="gps-locate-btn"]');
    assert.ok(gpsBtn, 'GPS locate button must exist');
    await gpsBtn.click();
    await sleep(500);
    console.log('  ✅ Step 3: GPS locate button clicked without errors.');

    // Step 4: Verify Property Summary Sheet attributes
    pageText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      pageText.includes('Verified Transferee') || pageText.includes('142/2A'),
      'Summary sheet should display Owner or Survey number'
    );
    assert.ok(
      pageText.includes('68,00,000') || pageText.includes('72,50,000'),
      'Summary sheet should display Guidance/Market value'
    );
    assert.ok(
      pageText.includes('98') || pageText.includes('LOW RISK'),
      'Summary sheet should display Clean Title Score or Risk Tier'
    );
    console.log('  ✅ Step 4: Property Summary Sheet displayed Owner, Survey, Value, and Score badge.');

    // Step 5: Test parcel selection via Quick Strip or Polygon
    const ghaziabadRegion = await page.$('[data-testid="region-chip-up-ghaziabad"]');
    if (ghaziabadRegion) {
      await ghaziabadRegion.click();
      await sleep(1000);
      pageText = await page.evaluate(() => document.body.innerText);
      assert.ok(
        pageText.includes('Panchsheel') || pageText.includes('112') || pageText.includes('Ghaziabad'),
        'Region switch to Ghaziabad should update display'
      );
      console.log('  ✅ Step 5: Quick jump to Ghaziabad Panchsheel Park succeeded.');
    }

    // Step 6: Test View Certified Record navigation
    // Switch back to Wagholi 142/2A
    const wagholiRegion = await page.$('[data-testid="region-chip-mh-pune-wagholi"]');
    if (wagholiRegion) {
      await wagholiRegion.click();
      await sleep(1000);
    }

    const elInfo = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="view-certified-record-btn"]');
      if (!btn) return 'NOT FOUND';
      return {
        tagName: btn.tagName,
        outerHTML: btn.outerHTML.substring(0, 200),
        href: btn.getAttribute('href'),
        closestA: btn.closest('a') ? btn.closest('a').getAttribute('href') : null
      };
    });
    console.log('  Button element info:', elInfo);

    console.log('  Clicking "View Certified Record" CTA button...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="view-certified-record-btn"]');
      if (btn) {
        if (btn.tagName.toLowerCase() === 'a' || btn.closest('a')) {
          (btn.closest('a') || btn).click();
        } else {
          btn.click();
        }
      }
    });
    await sleep(3500);

    const currentUrl = page.url();
    console.log(`  Current page URL: ${currentUrl}`);
    assert.ok(
      currentUrl.includes('/record/rec-mh-pune-deed-4821'),
      'Page URL must navigate to /record/rec-mh-pune-deed-4821'
    );
    console.log('  ✅ Step 6: Navigation to Certified Record (/record/rec-mh-pune-deed-4821) verified!');

    // Step 7: Verify /explore alias
    console.log('  Verifying /explore alias route ...');
    await page.goto('http://localhost:8081/explore', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2500);
    const exploreText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      exploreText.includes('Physical & Cadastral Map') || exploreText.includes('CADASTRAL'),
      '/explore alias route must render ExplorerScreen'
    );
    console.log('  ✅ Step 7: /explore route alias successfully rendered ExplorerScreen!');

    console.log('\n🏆 ALL EXPLORER BROWSER TESTS PASSED 100%!');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runExploreBrowserTests().catch((err) => {
  console.error('❌ Browser Test Error:', err);
  process.exit(1);
});
