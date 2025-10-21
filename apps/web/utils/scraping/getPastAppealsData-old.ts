import { chromium, Page, Browser } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createServerLogger } from '@/lib/logger';

// Constants
const URLS = {
  INITIAL: 'https://www.londontribunals.gov.uk/about/registers-appeals',
} as const;

const SELECTORS = {
  BROWSE_BUTTON: '#P30_ETA_BROWSE',
  TABLE: 'table.table',
  NO_DATA: '.nodatafound',
  NEXT_PAGE: 'a[title="Next page"]',
  PREV_DAY: '#P40_PREVIOUS',
  CURRENT_DATE: '#P40_CURRENT_DATE',
  INVALID_ROWS_MSG:
    'text="Invalid set of rows requested, the source data of the report has been modified."',
  RESET_LINK: '.msg a, .msg >> a',
} as const;

const WAIT_TIMES = {
  PAGE_TIMEOUT: 1000,
  NAVIGATION_TIMEOUT: 120000, // Increased to 120 seconds
  CLICK_TIMEOUT: 60000, // New timeout for click actions
} as const;

// Mode detection
const mode = process.argv.includes('--daily') ? 'daily' : 'initial';

// Logger setup
const logger = createServerLogger({
  action: 'london_tribunal_scraping',
  scraper_type: mode,
  scraper_version: '2.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Configuration for optimization
const CONFIG = {
  // Session management - proactive browser restart every 45 min
  SESSION_RESTART_INTERVAL: 45 * 60 * 1000, // 45 minutes

  // Environment-based headless mode
  HEADLESS: process.env.NODE_ENV === 'production' || process.env.CI === 'true',

  // Directory structure
  getDataDir: (scrapeMode: 'initial' | 'daily') => {
    const date = new Date().toISOString().split('T')[0];
    return scrapeMode === 'initial'
      ? `data/scrapes/initial-${date}`
      : `data/scrapes/daily-${date}`;
  },

  MASTER_DIR: 'data/master',
  SESSIONS_DIR: 'data/sessions',

  // Scraping parameters
  CHECKPOINT_INTERVAL: 10, // Save state every 10 appeals
  BATCH_SIZE: 50, // Write CSV in batches
  REDUCED_WAIT_TIME: 5000, // Reduced wait time for faster scraping

  // Error recovery
  MAX_RETRIES: 3,
  MAX_BROWSER_RESTARTS: 3,
} as const;

// Global variables
const prisma = new PrismaClient();
let browser: Browser;
let currentDataDir: string;

// Session tracking
let sessionStartTime = Date.now();
let sessionAppealsCount = 0;
let sessionNumber = 1;

// State management
interface ScrapingState {
  lastProcessedDate: string | null;
  lastProcessedPage: number;
  processedCaseReferences: Set<string>;
  totalAppealsScraped: number;
  startTime: number;
  lastCheckpoint: number;
}

let scrapingState: ScrapingState = {
  lastProcessedDate: null,
  lastProcessedPage: 0,
  processedCaseReferences: new Set(),
  totalAppealsScraped: 0,
  startTime: Date.now(),
  lastCheckpoint: Date.now(),
};

// Pending records buffer for batch writing
let pendingRecords: CaseDetails[] = [];

type CaseDetails = {
  caseReference: string;
  declarant: string;
  authority: string;
  vrm: string;
  pcn: string;
  contraventionDate: string;
  contraventionTime: string;
  contraventionLocation: string;
  penaltyAmount: string;
  contravention: string;
  referralDate: string;
  decisionDate: string;
  adjudicator: string;
  appealDecision: string;
  direction: string;
  reasons: string;
};

// State management functions
function loadState(): void {
  try {
    if (existsSync(CONFIG.STATE_FILE)) {
      const data = JSON.parse(readFileSync(CONFIG.STATE_FILE, 'utf-8'));
      scrapingState = {
        ...data,
        processedCaseReferences: new Set(data.processedCaseReferences || []),
        startTime: Date.now(), // Reset start time for this run
        lastCheckpoint: Date.now(),
      };
      console.log(`📂 Loaded state: ${scrapingState.totalAppealsScraped} appeals scraped, last date: ${scrapingState.lastProcessedDate}`);
    } else {
      console.log('📂 No previous state found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Error loading state:', error);
    console.log('Starting fresh...');
  }
}

function saveState(): void {
  try {
    // Ensure data directory exists
    if (!existsSync(CONFIG.DATA_DIR)) {
      mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    }

    const stateToSave = {
      ...scrapingState,
      processedCaseReferences: Array.from(scrapingState.processedCaseReferences),
    };

    writeFileSync(CONFIG.STATE_FILE, JSON.stringify(stateToSave, null, 2));
    console.log(`💾 State saved: ${scrapingState.totalAppealsScraped} appeals, last date: ${scrapingState.lastProcessedDate}`);
  } catch (error) {
    console.error('❌ Error saving state:', error);
  }
}

function shouldStopDueToTimeout(): boolean {
  const elapsed = Date.now() - scrapingState.startTime;
  const remaining = CONFIG.MAX_RUNTIME_MS - elapsed;

  if (remaining < 5 * 60 * 1000) { // Less than 5 minutes remaining
    console.log(`⏰ Approaching timeout (${Math.round(remaining / 1000 / 60)} minutes remaining). Stopping gracefully...`);
    return true;
  }

  return false;
}

function logProgress(): void {
  const elapsed = Date.now() - scrapingState.startTime;
  const minutes = Math.round(elapsed / 1000 / 60);
  const remaining = Math.round((CONFIG.MAX_RUNTIME_MS - elapsed) / 1000 / 60);

  console.log(`
📊 Progress Report:
   - Total appeals scraped: ${scrapingState.totalAppealsScraped}
   - Current date: ${scrapingState.lastProcessedDate}
   - Runtime: ${minutes} minutes (${remaining} minutes remaining)
   - Pending writes: ${pendingRecords.length} records
  `);
}

async function flushPendingRecords(): Promise<void> {
  if (pendingRecords.length === 0) return;

  try {
    await csvWriter.writeRecords(pendingRecords);
    console.log(`💾 Flushed ${pendingRecords.length} records to CSV`);
    pendingRecords = [];
  } catch (error) {
    console.error('❌ Error flushing records:', error);
  }
}

// Main functions
async function collectContraventionData(): Promise<void> {
  // Load previous state if exists
  loadState();

  // Ensure data directory exists
  if (!existsSync(CONFIG.DATA_DIR)) {
    mkdirSync(CONFIG.DATA_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  try {
    console.log('🚀 Starting data collection...');
    console.log(`📊 Resuming from: ${scrapingState.lastProcessedDate || 'beginning'}`);

    await navigateToInitialPage(page);
    const registersOfAppealsPage = await navigateToAppealsPage(page);
    await initializeAppealsCollection(registersOfAppealsPage);

    console.log('✅ Data collection completed successfully');
  } catch (error) {
    console.error('❌ Error collecting contravention data:', error);
    throw error;
  } finally {
    // Flush any remaining records
    await flushPendingRecords();

    // Save final state
    saveState();

    console.log('🔚 Closing browser and disconnecting...');
    await browser.close();
    await prisma.$disconnect();

    logProgress();
  }
}

// Navigation functions
async function navigateToInitialPage(page: Page): Promise<void> {
  console.log('🌐 Navigating to initial page...');
  await page.goto(URLS.INITIAL, { waitUntil: 'networkidle' });
}

async function navigateToAppealsPage(page: Page): Promise<Page> {
  console.log('🔄 Opening appeals page...');
  const [registersOfAppealsPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('a.btn.btn-default'),
  ]);

  await registersOfAppealsPage.waitForLoadState('networkidle');
  await registersOfAppealsPage.click(SELECTORS.BROWSE_BUTTON);
  await registersOfAppealsPage.waitForLoadState('networkidle');

  return registersOfAppealsPage;
}

async function initializeAppealsCollection(page: Page): Promise<void> {
  console.log('📊 Initializing appeals data collection...');
  await getPastAppealsData(page);
}

// Data collection functions
async function processCurrentPageAppeals(page: Page): Promise<void> {
  // Check timeout before processing
  if (shouldStopDueToTimeout()) {
    throw new Error('TIMEOUT_REACHED');
  }

  // Get all case references on the page first
  const caseRefs = await page.$$eval('table.table a', (links) =>
    links.map((link) => link.textContent?.trim() || '')
  );

  console.log(`📑 Found ${caseRefs.length} appeals on current page`);

  // Filter out already processed cases
  const unprocessedRefs = caseRefs.filter(
    (ref) => !scrapingState.processedCaseReferences.has(ref)
  );

  console.log(`🆕 ${unprocessedRefs.length} new appeals to process (${caseRefs.length - unprocessedRefs.length} already processed)`);

  // Process appeals sequentially (more reliable than concurrent)
  for (let i = 0; i < caseRefs.length; i += 1) {
    const caseRef = caseRefs[i];

    // Skip if already processed
    if (scrapingState.processedCaseReferences.has(caseRef)) {
      console.log(`⏭️ Skipping already processed: ${caseRef}`);
      continue;
    }

    console.log(`🔗 Processing appeal ${i + 1}/${caseRefs.length}: ${caseRef}`);

    try {
      // Re-fetch links to avoid stale references
      const currentLinks = await page.$$('table.table a');
      if (i >= currentLinks.length) {
        console.log(`⚠️ Link ${i} no longer available, skipping`);
        continue;
      }

      const currentLink = currentLinks[i];

      // Navigate to detail page with retry
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await currentLink.click({ timeout: WAIT_TIMES.CLICK_TIMEOUT });
          await page.waitForLoadState('domcontentloaded', { timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
          break;
        } catch (clickError) {
          retryCount += 1;
          console.log(`Retry ${retryCount}/${maxRetries} for ${caseRef}...`);
          if (retryCount === maxRetries) throw clickError;
          await page.waitForTimeout(2000);
        }
      }

      // Wait for page to load (reduced wait time)
      await page.waitForLoadState('networkidle', { timeout: CONFIG.REDUCED_WAIT_TIME });

      // Extract case details
      const caseDetails = await extractCaseDetails(page);

      // Add to pending records
      pendingRecords.push(caseDetails);
      scrapingState.processedCaseReferences.add(caseRef);
      scrapingState.totalAppealsScraped += 1;

      // Flush batch if needed
      if (pendingRecords.length >= CONFIG.BATCH_SIZE) {
        await flushPendingRecords();
      }

      // Checkpoint periodically
      if (scrapingState.totalAppealsScraped % CONFIG.CHECKPOINT_INTERVAL === 0) {
        saveState();
      }

      // Go back
      await page.goBack();
      await page.waitForLoadState('domcontentloaded', { timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });

      console.log(`✅ Processed ${caseRef} (Total: ${scrapingState.totalAppealsScraped})`);
    } catch (error) {
      console.log(`❌ Error processing ${caseRef}:`, error);

      // Error recovery
      try {
        const currentUrl = page.url();
        if (currentUrl.includes('details') || currentUrl.includes('view')) {
          await page.goBack({ timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
        }
        await page.waitForLoadState('networkidle', {
          timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
        });
        await page.waitForSelector('table.table', {
          timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
        });
      } catch (recoveryError) {
        console.log('❌ Recovery failed:', recoveryError);
        await page.reload({ timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
      }

      await page.waitForTimeout(2000);
    }
  }
}

async function getAppealsDataForDay(page: Page): Promise<boolean> {
  await waitForTableOrNoData(page);
  let hasMorePages = true;
  let pageNumber = 0;

  while (hasMorePages) {
    // Check timeout
    if (shouldStopDueToTimeout()) {
      console.log('⏰ Timeout reached, saving progress...');
      throw new Error('TIMEOUT_REACHED');
    }

    pageNumber += 1;
    scrapingState.lastProcessedPage = pageNumber;

    console.log(`📄 Processing page ${pageNumber} for date: ${scrapingState.lastProcessedDate}`);

    await processCurrentPageAppeals(page);

    // Log progress every few pages
    if (pageNumber % 5 === 0) {
      logProgress();
    }

    // Check for next page
    const nextPageLink = await page.$(SELECTORS.NEXT_PAGE);
    if (nextPageLink) {
      console.log('📄 Navigating to next page...');
      await nextPageLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector(SELECTORS.TABLE);
    } else {
      hasMorePages = false;
      console.log('📌 Reached last page for current date');
    }
  }

  // Reset page number for next date
  scrapingState.lastProcessedPage = 0;

  return await navigateToPreviousDay(page);
}

async function navigateToPreviousDay(page: Page): Promise<boolean> {
  const prevDayLink = await page.$(SELECTORS.PREV_DAY);

  if (!prevDayLink) {
    console.log('🏁 No more previous days available');
    return false;
  }

  console.log('⬅️ Moving to previous day...');
  await prevDayLink.click();
  await page.waitForLoadState('networkidle');
  await handleInvalidRowsMessage(page);

  const isNoData = await checkForNoData(page);
  if (isNoData) {
    console.log('ℹ️ No data for previous day, continuing...');
    return true;
  }

  await waitForTableOrNoData(page);
  return true;
}

async function handleInvalidRowsMessage(page: Page): Promise<boolean> {
  console.log('🔍 Checking for invalid rows message...');

  try {
    const invalidRowsMsg = page.locator(SELECTORS.INVALID_ROWS_MSG);
    const isInvalidRowsVisible = await invalidRowsMsg.isVisible();

    if (!isInvalidRowsVisible) {
      console.log('✅ No invalid rows message detected');
      return false;
    }

    console.log('⚠️ Invalid rows message detected, resetting pagination...');
    const resetLink = page.locator(SELECTORS.RESET_LINK);
    await resetLink.click();
    await waitForTableOrNoData(page);

    const isMsgStillVisible = await invalidRowsMsg.isVisible();
    if (isMsgStillVisible) {
      throw new Error('Failed to reset pagination');
    }

    console.log('✅ Reset pagination successful');
    return true;
  } catch (error) {
    console.error('❌ Error handling invalid rows message:', error);
    console.log('Current page HTML:', await page.content());
    return false;
  }
}

async function getPastAppealsData(page: Page): Promise<void> {
  let canContinue = true;

  while (canContinue) {
    try {
      // Check timeout
      if (shouldStopDueToTimeout()) {
        console.log('⏰ Timeout reached, stopping gracefully...');
        break;
      }

      await handleInvalidRowsMessage(page);
      const isNoData = await checkForNoData(page);

      if (isNoData) {
        console.log('ℹ️ No data for current date, moving to previous day...');
        canContinue = await navigateToPreviousDay(page);
        continue;
      }

      const currentDate = await getCurrentDate(page);
      console.log(`📅 Processing date: ${currentDate}`);

      // Update state with current date
      scrapingState.lastProcessedDate = currentDate || null;

      canContinue = await getAppealsDataForDay(page);

      // Save state after completing a day
      saveState();
      await flushPendingRecords();

    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT_REACHED') {
        console.log('⏰ Gracefully stopping due to timeout');
        break;
      }
      throw error;
    }
  }
}

// Utility functions
async function waitForTableOrNoData(page: Page): Promise<void> {
  await Promise.race([
    page.waitForSelector(SELECTORS.TABLE),
    page.waitForSelector(SELECTORS.NO_DATA),
  ]);
}

async function checkForNoData(page: Page): Promise<boolean> {
  console.log('🔍 Checking for no data...');
  const noDataElement = page.locator(SELECTORS.NO_DATA);
  const isNoDataVisible = await noDataElement.isVisible();
  console.log('isNoDataVisible:', isNoDataVisible);
  return isNoDataVisible;
}

async function getCurrentDate(page: Page): Promise<string | undefined> {
  const dateElement = await page.$(SELECTORS.CURRENT_DATE);
  return await dateElement?.evaluate((el) => el.textContent?.trim());
}

async function extractCaseDetails(page: Page): Promise<CaseDetails> {
  const getTableCellContent = async (label: string) => {
    const row = await page.$(`tr:has(th:text-is("${label}"))`);
    if (!row) return '';
    const cell = await row.$('td');
    return cell ? ((await cell.textContent()) || '').trim() : '';
  };

  return {
    caseReference: await getTableCellContent('Case reference'),
    declarant: await getTableCellContent('Declarant'),
    authority: await getTableCellContent('Authority'),
    vrm: await getTableCellContent('VRM'),
    pcn: await getTableCellContent('PCN'),
    contraventionDate: await getTableCellContent('Contravention date'),
    contraventionTime: await getTableCellContent('Contravention time'),
    contraventionLocation: await getTableCellContent('Contravention location'),
    penaltyAmount: await getTableCellContent('Penalty amount'),
    contravention: await getTableCellContent('Contravention'),
    referralDate: await getTableCellContent('Referral date'),
    decisionDate: await getTableCellContent('Decision Date'),
    adjudicator: await getTableCellContent('Adjudicator'),
    appealDecision: await getTableCellContent('Appeal decision'),
    direction: await getTableCellContent('Direction'),
    reasons: await getTableCellContent('Reasons'),
  };
}

// Initialize CSV writer
const csvWriter = createObjectCsvWriter({
  path: CONFIG.CSV_FILE,
  header: [
    { id: 'caseReference', title: 'Case Reference' },
    { id: 'declarant', title: 'Declarant' },
    { id: 'authority', title: 'Authority' },
    { id: 'vrm', title: 'VRM' },
    { id: 'pcn', title: 'PCN' },
    { id: 'contraventionDate', title: 'Contravention Date' },
    { id: 'contraventionTime', title: 'Contravention Time' },
    { id: 'contraventionLocation', title: 'Contravention Location' },
    { id: 'penaltyAmount', title: 'Penalty Amount' },
    { id: 'contravention', title: 'Contravention' },
    { id: 'referralDate', title: 'Referral Date' },
    { id: 'decisionDate', title: 'Decision Date' },
    { id: 'adjudicator', title: 'Adjudicator' },
    { id: 'appealDecision', title: 'Appeal Decision' },
    { id: 'direction', title: 'Direction' },
    { id: 'reasons', title: 'Reasons' },
  ],
  append: existsSync(CONFIG.CSV_FILE),
});

// Entry point
async function main(): Promise<void> {
  try {
    console.log('🎬 Starting script...');
    await collectContraventionData();
    console.log('🎉 Script completed successfully');
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Only run if this file is being run directly
if (require.main === module) {
  main();
}
