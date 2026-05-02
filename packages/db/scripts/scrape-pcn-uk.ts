/**
 * Scrape PenaltyChargeNotice.co.uk
 *
 * Logs in, discovers all contravention code pages and supporting pages,
 * then extracts structured data (legal arguments, adjudicator decisions,
 * sign requirements, grounds of appeal) and saves as JSON + raw HTML.
 *
 * Usage:
 *   cd packages/db
 *   PCN_UK_EMAIL=xxx PCN_UK_PASSWORD=xxx pnpm tsx scripts/scrape-pcn-uk.ts
 *
 *   # Scrape a single code for testing:
 *   PCN_UK_EMAIL=xxx PCN_UK_PASSWORD=xxx pnpm tsx scripts/scrape-pcn-uk.ts --code 01
 *
 *   # Only scrape "other" pages (adjudicator decisions, templates, etc.):
 *   PCN_UK_EMAIL=xxx PCN_UK_PASSWORD=xxx pnpm tsx scripts/scrape-pcn-uk.ts --other-only
 */

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://penaltychargenotice.co.uk';
const OUTPUT_DIR = join(__dirname, '../data/pcn-uk');
const HTML_DIR = join(OUTPUT_DIR, 'html');

const EMAIL = process.env.PCN_UK_EMAIL;
const PASSWORD = process.env.PCN_UK_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set PCN_UK_EMAIL and PCN_UK_PASSWORD env vars');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(HTML_DIR, { recursive: true });

// Parse CLI args
const SINGLE_CODE = process.argv.find((a) => a === '--code')
  ? process.argv[process.argv.indexOf('--code') + 1]
  : null;
const OTHER_ONLY = process.argv.includes('--other-only');

// Session state
let sessionCookies = '';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================
// HTTP helpers
// ============================================

async function fetchPage(url: string): Promise<{ html: string; status: number }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      Cookie: sessionCookies,
    },
    redirect: 'follow',
  });

  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    const newCookies = setCookies.map((c) => c.split(';')[0]).join('; ');
    sessionCookies = sessionCookies ? `${sessionCookies}; ${newCookies}` : newCookies;
  }

  return { html: await response.text(), status: response.status };
}

async function login(): Promise<boolean> {
  console.log('🔑 Logging in...');

  // GET login page to get nonce
  const loginPageRes = await fetch(`${BASE_URL}/login/`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });

  const loginPageCookies = loginPageRes.headers.getSetCookie?.() ?? [];
  if (loginPageCookies.length > 0) {
    sessionCookies = loginPageCookies.map((c) => c.split(';')[0]).join('; ');
  }

  const loginHtml = await loginPageRes.text();
  const $ = cheerio.load(loginHtml);

  const nonce = $('input[name="_mgmnonce_user_login"]').attr('value') ?? '';

  // POST login form
  const loginFormData = new URLSearchParams();
  loginFormData.set('log', EMAIL);
  loginFormData.set('pwd', PASSWORD);
  loginFormData.set('rememberme', 'forever');
  loginFormData.set('wp-submit', 'Log In');
  loginFormData.set('testcookie', '1');
  loginFormData.set('redirect_to', '');
  loginFormData.set('_mgmnonce_user_login', nonce);
  loginFormData.set('_wp_http_referer', '/login/');

  const loginRes = await fetch(`${BASE_URL}/login/`, {
    method: 'POST',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: sessionCookies + '; wordpress_test_cookie=WP+Cookie+check',
      Referer: `${BASE_URL}/login/`,
    },
    body: loginFormData.toString(),
    redirect: 'manual',
  });

  // Capture cookies
  const loginSetCookies = loginRes.headers.getSetCookie?.() ?? [];
  if (loginSetCookies.length > 0) {
    const newCookies = loginSetCookies.map((c) => c.split(';')[0]).join('; ');
    sessionCookies = sessionCookies ? `${sessionCookies}; ${newCookies}` : newCookies;
  }

  // Follow redirect chain
  let redirectUrl = loginRes.headers.get('location');
  let redirectCount = 0;
  while (redirectUrl && redirectCount < 5) {
    redirectCount++;
    const fullUrl = redirectUrl.startsWith('http') ? redirectUrl : `${BASE_URL}${redirectUrl}`;
    const redirectRes = await fetch(fullUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Cookie: sessionCookies + '; wordpress_test_cookie=WP+Cookie+check',
      },
      redirect: 'manual',
    });

    const redirectCookies = redirectRes.headers.getSetCookie?.() ?? [];
    if (redirectCookies.length > 0) {
      const newCookies = redirectCookies.map((c) => c.split(';')[0]).join('; ');
      sessionCookies = sessionCookies ? `${sessionCookies}; ${newCookies}` : newCookies;
    }

    redirectUrl = redirectRes.headers.get('location');
  }

  const isLoggedIn = sessionCookies.includes('wordpress_logged_in');
  console.log(isLoggedIn ? '   ✅ Login successful' : '   ❌ Login failed');
  return isLoggedIn;
}

// ============================================
// Types
// ============================================

type ScrapedSection = {
  heading: string;
  content: string; // Plain text content
  contentHtml: string; // Raw HTML of the section
  images: Array<{ src: string; alt: string }>;
  isPremium: boolean; // Whether this was behind the member gate
};

type ScrapedContraventionPage = {
  code: string;
  url: string;
  pageTitle: string;
  contraventionDescription: string; // The H2 description of the contravention
  category: 'parking' | 'moving-traffic' | 'bus-lane' | 'other';
  sections: ScrapedSection[];
  scrapedAt: string;
};

type ScrapedOtherPage = {
  url: string;
  pageTitle: string;
  pageType: string; // adjudicator-decisions, letter-template, statutory-grounds, faq, etc.
  sections: ScrapedSection[];
  scrapedAt: string;
};

// ============================================
// Parsing
// ============================================

function parseContraventionPage(
  html: string,
  url: string,
  code: string,
): ScrapedContraventionPage {
  const $ = cheerio.load(html);
  const entry = $('.entry.clearfix').first();
  const pageTitle = $('h1').first().text().trim();

  // Determine category from URL
  let category: ScrapedContraventionPage['category'] = 'other';
  if (url.includes('/parking/') || url.includes('contraventions-for-parking')) {
    category = 'parking';
  } else if (url.includes('/moving-traffic') || url.includes('contraventions-for-moving-traffic')) {
    category = 'moving-traffic';
  } else if (url.includes('/bus-lane')) {
    category = 'bus-lane';
  }

  // The first H2 is the contravention description
  const contraventionDescription = entry.find('h2').first().text().trim();

  // Check if we're inside premium content
  let inPremium = false;
  const sections: ScrapedSection[] = [];

  // Walk through headings and collect content between them
  entry.find('h2, h3').each((_, headingEl) => {
    const $heading = $(headingEl);
    const heading = $heading.text().trim();

    // Skip boilerplate headings
    if (
      heading === 'Go to top' ||
      heading.includes('You need to be logged in')
    ) {
      return;
    }

    // Check if this heading or its parent is inside mgm_private_access
    if ($heading.closest('.mgm_private_access').length > 0) {
      inPremium = true;
    }

    // Collect content between this heading and the next heading
    const contentParts: string[] = [];
    const htmlParts: string[] = [];
    const images: Array<{ src: string; alt: string }> = [];

    let $next = $heading.next();
    while ($next.length && !$next.is('h2, h3')) {
      // Skip su-divider (visual separators)
      if ($next.hasClass('su-divider')) {
        $next = $next.next();
        continue;
      }

      // Check if we're entering premium area
      if ($next.hasClass('mgm_private_access')) {
        inPremium = true;
      }

      // Extract images
      $next.find('img').each((_, img) => {
        const src = $(img).attr('src') ?? '';
        const alt = $(img).attr('alt') ?? '';
        if (src && !src.includes('addthis') && !src.includes('social')) {
          images.push({ src, alt });
        }
      });

      const text = $next.text().trim();
      if (text && text !== 'Go to top') {
        contentParts.push(text);
      }

      const outerHtml = $.html($next);
      if (outerHtml) {
        htmlParts.push(outerHtml);
      }

      $next = $next.next();
    }

    const content = contentParts.join('\n').trim();
    const contentHtml = htmlParts.join('\n').trim();

    if (content.length > 20 || images.length > 0) {
      sections.push({
        heading,
        content,
        contentHtml,
        images,
        isPremium: inPremium,
      });
    }
  });

  // Also check for any content inside mgm_private_access that might not be under a heading
  entry.find('.mgm_private_access').each((_, el) => {
    const $el = $(el);
    // If it has headings inside, those were already captured above
    // Only capture if it's a standalone block without its own headings
    if ($el.find('h2, h3').length === 0) {
      const text = $el.text().trim();
      const htmlContent = $el.html() ?? '';
      const imgs: Array<{ src: string; alt: string }> = [];

      $el.find('img').each((_, img) => {
        const src = $(img).attr('src') ?? '';
        const alt = $(img).attr('alt') ?? '';
        if (src && !src.includes('addthis')) {
          imgs.push({ src, alt });
        }
      });

      if (text.length > 20 || imgs.length > 0) {
        sections.push({
          heading: '(Premium content)',
          content: text,
          contentHtml: htmlContent,
          images: imgs,
          isPremium: true,
        });
      }
    }
  });

  return {
    code,
    url,
    pageTitle,
    contraventionDescription,
    category,
    sections,
    scrapedAt: new Date().toISOString(),
  };
}

function parseOtherPage(html: string, url: string, pageType: string): ScrapedOtherPage {
  const $ = cheerio.load(html);
  const entry = $('.entry.clearfix').first();
  const pageTitle = $('h1').first().text().trim();

  const sections: ScrapedSection[] = [];
  let inPremium = false;

  entry.find('h2, h3').each((_, headingEl) => {
    const $heading = $(headingEl);
    const heading = $heading.text().trim();

    if (heading === 'Go to top' || heading.includes('You need to be logged in')) {
      return;
    }

    if ($heading.closest('.mgm_private_access').length > 0) {
      inPremium = true;
    }

    const contentParts: string[] = [];
    const htmlParts: string[] = [];
    const images: Array<{ src: string; alt: string }> = [];

    let $next = $heading.next();
    while ($next.length && !$next.is('h2, h3')) {
      if ($next.hasClass('su-divider')) {
        $next = $next.next();
        continue;
      }
      if ($next.hasClass('mgm_private_access')) {
        inPremium = true;
      }

      $next.find('img').each((_, img) => {
        const src = $(img).attr('src') ?? '';
        const alt = $(img).attr('alt') ?? '';
        if (src && !src.includes('addthis') && !src.includes('social')) {
          images.push({ src, alt });
        }
      });

      const text = $next.text().trim();
      if (text && text !== 'Go to top') {
        contentParts.push(text);
      }

      const outerHtml = $.html($next);
      if (outerHtml) {
        htmlParts.push(outerHtml);
      }

      $next = $next.next();
    }

    const content = contentParts.join('\n').trim();
    const contentHtml = htmlParts.join('\n').trim();

    if (content.length > 20 || images.length > 0) {
      sections.push({
        heading,
        content,
        contentHtml,
        images,
        isPremium: inPremium,
      });
    }
  });

  // Fallback: if no headings found, grab all content
  if (sections.length === 0) {
    const text = entry.text().trim();
    const htmlContent = entry.html() ?? '';
    if (text.length > 20) {
      sections.push({
        heading: pageTitle,
        content: text,
        contentHtml: htmlContent,
        images: [],
        isPremium: false,
      });
    }
  }

  return {
    url,
    pageTitle,
    pageType,
    sections,
    scrapedAt: new Date().toISOString(),
  };
}

// ============================================
// Discovery
// ============================================

async function discoverPages(): Promise<{
  contraventionPages: Array<{ url: string; title: string; code: string }>;
  otherPages: Array<{ url: string; title: string; pageType: string }>;
}> {
  // Try to load cached discovery
  const discoveryPath = join(OUTPUT_DIR, 'recon-discovery.json');
  if (existsSync(discoveryPath) && !SINGLE_CODE) {
    console.log('📂 Using cached discovery from recon...');
    const cached = JSON.parse(readFileSync(discoveryPath, 'utf-8'));
    if (cached.loggedIn) {
      // Map other pages to include pageType
      const otherPages = (cached.otherPages as Array<{ url: string; title: string }>).map(
        (p) => ({
          ...p,
          pageType: inferPageType(p.url, p.title),
        }),
      );
      return { contraventionPages: cached.contraventionPages, otherPages };
    }
  }

  console.log('📂 Discovering pages...');
  const contraventionPages: Array<{ url: string; title: string; code: string }> = [];
  const otherPages: Array<{ url: string; title: string; pageType: string }> = [];

  const categoryUrls = [
    '/parking/',
    '/parking/contraventions-for-parking/',
    '/moving-traffic-contraventions/',
    '/moving-traffic-contraventions/contraventions-for-moving-traffic/',
    '/bus-lanes/',
    '/congestion-charging/',
    '/private-land-enforcement/',
    '/cctv-enforcement/',
    '/free-letter-templates/',
    '/parking/parking-faqs/',
    '/parking/received-a-parking-ticket/',
    '/traffic-signs-lines/',
  ];

  for (const path of categoryUrls) {
    const url = `${BASE_URL}${path}`;
    const { html, status } = await fetchPage(url);
    if (status !== 200) continue;

    const $ = cheerio.load(html);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const text = $(el).text().trim();

      if (href.includes('contravention-code-') || href.match(/\/code-\d/)) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        const codeMatch = href.match(/code[- ](\d+)/i);
        const code = codeMatch?.[1] ?? 'unknown';
        if (!contraventionPages.some((p) => p.url === fullUrl)) {
          contraventionPages.push({ url: fullUrl, title: text, code });
        }
      }
    });

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const text = $(el).text().trim();
      if (
        href.startsWith(BASE_URL) ||
        (href.startsWith('/') && !href.startsWith('//'))
      ) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        if (
          (href.includes('template') ||
            href.includes('letter') ||
            href.includes('case-stud') ||
            href.includes('adjudicator') ||
            href.includes('appeal') ||
            href.includes('challenge') ||
            href.includes('representation') ||
            href.includes('statutory-grounds') ||
            href.includes('faqs') ||
            href.includes('enforcement-process') ||
            href.includes('success')) &&
          !otherPages.some((p) => p.url === fullUrl) &&
          !contraventionPages.some((p) => p.url === fullUrl) &&
          !fullUrl.includes('/login') &&
          !fullUrl.includes('/register')
        ) {
          otherPages.push({
            url: fullUrl,
            title: text,
            pageType: inferPageType(fullUrl, text),
          });
        }
      }
    });

    await delay(1500);
  }

  return { contraventionPages, otherPages };
}

function inferPageType(url: string, title: string): string {
  const combined = `${url} ${title}`.toLowerCase();
  if (combined.includes('adjudicator') && combined.includes('decision'))
    return 'adjudicator-decisions';
  if (combined.includes('template') || combined.includes('letter'))
    return 'letter-template';
  if (combined.includes('statutory') && combined.includes('ground'))
    return 'statutory-grounds';
  if (combined.includes('faq')) return 'faq';
  if (combined.includes('representation')) return 'representations';
  if (combined.includes('appeal')) return 'appeals-guidance';
  if (combined.includes('enforcement-process')) return 'enforcement-process';
  if (combined.includes('success')) return 'success-stories';
  return 'other';
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🕷️  PenaltyChargeNotice.co.uk Scraper\n');

  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Login failed — cannot scrape premium content');
    process.exit(1);
  }

  const { contraventionPages, otherPages } = await discoverPages();

  console.log(`\n📊 Found ${contraventionPages.length} contravention pages, ${otherPages.length} other pages\n`);

  // Filter if single code requested
  const codesToScrape = SINGLE_CODE
    ? contraventionPages.filter((p) => p.code === SINGLE_CODE)
    : contraventionPages;

  if (SINGLE_CODE && codesToScrape.length === 0) {
    console.error(`No page found for code ${SINGLE_CODE}`);
    process.exit(1);
  }

  // Scrape contravention pages
  if (!OTHER_ONLY) {
    console.log(`\n📄 Scraping ${codesToScrape.length} contravention pages...\n`);
    const allContravention: ScrapedContraventionPage[] = [];

    for (const page of codesToScrape) {
      console.log(`   Code ${page.code}: ${page.url}`);

      try {
        const { html, status } = await fetchPage(page.url);
        if (status !== 200) {
          console.log(`   ⚠️  HTTP ${status}`);
          continue;
        }

        // Save raw HTML
        const htmlFilename = `code-${page.code.padStart(2, '0')}.html`;
        writeFileSync(join(HTML_DIR, htmlFilename), html);

        // Parse and save JSON
        const scraped = parseContraventionPage(html, page.url, page.code);
        allContravention.push(scraped);

        const jsonFilename = `code-${page.code.padStart(2, '0')}.json`;
        writeFileSync(join(OUTPUT_DIR, jsonFilename), JSON.stringify(scraped, null, 2));

        const premiumSections = scraped.sections.filter((s) => s.isPremium).length;
        const totalImages = scraped.sections.reduce((sum, s) => sum + s.images.length, 0);
        console.log(
          `   ✅ ${scraped.sections.length} sections (${premiumSections} premium), ${totalImages} images`,
        );
      } catch (err) {
        console.error(`   ❌ Error: ${(err as Error).message}`);
      }

      await delay(1500);
    }

    // Save index
    const indexPath = join(OUTPUT_DIR, 'contravention-index.json');
    writeFileSync(
      indexPath,
      JSON.stringify(
        {
          scrapedAt: new Date().toISOString(),
          count: allContravention.length,
          pages: allContravention.map((p) => ({
            code: p.code,
            url: p.url,
            pageTitle: p.pageTitle,
            contraventionDescription: p.contraventionDescription,
            category: p.category,
            sectionCount: p.sections.length,
            premiumSections: p.sections.filter((s) => s.isPremium).length,
            totalImages: p.sections.reduce((sum, s) => sum + s.images.length, 0),
          })),
        },
        null,
        2,
      ),
    );

    console.log(`\n📝 Saved contravention index: ${indexPath}`);
  }

  // Scrape other pages
  console.log(`\n📄 Scraping ${otherPages.length} other pages...\n`);
  const allOther: ScrapedOtherPage[] = [];

  for (const page of otherPages) {
    console.log(`   ${page.pageType}: ${page.url}`);

    try {
      const { html, status } = await fetchPage(page.url);
      if (status !== 200) {
        console.log(`   ⚠️  HTTP ${status}`);
        continue;
      }

      // Save raw HTML
      const slug = page.url
        .replace(BASE_URL, '')
        .replace(/\//g, '_')
        .replace(/^_/, '')
        .replace(/_$/, '');
      writeFileSync(join(HTML_DIR, `other-${slug}.html`), html);

      // Parse and save JSON
      const scraped = parseOtherPage(html, page.url, page.pageType);
      allOther.push(scraped);

      writeFileSync(
        join(OUTPUT_DIR, `other-${slug}.json`),
        JSON.stringify(scraped, null, 2),
      );

      console.log(`   ✅ ${scraped.sections.length} sections`);
    } catch (err) {
      console.error(`   ❌ Error: ${(err as Error).message}`);
    }

    await delay(1500);
  }

  // Save other pages index
  const otherIndexPath = join(OUTPUT_DIR, 'other-pages-index.json');
  writeFileSync(
    otherIndexPath,
    JSON.stringify(
      {
        scrapedAt: new Date().toISOString(),
        count: allOther.length,
        pages: allOther.map((p) => ({
          url: p.url,
          pageTitle: p.pageTitle,
          pageType: p.pageType,
          sectionCount: p.sections.length,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`\n📝 Saved other pages index: ${otherIndexPath}`);

  // Summary
  console.log('\n\n=== SCRAPE SUMMARY ===');
  if (!OTHER_ONLY) {
    console.log(`Contravention pages scraped: ${codesToScrape.length}`);
  }
  console.log(`Other pages scraped: ${allOther.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('===================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
