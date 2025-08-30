import { chromium, Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import { existsSync } from 'fs';

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

const prisma = new PrismaClient();

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

// Main functions
async function collectContraventionData(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  try {
    console.log('🚀 Starting data collection...');

    await navigateToInitialPage(page);
    const registersOfAppealsPage = await navigateToAppealsPage(page);
    await initializeAppealsCollection(registersOfAppealsPage);

    console.log('✅ Data collection completed successfully');
  } catch (error) {
    console.error('❌ Error collecting contravention data:', error);
    throw error;
  } finally {
    console.log('🔚 Closing browser and disconnecting...');
    await browser.close();
    await prisma.$disconnect();
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
  // Get all links on the current page
  const links = await page.$$('table.table a');
  console.log(`📑 Found ${links.length} appeals on current page`);

  for (let i = 0; i < links.length; i++) {
    console.log(`🔗 Visiting appeal details... (${i + 1}/${links.length})`);

    try {
      // Re-fetch links every time to avoid destroyed execution context issues
      const currentLinks = await page.$$('table.table a');
      if (i >= currentLinks.length) {
        console.log('⚠️ Current link no longer available, skipping');
        continue;
      }

      const currentLink = currentLinks[i];
      console.log(`Clicking on link ${i + 1}`);

      // Add retry mechanism for clicking links
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await Promise.all([
            page.waitForNavigation({
              waitUntil: 'domcontentloaded',
              timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
            }),
            currentLink.click({ timeout: WAIT_TIMES.CLICK_TIMEOUT }),
          ]);
          break; // If successful, exit retry loop
        } catch (clickError) {
          retryCount++;
          console.log(`Retry ${retryCount}/${maxRetries} for clicking link...`);
          if (retryCount === maxRetries) throw clickError;
          await page.waitForTimeout(2000); // Wait 2 seconds before retrying
        }
      }

      // Wait additional time for page to stabilize
      await page.waitForLoadState('networkidle', { timeout: 120000 }); // 2 minutes

      // Extract case details
      const caseDetails = await extractCaseDetails(page);
      await appendToCsv(caseDetails);

      // Go back and wait for navigation
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 120000, // 2 minutes
        }),
        page.goBack(),
      ]);

      // Wait for page to stabilize after going back
      await page.waitForLoadState('networkidle', { timeout: 60000 }); // 1 minute

      console.log('✅ Processed appeal details');
    } catch (error) {
      console.log('❌ Error processing appeal:', error);

      // Enhanced error recovery
      try {
        // Force navigation back to the main list if needed
        const currentUrl = page.url();
        if (currentUrl.includes('details') || currentUrl.includes('view')) {
          await page.goBack({ timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
        } else {
          await page.reload({ timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
        }
        await page.waitForLoadState('networkidle', {
          timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
        });
        await page.waitForSelector('table.table', {
          timeout: WAIT_TIMES.NAVIGATION_TIMEOUT,
        });
      } catch (recoveryError) {
        console.log(
          '❌ Recovery failed, attempting to refresh:',
          recoveryError,
        );
        await page.reload({ timeout: WAIT_TIMES.NAVIGATION_TIMEOUT });
      }

      // Wait a bit before continuing to next item
      await page.waitForTimeout(2000);
      continue;
    }
  }
}

async function getAppealsDataForDay(page: Page): Promise<boolean> {
  await waitForTableOrNoData(page);
  let hasMorePages = true;

  while (hasMorePages) {
    // await page.waitForTimeout(WAIT_TIMES.PAGE_TIMEOUT);

    await processCurrentPageAppeals(page);

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
    await handleInvalidRowsMessage(page);
    const isNoData = await checkForNoData(page);

    if (isNoData) {
      console.log('ℹ️ No data for current date, moving to previous day...');
      canContinue = await navigateToPreviousDay(page);
      continue;
    }

    const currentDate = await getCurrentDate(page);
    console.log(`📅 Processing date: ${currentDate}`);

    canContinue = await getAppealsDataForDay(page);
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

const csvWriter = createObjectCsvWriter({
  path: 'data/appeals.csv',
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
  append: existsSync('appeals.csv'),
});

async function appendToCsv(caseDetails: CaseDetails): Promise<void> {
  try {
    await csvWriter.writeRecords([caseDetails]);
    console.log('✅ Saved case details to CSV');
  } catch (error) {
    console.error('❌ Error saving to CSV:', error);
  }
}

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
