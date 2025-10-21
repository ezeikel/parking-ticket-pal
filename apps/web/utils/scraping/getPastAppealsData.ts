import { chromium, Page, Browser } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createServerLogger } from '../../lib/logger';

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
  NAVIGATION_TIMEOUT: 120000,
  CLICK_TIMEOUT: 60000,
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

// Configuration
const CONFIG = {
  // Session management
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

  getMasterCsvPath: () => `data/master/appeals.csv`,
  getStateFilePath: (scrapeMode: 'initial' | 'daily') =>
    `${CONFIG.getDataDir(scrapeMode)}/state.json`,
  getSessionLogPath: (sessionNum: number) => {
    const date = new Date().toISOString().split('T')[0];
    return `data/sessions/${date}_session_${sessionNum}.json`;
  },
  getFailedAppealsPath: (scrapeMode: 'initial' | 'daily') =>
    `${CONFIG.getDataDir(scrapeMode)}/failed-appeals.json`,

  // Scraping parameters
  CHECKPOINT_INTERVAL: 10,
  BATCH_SIZE: 50,
  REDUCED_WAIT_TIME: 5000,

  // Error recovery
  MAX_RETRIES: 3,
  MAX_BROWSER_RESTARTS: 3,
} as const;

// Global variables
const prisma = new PrismaClient();
let browser: Browser;
let currentDataDir: string;
let csvWriter: ReturnType<typeof createObjectCsvWriter>;

// Session tracking
let sessionStartTime = Date.now();
let sessionAppealsCount = 0;
let sessionNumber = 1;

// Types
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

let pendingRecords: CaseDetails[] = [];

// ===== STATE MANAGEMENT =====

function loadState(): void {
  try {
    const stateFile = CONFIG.getStateFilePath(mode);
    if (existsSync(stateFile)) {
      const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
      scrapingState = {
        ...data,
        processedCaseReferences: new Set(data.processedCaseReferences || []),
        startTime: Date.now(),
        lastCheckpoint: Date.now(),
      };
      logger.info('Loaded scraping state', {
        total_appeals: scrapingState.totalAppealsScraped,
        last_date: scrapingState.lastProcessedDate,
      });
    } else {
      logger.info('No previous state found, starting fresh');
    }
  } catch (error) {
    logger.error('Error loading state', {}, error as Error);
  }
}

function saveState(): void {
  try {
    mkdirSync(currentDataDir, { recursive: true });

    const stateToSave = {
      ...scrapingState,
      processedCaseReferences: Array.from(scrapingState.processedCaseReferences),
    };

    const stateFile = CONFIG.getStateFilePath(mode);
    writeFileSync(stateFile, JSON.stringify(stateToSave, null, 2));

    logger.info('State saved', {
      total_appeals: scrapingState.totalAppealsScraped,
      last_date: scrapingState.lastProcessedDate,
    });
  } catch (error) {
    logger.error('Error saving state', {}, error as Error);
  }
}

function writeSessionLog(): void {
  try {
    const sessionLog = {
      sessionNumber,
      startTime: new Date(sessionStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration_minutes: Math.round((Date.now() - sessionStartTime) / 60000),
      appeals_processed: sessionAppealsCount,
      total_appeals: scrapingState.totalAppealsScraped,
      last_date: scrapingState.lastProcessedDate,
      mode,
    };

    mkdirSync('data/sessions', { recursive: true });
    const logPath = CONFIG.getSessionLogPath(sessionNumber);
    writeFileSync(logPath, JSON.stringify(sessionLog, null, 2));

    logger.info('Session log written', { session_number: sessionNumber });
  } catch (error) {
    logger.error('Error writing session log', {}, error as Error);
  }
}

function trackFailedAppeal(caseRef: string, reason: string): void {
  try {
    const failedPath = CONFIG.getFailedAppealsPath(mode);
    let failed: any[] = [];

    if (existsSync(failedPath)) {
      failed = JSON.parse(readFileSync(failedPath, 'utf-8'));
    }

    failed.push({
      caseReference: caseRef,
      failedAt: new Date().toISOString(),
      sessionNumber,
      currentDate: scrapingState.lastProcessedDate,
      reason,
      totalAppealsWhenFailed: scrapingState.totalAppealsScraped,
    });

    writeFileSync(failedPath, JSON.stringify(failed, null, 2));

    logger.warn('Failed appeal tracked', {
      case_reference: caseRef,
      reason,
      total_failed: failed.length,
    });
  } catch (error) {
    logger.error('Error tracking failed appeal', {}, error as Error);
  }
}

async function flushPendingRecords(): Promise<void> {
  if (pendingRecords.length === 0) return;

  try {
    await csvWriter.writeRecords(pendingRecords);
    logger.info('Flushed records to CSV', { count: pendingRecords.length });
    pendingRecords = [];
  } catch (error) {
    logger.error('Error flushing records', {}, error as Error);
  }
}

// ===== SESSION MANAGEMENT =====

async function checkAndRefreshSession(page: Page): Promise<Page> {
  const sessionAge = Date.now() - sessionStartTime;

  if (sessionAge >= CONFIG.SESSION_RESTART_INTERVAL) {
    logger.info('Proactive session refresh', {
      session_number: sessionNumber,
      session_age_min: Math.round(sessionAge / 60000),
      appeals_this_session: sessionAppealsCount,
      total_appeals: scrapingState.totalAppealsScraped,
    });

    await flushPendingRecords();
    saveState();
    writeSessionLog();

    const newPage = await refreshBrowserSession(page);

    sessionStartTime = Date.now();
    sessionAppealsCount = 0;
    sessionNumber += 1;

    logger.info('Session refresh complete', {
      new_session_number: sessionNumber,
    });

    return newPage;
  }

  return page;
}

async function refreshBrowserSession(oldPage: Page): Promise<Page> {
  const currentDate = scrapingState.lastProcessedDate;

  await browser.close();

  browser = await chromium.launch({ headless: CONFIG.HEADLESS });
  const newPage = await browser.newPage();

  await navigateToInitialPage(newPage);
  const registersPage = await navigateToAppealsPage(newPage);

  if (currentDate) {
    await navigateBackToDate(registersPage, currentDate);
  }

  return registersPage;
}

async function navigateBackToDate(
  page: Page,
  targetDate: string
): Promise<void> {
  logger.info('Navigating back to date', { target_date: targetDate });

  let currentDate = await getCurrentDate(page);

  while (currentDate !== targetDate) {
    const prevLink = await page.$(SELECTORS.PREV_DAY);
    if (!prevLink) {
      logger.error('Could not navigate back to date', {
        current_date: currentDate,
        target_date: targetDate,
      });
      break;
    }

    await prevLink.click();
    await page.waitForLoadState('networkidle');
    currentDate = await getCurrentDate(page);
  }

  logger.info('Successfully navigated to date', { date: currentDate });
}

// ===== ERROR RECOVERY =====

async function processAppealWithRecovery(
  page: Page,
  caseRef: string,
  linkIndex: number
): Promise<{ success: boolean; page: Page }> {
  // Phase 1: Regular retries
  for (let retry = 0; retry < CONFIG.MAX_RETRIES; retry++) {
    try {
      await processAppealLink(page, linkIndex);
      sessionAppealsCount++;
      return { success: true, page };
    } catch (error) {
      logger.warn('Appeal retry', {
        case_reference: caseRef,
        retry: retry + 1,
        max_retries: CONFIG.MAX_RETRIES,
      });

      await page.waitForTimeout(2000 * (retry + 1));

      try {
        await recoverPageState(page);
      } catch (recoveryError) {
        logger.warn('Page recovery failed', {}, recoveryError as Error);
      }
    }
  }

  // Phase 2: Browser restarts
  logger.warn('Max retries exceeded, attempting browser restarts', {
    case_reference: caseRef,
  });

  for (let restart = 0; restart < CONFIG.MAX_BROWSER_RESTARTS; restart++) {
    try {
      logger.info('Browser restart attempt', {
        case_reference: caseRef,
        restart: restart + 1,
      });

      page = await refreshBrowserSession(page);

      await processAppealLink(page, linkIndex);
      sessionAppealsCount++;

      logger.info('Success after browser restart', {
        case_reference: caseRef,
        restart_attempt: restart + 1,
      });

      return { success: true, page };
    } catch (error) {
      logger.warn('Browser restart failed', {
        case_reference: caseRef,
        restart: restart + 1,
      }, error as Error);

      await page.waitForTimeout(5000 * (restart + 1));
    }
  }

  // Phase 3: Give up
  const finalError = new Error(
    `Failed after ${CONFIG.MAX_RETRIES} retries and ${CONFIG.MAX_BROWSER_RESTARTS} restarts`
  );

  logger.error('Appeal processing completely failed', {
    case_reference: caseRef,
    total_retries: CONFIG.MAX_RETRIES,
    total_restarts: CONFIG.MAX_BROWSER_RESTARTS,
  }, finalError);

  trackFailedAppeal(caseRef, 'max_recovery_exceeded');

  return { success: false, page };
}

async function processAppealLink(page: Page, index: number): Promise<void> {
  const links = await page.$$('table.table a');
  if (index >= links.length) {
    throw new Error(`Link ${index} not found`);
  }

  const link = links[index];

  await link.click({ timeout: WAIT_TIMES.CLICK_TIMEOUT });
  await page.waitForLoadState('domcontentloaded', {
    timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
  });
  await page.waitForLoadState('networkidle', {
    timeout: CONFIG.REDUCED_WAIT_TIME,
  });

  const caseDetails = await extractCaseDetails(page);

  pendingRecords.push(caseDetails);
  scrapingState.processedCaseReferences.add(caseDetails.caseReference);
  scrapingState.totalAppealsScraped += 1;

  if (pendingRecords.length >= CONFIG.BATCH_SIZE) {
    await flushPendingRecords();
  }

  if (scrapingState.totalAppealsScraped % CONFIG.CHECKPOINT_INTERVAL === 0) {
    saveState();
  }

  await page.goBack();
  await page.waitForLoadState('domcontentloaded', {
    timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
  });
}

async function recoverPageState(page: Page): Promise<void> {
  const currentUrl = page.url();

  if (currentUrl.includes('details') || currentUrl.includes('view')) {
    await page.goBack({ timeout: 30000 });
  }

  await page.waitForSelector(SELECTORS.TABLE, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

// ===== NAVIGATION =====

async function navigateToInitialPage(page: Page): Promise<void> {
  logger.info('Navigating to initial page');
  await page.goto(URLS.INITIAL, { waitUntil: 'networkidle' });
}

async function navigateToAppealsPage(page: Page): Promise<Page> {
  logger.info('Opening appeals page');
  const [registersPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('a.btn.btn-default'),
  ]);

  await registersPage.waitForLoadState('networkidle');
  await registersPage.click(SELECTORS.BROWSE_BUTTON);
  await registersPage.waitForLoadState('networkidle');

  return registersPage;
}

// ===== DATA COLLECTION =====

async function processCurrentPageAppeals(page: Page): Promise<Page> {
  page = await checkAndRefreshSession(page);

  const caseRefs = await page.$$eval('table.table a', (links) =>
    links.map((link) => link.textContent?.trim() || '')
  );

  logger.info('Processing page appeals', {
    total_on_page: caseRefs.length,
    already_processed: caseRefs.filter((ref) =>
      scrapingState.processedCaseReferences.has(ref)
    ).length,
  });

  for (let i = 0; i < caseRefs.length; i++) {
    const caseRef = caseRefs[i];

    if (scrapingState.processedCaseReferences.has(caseRef)) {
      continue;
    }

    logger.debug('Processing appeal', {
      case_reference: caseRef,
      index: i + 1,
      total: caseRefs.length,
    });

    const result = await processAppealWithRecovery(page, caseRef, i);
    page = result.page;

    if (result.success) {
      logger.debug('Appeal processed successfully', {
        case_reference: caseRef,
        total_scraped: scrapingState.totalAppealsScraped,
      });
    }
  }

  return page;
}

async function getAppealsDataForDay(page: Page): Promise<boolean> {
  await waitForTableOrNoData(page);
  let hasMorePages = true;
  let pageNumber = 0;

  while (hasMorePages) {
    pageNumber += 1;
    scrapingState.lastProcessedPage = pageNumber;

    logger.info('Processing page', {
      page_number: pageNumber,
      date: scrapingState.lastProcessedDate,
    });

    page = await processCurrentPageAppeals(page);

    if (pageNumber % 5 === 0) {
      logProgress();
    }

    const nextPageLink = await page.$(SELECTORS.NEXT_PAGE);
    if (nextPageLink) {
      await nextPageLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector(SELECTORS.TABLE);
    } else {
      hasMorePages = false;
      logger.info('Reached last page for date', {
        date: scrapingState.lastProcessedDate,
      });
    }
  }

  scrapingState.lastProcessedPage = 0;
  return await navigateToPreviousDay(page);
}

async function navigateToPreviousDay(page: Page): Promise<boolean> {
  const prevDayLink = await page.$(SELECTORS.PREV_DAY);

  if (!prevDayLink) {
    logger.info('No more previous days available');
    return false;
  }

  logger.info('Moving to previous day');
  await prevDayLink.click();
  await page.waitForLoadState('networkidle');
  await handleInvalidRowsMessage(page);

  const isNoData = await checkForNoData(page);
  if (isNoData) {
    logger.info('No data for previous day, continuing');
    return true;
  }

  await waitForTableOrNoData(page);
  return true;
}

async function handleInvalidRowsMessage(page: Page): Promise<boolean> {
  try {
    const invalidRowsMsg = page.locator(SELECTORS.INVALID_ROWS_MSG);
    const isInvalidRowsVisible = await invalidRowsMsg.isVisible();

    if (!isInvalidRowsVisible) {
      return false;
    }

    logger.warn('Invalid rows message detected, resetting pagination');
    const resetLink = page.locator(SELECTORS.RESET_LINK);
    await resetLink.click();
    await waitForTableOrNoData(page);

    logger.info('Reset pagination successful');
    return true;
  } catch (error) {
    logger.error('Error handling invalid rows message', {}, error as Error);
    return false;
  }
}

async function getPastAppealsData(page: Page): Promise<void> {
  let canContinue = true;

  while (canContinue) {
    await handleInvalidRowsMessage(page);
    const isNoData = await checkForNoData(page);

    if (isNoData) {
      logger.info('No data for current date, moving to previous day');
      canContinue = await navigateToPreviousDay(page);
      continue;
    }

    const currentDate = await getCurrentDate(page);
    logger.info('Processing date', { date: currentDate });

    scrapingState.lastProcessedDate = currentDate || null;

    canContinue = await getAppealsDataForDay(page);

    saveState();
    await flushPendingRecords();
  }
}

// ===== UTILITY FUNCTIONS =====

async function waitForTableOrNoData(page: Page): Promise<void> {
  await Promise.race([
    page.waitForSelector(SELECTORS.TABLE),
    page.waitForSelector(SELECTORS.NO_DATA),
  ]);
}

async function checkForNoData(page: Page): Promise<boolean> {
  const noDataElement = page.locator(SELECTORS.NO_DATA);
  return await noDataElement.isVisible();
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

function logProgress(): void {
  const elapsed = Date.now() - scrapingState.startTime;
  const minutes = Math.round(elapsed / 1000 / 60);

  logger.info('Scraping progress', {
    total_appeals: scrapingState.totalAppealsScraped,
    current_date: scrapingState.lastProcessedDate,
    runtime_minutes: minutes,
    session_number: sessionNumber,
    appeals_this_session: sessionAppealsCount,
    pending_writes: pendingRecords.length,
  });
}

// ===== MAIN =====

async function collectContraventionData(): Promise<void> {
  loadState();

  mkdirSync(currentDataDir, { recursive: true });
  mkdirSync('data/master', { recursive: true });
  mkdirSync('data/sessions', { recursive: true });

  browser = await chromium.launch({ headless: CONFIG.HEADLESS });
  const page = await browser.newPage();

  try {
    logger.info('Scraping session started', {
      mode,
      headless: CONFIG.HEADLESS,
      resume_from: scrapingState.lastProcessedDate || 'beginning',
      total_already_scraped: scrapingState.totalAppealsScraped,
      data_dir: currentDataDir,
    });

    await navigateToInitialPage(page);
    const registersPage = await navigateToAppealsPage(page);
    await getPastAppealsData(registersPage);

    logger.info('Data collection completed successfully');
  } catch (error) {
    logger.error('Error collecting data', {
      appeals_processed: scrapingState.totalAppealsScraped,
      session_number: sessionNumber,
    }, error as Error);
    throw error;
  } finally {
    await flushPendingRecords();
    saveState();
    writeSessionLog();

    await browser.close();
    await prisma.$disconnect();

    logProgress();
  }
}

async function main(): Promise<void> {
  currentDataDir = CONFIG.getDataDir(mode);

  // Initialize CSV writer
  const csvPath = `${currentDataDir}/raw-appeals.csv`;
  csvWriter = createObjectCsvWriter({
    path: csvPath,
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
    append: existsSync(csvPath),
  });

  try {
    logger.info('Script started', { mode, data_dir: currentDataDir });
    await collectContraventionData();
    logger.info('Script completed successfully', {
      total_appeals: scrapingState.totalAppealsScraped,
      total_sessions: sessionNumber,
    });
  } catch (error) {
    logger.error('Script failed', {
      appeals_processed: scrapingState.totalAppealsScraped,
    }, error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
