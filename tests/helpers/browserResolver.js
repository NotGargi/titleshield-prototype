/**
 * Cross-Platform Browser & Puppeteer Resolver for Landeed 2.0 Test Suites
 * Supports macOS (Darwin), Windows (win32), and Linux.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

function resolveBrowserExecutable() {
  // 1. Explicit environment variable overrides
  const envCandidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.BROWSER_PATH
  ];
  for (const envPath of envCandidates) {
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // 2. OS-specific standard binary locations
  const platform = process.platform;
  const candidates = [];

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      path.join(os.homedir(), 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser'),
      path.join(os.homedir(), 'Applications/Chromium.app/Contents/MacOS/Chromium')
    );
  } else if (platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA || '';

    candidates.push(
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    );
  } else if (platform === 'linux') {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/usr/bin/brave-browser'
    );
  } else {
    // Other UNIX-like systems
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/local/bin/chrome',
      '/usr/local/bin/chromium'
    );
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No compatible Chrome, Brave, Edge, or Chromium browser executable found on platform '${platform}'. ` +
    `Please install Google Chrome or set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH environment variable.`
  );
}

function resolvePuppeteer() {
  const possiblePaths = [
    'puppeteer-core',
    path.join(__dirname, '..', '..', 'server', 'node_modules', 'puppeteer-core'),
    path.join(__dirname, '..', 'node_modules', 'puppeteer-core'),
    path.join(process.cwd(), 'server', 'node_modules', 'puppeteer-core'),
    path.join(process.cwd(), 'node_modules', 'puppeteer-core')
  ];

  for (const p of possiblePaths) {
    try {
      return require(p);
    } catch {
      // Continue to next path candidate
    }
  }

  throw new Error('Unable to resolve puppeteer-core from server or root node_modules.');
}

if (require.main === module) {
  try {
    const browserPath = resolveBrowserExecutable();
    console.log(`✅ Successfully resolved browser executable: ${browserPath}`);
    const puppeteer = resolvePuppeteer();
    console.log(`✅ Successfully resolved puppeteer-core version: ${puppeteer.VERSION || 'loaded'}`);
  } catch (err) {
    console.error(`❌ Browser resolution failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  resolveBrowserExecutable,
  resolvePuppeteer
};
