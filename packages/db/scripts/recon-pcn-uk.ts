/**
 * Recon script for PenaltyChargeNotice.co.uk
 *
 * Logs in via WordPress form, then crawls the site to discover
 * all contravention code pages and document their HTML structure.
 *
 * Usage:
 *   cd packages/db
 *   PCN_UK_EMAIL=xxx PCN_UK_PASSWORD=xxx pnpm tsx scripts/recon-pcn-uk.ts
 */

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://penaltychargenotice.co.uk';
const OUTPUT_DIR = join(__dirname, '../data/pcn-uk');

const EMAIL = process.env.PCN_UK_EMAIL;
const PASSWORD = process.env.PCN_UK_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set PCN_UK_EMAIL and PCN_UK_PASSWORD env vars');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// Store cookies from login
let sessionCookies = '';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a page with session cookies
 */
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

  // Capture any new cookies
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    const newCookies = setCookies
      .map((c) => c.split(';')[0])
      .join('; ');
    sessionCookies = sessionCookies
      ? `${sessionCookies}; ${newCookies}`
      : newCookies;
  }

  return { html: await response.text(), status: response.status };
}

/**
 * Log in to the site via WordPress login form
 */
async function login(): Promise<boolean> {
  console.log('🔑 Logging in...');

  // First, GET the login page to get any nonce/csrf tokens
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

  // Save login page HTML for analysis
  writeFileSync(join(OUTPUT_DIR, 'recon-login-page.html'), loginHtml);
  console.log('   Saved login page HTML for analysis');

  // Look for the login form structure
  const forms = $('form');
  console.log(`   Found ${forms.length} form(s) on login page`);

  forms.each((i, form) => {
    const $form = $(form);
    const action = $form.attr('action') || '(no action)';
    const method = $form.attr('method') || 'GET';
    const id = $form.attr('id') || '(no id)';
    console.log(`   Form ${i}: id="${id}" action="${action}" method="${method}"`);

    $form.find('input').each((_, input) => {
      const $input = $(input);
      console.log(
        `     input: name="${$input.attr('name')}" type="${$input.attr('type')}" value="${$input.attr('value') ?? ''}"`,
      );
    });
  });

  // The site uses MGM (Magic Members) plugin with a custom login form
  // that POSTs to /login/ with a nonce field
  const $loginForm = $('form#loginform');
  const nonce = $loginForm.find('input[name="_mgmnonce_user_login"]').attr('value') ?? '';
  const wpHttpReferer = $loginForm.find('input[name="_wp_http_referer"]').attr('value') ?? '/login/';
  const redirectTo = $loginForm.find('input[name="redirect_to"]').attr('value') ?? '';

  console.log(`   Nonce: ${nonce}`);
  console.log(`   Form action: ${$loginForm.attr('action')}`);

  const loginFormData = new URLSearchParams();
  loginFormData.set('log', EMAIL);
  loginFormData.set('pwd', PASSWORD);
  loginFormData.set('rememberme', 'forever');
  loginFormData.set('wp-submit', 'Log In');
  loginFormData.set('testcookie', '1');
  loginFormData.set('redirect_to', redirectTo);
  loginFormData.set('_mgmnonce_user_login', nonce);
  loginFormData.set('_wp_http_referer', wpHttpReferer);

  // POST to the form action (which is /login/)
  const formAction = $loginForm.attr('action') ?? `${BASE_URL}/login/`;
  const loginUrl = formAction.startsWith('http') ? formAction : `${BASE_URL}${formAction}`;

  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: sessionCookies + '; wordpress_test_cookie=WP+Cookie+check',
      Referer: `${BASE_URL}/login/`,
    },
    body: loginFormData.toString(),
    redirect: 'manual', // Don't follow redirect — we need the cookies
  });

  // Capture session cookies from login response
  const loginSetCookies = loginRes.headers.getSetCookie?.() ?? [];
  if (loginSetCookies.length > 0) {
    const newCookies = loginSetCookies
      .map((c) => c.split(';')[0])
      .join('; ');
    sessionCookies = sessionCookies
      ? `${sessionCookies}; ${newCookies}`
      : newCookies;
  }

  console.log(`   Login response status: ${loginRes.status}`);
  console.log(`   Location: ${loginRes.headers.get('location')}`);

  // Also try POSTing directly to wp-login.php with MGM nonce
  if (loginRes.status === 301 || loginRes.status === 302) {
    console.log('   Trying wp-login.php with MGM fields...');
    const wpLoginFormData = new URLSearchParams();
    wpLoginFormData.set('log', EMAIL);
    wpLoginFormData.set('pwd', PASSWORD);
    wpLoginFormData.set('rememberme', 'forever');
    wpLoginFormData.set('wp-submit', 'Log In');
    wpLoginFormData.set('testcookie', '1');
    wpLoginFormData.set('redirect_to', `${BASE_URL}/`);
    wpLoginFormData.set('_mgmnonce_user_login', nonce);
    wpLoginFormData.set('_wp_http_referer', '/login/');

    const wpLoginRes = await fetch(`${BASE_URL}/wp-login.php`, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: sessionCookies + '; wordpress_test_cookie=WP+Cookie+check',
        Referer: `${BASE_URL}/login/`,
      },
      body: wpLoginFormData.toString(),
      redirect: 'manual',
    });

    const wpLoginCookies = wpLoginRes.headers.getSetCookie?.() ?? [];
    console.log(`   wp-login.php status: ${wpLoginRes.status}`);
    console.log(`   wp-login.php location: ${wpLoginRes.headers.get('location')}`);
    console.log(`   wp-login.php cookies: ${wpLoginCookies.length}`);

    if (wpLoginCookies.length > 0) {
      const newCookies = wpLoginCookies
        .map((c) => c.split(';')[0])
        .join('; ');
      sessionCookies = sessionCookies
        ? `${sessionCookies}; ${newCookies}`
        : newCookies;

      // Log cookie names
      for (const c of wpLoginCookies) {
        console.log(`     Cookie: ${c.split(';')[0].split('=')[0]}`);
      }
    }

    // If we got redirected back to login, check for error in body
    if (wpLoginRes.status === 200) {
      const body = await wpLoginRes.text();
      const $body = cheerio.load(body);
      const errors = $body('#login_error, .login-error, .mgm-message, .error').text().trim();
      if (errors) {
        console.log(`   Login error: ${errors}`);
      }
    }
  }

  // Follow redirect chain to collect all cookies
  let redirectUrl = loginRes.headers.get('location');
  let redirectCount = 0;
  while (redirectUrl && redirectCount < 5) {
    redirectCount++;
    const fullRedirectUrl = redirectUrl.startsWith('http')
      ? redirectUrl
      : `${BASE_URL}${redirectUrl}`;
    console.log(`   Following redirect ${redirectCount}: ${fullRedirectUrl}`);

    const redirectRes = await fetch(fullRedirectUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Cookie: sessionCookies + '; wordpress_test_cookie=WP+Cookie+check',
      },
      redirect: 'manual',
    });

    const redirectCookies = redirectRes.headers.getSetCookie?.() ?? [];
    if (redirectCookies.length > 0) {
      const newCookies = redirectCookies
        .map((c) => c.split(';')[0])
        .join('; ');
      sessionCookies = sessionCookies
        ? `${sessionCookies}; ${newCookies}`
        : newCookies;
    }

    console.log(`   Redirect status: ${redirectRes.status}, cookies: ${redirectCookies.length} new`);
    redirectUrl = redirectRes.headers.get('location');
  }

  console.log(
    `   Total cookies: ${sessionCookies.split(';').length}`,
  );

  // Check if we got wordpress_logged_in cookie
  const isLoggedIn = sessionCookies.includes('wordpress_logged_in');
  if (isLoggedIn) {
    console.log('   ✅ Login successful');
  } else {
    console.log('   ❌ Login failed (no wordpress_logged_in cookie)');
    // Log all cookie names for debugging
    const cookieNames = sessionCookies
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter(Boolean);
    console.log(`   Cookie names: ${cookieNames.join(', ')}`);
  }

  return isLoggedIn;
}

/**
 * Discover all category and contravention code pages
 */
async function discoverPages(): Promise<{
  categories: Array<{ url: string; title: string }>;
  contraventionPages: Array<{ url: string; title: string; code: string }>;
  otherPages: Array<{ url: string; title: string }>;
}> {
  console.log('\n📂 Discovering site structure...');

  const categories: Array<{ url: string; title: string }> = [];
  const contraventionPages: Array<{ url: string; title: string; code: string }> = [];
  const otherPages: Array<{ url: string; title: string }> = [];

  // Known category entry points from earlier recon
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
    console.log(`\n   Fetching: ${url}`);

    const { html, status } = await fetchPage(url);
    if (status !== 200) {
      console.log(`   ⚠️  Status ${status}`);
      continue;
    }

    const $ = cheerio.load(html);
    const pageTitle = $('h1').first().text().trim() || $('title').text().trim();
    categories.push({ url, title: pageTitle });
    console.log(`   Title: ${pageTitle}`);

    // Find all links to contravention code pages
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

    // Also find links to other potentially valuable pages
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
            href.includes('representation')) &&
          !otherPages.some((p) => p.url === fullUrl) &&
          !contraventionPages.some((p) => p.url === fullUrl)
        ) {
          otherPages.push({ url: fullUrl, title: text });
        }
      }
    });

    await delay(1500);
  }

  console.log(`\n   Found ${contraventionPages.length} contravention code pages`);
  console.log(`   Found ${otherPages.length} other relevant pages`);

  return { categories, contraventionPages, otherPages };
}

/**
 * Analyze the HTML structure of a contravention code page
 */
async function analyzeContraventionPage(url: string): Promise<Record<string, unknown>> {
  const { html, status } = await fetchPage(url);
  if (status !== 200) {
    return { error: `HTTP ${status}`, url };
  }

  const $ = cheerio.load(html);

  // Save raw HTML
  const urlSlug = url.replace(BASE_URL, '').replace(/\//g, '_').replace(/^_/, '');
  writeFileSync(join(OUTPUT_DIR, `recon-page-${urlSlug}.html`), html);

  const pageTitle = $('h1').first().text().trim();
  const mainContent = $('.entry-content, .post-content, article, .content, main').first();
  const contentHtml = mainContent.length ? mainContent.html() ?? '' : '';

  // Analyze content structure
  const headings: Array<{ level: string; text: string }> = [];
  mainContent.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push({
      level: $(el).prop('tagName') ?? 'unknown',
      text: $(el).text().trim(),
    });
  });

  // Check for specific content types
  const hasTable = mainContent.find('table').length > 0;
  const hasList = mainContent.find('ul, ol').length > 0;
  const hasBlockquote = mainContent.find('blockquote').length > 0;
  const hasAccordion =
    mainContent.find('.accordion, .toggle, .collapsible, [class*="toggle"], [class*="accordion"]').length > 0;

  // Look for premium/member-only content markers
  const hasMemberContent =
    mainContent.find('[class*="member"], [class*="premium"], [class*="locked"]').length > 0;
  const memberMarkers: string[] = [];
  mainContent.find('[class*="member"], [class*="premium"], [class*="locked"]').each((_, el) => {
    memberMarkers.push($(el).attr('class') ?? '');
  });

  // Extract all CSS classes used in content
  const cssClasses = new Set<string>();
  mainContent.find('*').each((_, el) => {
    const classes = $(el).attr('class');
    if (classes) {
      classes.split(/\s+/).forEach((c) => cssClasses.add(c));
    }
  });

  // Check for tabbed content
  const hasTabs = mainContent.find('.tab, [class*="tab-"], [role="tab"]').length > 0;

  // Extract paragraph count and approximate content length
  const paragraphs = mainContent.find('p').length;
  const contentLength = mainContent.text().trim().length;

  // Look for specific parking-related data patterns
  const sections: Array<{ heading: string; contentPreview: string }> = [];
  mainContent.find('h2, h3').each((_, el) => {
    const $heading = $(el);
    const heading = $heading.text().trim();
    let preview = '';
    let $next = $heading.next();
    while ($next.length && !$next.is('h2, h3')) {
      preview += $next.text().trim() + ' ';
      if (preview.length > 300) break;
      $next = $next.next();
    }
    sections.push({ heading, contentPreview: preview.trim().slice(0, 300) });
  });

  return {
    url,
    pageTitle,
    headings,
    sections,
    contentLength,
    paragraphs,
    hasTable,
    hasList,
    hasBlockquote,
    hasAccordion,
    hasTabs,
    hasMemberContent,
    memberMarkers,
    cssClasses: Array.from(cssClasses).sort(),
  };
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🔍 PenaltyChargeNotice.co.uk Recon\n');

  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n⚠️  Proceeding anyway to see what public content looks like...');
  }

  // Step 2: Discover pages
  const { categories, contraventionPages, otherPages } = await discoverPages();

  // Save discovery results
  const discoveryReport = {
    timestamp: new Date().toISOString(),
    loggedIn,
    categories,
    contraventionPages: contraventionPages.sort((a, b) =>
      parseInt(a.code) - parseInt(b.code),
    ),
    otherPages,
  };
  writeFileSync(
    join(OUTPUT_DIR, 'recon-discovery.json'),
    JSON.stringify(discoveryReport, null, 2),
  );
  console.log('\n📝 Saved discovery report');

  // Step 3: Analyze a sample of contravention pages (first 3 + last one)
  const samplesToAnalyze = [
    ...contraventionPages.slice(0, 3),
    ...(contraventionPages.length > 3
      ? [contraventionPages[contraventionPages.length - 1]]
      : []),
  ];

  // Also sample an "other" page if available
  if (otherPages.length > 0) {
    samplesToAnalyze.push({
      url: otherPages[0].url,
      title: otherPages[0].title,
      code: 'other',
    });
  }

  console.log(`\n🔬 Analyzing ${samplesToAnalyze.length} sample pages...`);
  const pageAnalyses: Record<string, unknown>[] = [];

  for (const page of samplesToAnalyze) {
    console.log(`\n   Analyzing: ${page.title} (${page.url})`);
    const analysis = await analyzeContraventionPage(page.url);
    pageAnalyses.push(analysis);
    await delay(1500);
  }

  // Save analysis report
  const analysisReport = {
    timestamp: new Date().toISOString(),
    sampleCount: pageAnalyses.length,
    pages: pageAnalyses,
  };
  writeFileSync(
    join(OUTPUT_DIR, 'recon-page-analysis.json'),
    JSON.stringify(analysisReport, null, 2),
  );

  // Print summary
  console.log('\n\n=== RECON SUMMARY ===');
  console.log(`Logged in: ${loggedIn}`);
  console.log(`Categories found: ${categories.length}`);
  console.log(`Contravention code pages: ${contraventionPages.length}`);
  console.log(`Other relevant pages: ${otherPages.length}`);
  console.log(`\nContravention codes found:`);
  for (const p of contraventionPages) {
    console.log(`   Code ${p.code}: ${p.title}`);
  }
  console.log(`\nOther pages:`);
  for (const p of otherPages) {
    console.log(`   ${p.title}: ${p.url}`);
  }
  console.log(`\nSample page analyses saved to: ${join(OUTPUT_DIR, 'recon-page-analysis.json')}`);

  if (pageAnalyses.length > 0) {
    const first = pageAnalyses[0] as Record<string, unknown>;
    console.log(`\nSample page structure (${(first.pageTitle as string) ?? 'unknown'}):`);
    const sections = first.sections as Array<{ heading: string; contentPreview: string }>;
    if (sections) {
      for (const s of sections) {
        console.log(`   [${s.heading}]`);
        console.log(`     ${s.contentPreview.slice(0, 120)}...`);
      }
    }
    console.log(`   CSS classes: ${((first.cssClasses as string[]) ?? []).slice(0, 20).join(', ')}`);
  }

  console.log('\n===================');
  console.log('📁 All recon files saved to:', OUTPUT_DIR);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
