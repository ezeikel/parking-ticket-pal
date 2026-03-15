/**
 * Ingest UK parking/traffic legislation and guidance into the LegalReference table.
 *
 * Fetches specific pages from legislation.gov.uk and gov.uk, parses sections
 * with cheerio, and upserts them into the database. Idempotent — safe to re-run.
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/ingest-legal-references.ts
 *
 *   # Dry run (shows what would be inserted):
 *   pnpm tsx scripts/ingest-legal-references.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env before importing prisma
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

const { prisma } = await import('../src/client.js');

import * as cheerio from 'cheerio';

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================
// Types
// ============================================

type InstrumentType = 'ACT' | 'STATUTORY_INSTRUMENT' | 'GUIDANCE';

type ParsedSection = {
  sectionIdentifier: string;
  sectionTitle: string;
  content: string;
  topicTags: string[];
};

type Source = {
  url: string;
  instrumentName: string;
  instrumentType: InstrumentType;
  parser: (html: string, url: string) => ParsedSection[];
};

// ============================================
// Topic tag inference
// ============================================

const TOPIC_KEYWORDS: Record<string, string[]> = {
  signage: ['sign', 'signage', 'traffic sign', 'road marking', 'markings', 'legib'],
  loading: ['loading', 'unloading', 'goods vehicle'],
  procedural: ['procedur', 'service', 'served', 'notice to owner', 'representations'],
  tro: ['traffic regulation order', 'traffic order', 'tro'],
  'nto-service': ['notice to owner', 'nto', 'serve the notice', 'postal'],
  'discount-period': ['discount', 'reduced amount', '14 day', 'fourteen day'],
  'owner-liability': ['owner', 'keeper', 'registered keeper', 'keeper liability'],
  'stolen-vehicle': ['stolen', 'taken without', 'without consent'],
  'hire-vehicle': ['hire', 'hiring', 'hired vehicle', 'vehicle hire'],
  'penalty-amount': ['penalty charge', 'amount of the penalty', 'charge level', 'differential levy'],
  representations: ['representation', 'grounds', 'appeal', 'adjudicat'],
  appeals: ['appeal', 'adjudicat', 'tribunal'],
  'blue-badge': ['disabled', 'blue badge', 'disability'],
  'cctv-enforcement': ['camera', 'cctv', 'approved device', 'recording'],
  'private-parking': ['private land', 'keeper liability', 'schedule 4', 'relevant contract', 'relevant obligation'],
  'bus-lane': ['bus lane', 'bus only'],
  'moving-traffic': ['moving traffic', 'box junction', 'banned turn', 'no entry'],
  'contravention-codes': ['contravention', 'higher level', 'lower level'],
};

function inferTopicTags(title: string, content: string): string[] {
  const combined = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];

  for (const [tag, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => combined.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags;
}

// ============================================
// Parsers
// ============================================

/**
 * Parse legislation.gov.uk pages.
 *
 * The HTML uses a consistent pattern:
 * - Anchor IDs like id="section-72", id="schedule-7-paragraph-1"
 * - Top-level provision numbers in `.LegP1No` (e.g., "72", "1")
 * - Provision titles in `.LegP1GroupTitle` or `.LegP1GroupTitleFirst`
 * - Sub-provisions in `.LegP2Text`, `.LegP3Text`, `.LegP4Text`
 *
 * We group all content between consecutive `.LegP1No` elements into
 * one section per top-level provision (e.g., all of s.72 together).
 */
function parseLegislationPage(html: string, url: string): ParsedSection[] {
  const $ = cheerio.load(html);
  const sections: ParsedSection[] = [];

  // Find all top-level provision number spans
  const provisionNos = $('.LegP1No');

  if (provisionNos.length > 0) {
    provisionNos.each((i, noEl) => {
      const $no = $(noEl);
      const number = $no.text().trim();
      if (!number) return;

      // The provision number is inside an h4 or p that also contains the title
      const $container = $no.closest('h4, p, .LegClearFix');

      // Extract title from sibling LegP1GroupTitle span
      const titleSpan =
        $container.find('[class*="LegP1GroupTitle"]').first().clone();
      // Remove extent restriction text (E+W etc.)
      titleSpan.find('.LegExtentRestriction').remove();
      const title = titleSpan.text().trim();

      // Collect all content for this provision:
      // Walk siblings after the container until we hit the next LegP1No container
      const contentParts: string[] = [];
      let $next = $container.next();

      while ($next.length) {
        // Stop if we've hit another top-level provision
        if ($next.find('.LegP1No').length > 0 || $next.hasClass('LegP1No')) {
          break;
        }
        // Stop if we hit a new heading (h2, h3, h4 with LegP1No)
        if (
          ($next.is('h2, h3') && !$next.find('.LegP1No').length) ||
          ($next.is('h4') && $next.find('.LegP1No').length > 0)
        ) {
          break;
        }

        // Extract text from provision content spans
        const textParts: string[] = [];
        $next
          .find(
            '[class*="LegP2Text"], [class*="LegP3Text"], [class*="LegP4Text"], [class*="LegP5Text"], [class*="LegP1Text"], [class*="LegText"]',
          )
          .each((_, textEl) => {
            const t = $(textEl).text().trim();
            if (t) textParts.push(t);
          });

        if (textParts.length > 0) {
          contentParts.push(textParts.join('\n'));
        } else {
          // Fallback: get direct text if no Leg*Text spans found
          const directText = $next.text().trim();
          if (directText && directText.length > 10) {
            contentParts.push(directText);
          }
        }

        $next = $next.next();
      }

      const content = contentParts.join('\n').trim();
      if (content.length > 20) {
        // Determine section identifier prefix from URL
        const urlPath = new URL(url).pathname;
        let prefix = 's';
        if (urlPath.includes('/schedule/')) {
          const schedNum = urlPath.match(/\/schedule\/(\d+)/)?.[1];
          prefix = schedNum ? `sch.${schedNum}.para` : 'para';
        } else if (urlPath.includes('/regulation/') || urlPath.includes('/uksi/')) {
          prefix = 'reg';
        }

        const sectionId = `${prefix}.${number}`;

        sections.push({
          sectionIdentifier: sectionId,
          sectionTitle: title,
          content,
          topicTags: inferTopicTags(title, content),
        });
      }
    });
  }

  // Fallback: split by h2/h3 headings (for pages without LegP1No structure)
  if (sections.length === 0) {
    const contentArea = $(
      '#viewLegSnippet, .LegSnippet, main, article',
    ).first();
    const root = contentArea.length ? contentArea : $.root();

    root.find('h2, h3').each((_, heading) => {
      const $heading = $(heading);
      const headingClone = $heading.clone();
      headingClone.find('.LegExtentRestriction').remove();
      const title = headingClone.text().trim();
      if (!title) return;

      const contentParts: string[] = [];
      let $next = $heading.next();
      while ($next.length && !$next.is('h2, h3')) {
        const text = $next.text().trim();
        if (text.length > 10) {
          contentParts.push(text);
        }
        $next = $next.next();
      }

      if (contentParts.length > 0) {
        const content = contentParts.join('\n').trim();
        sections.push({
          sectionIdentifier: title
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 80),
          sectionTitle: title,
          content,
          topicTags: inferTopicTags(title, content),
        });
      }
    });
  }

  return sections;
}

/**
 * Parse gov.uk guidance pages. Uses the standard GOV.UK content format:
 * - Content in .govspeak or .gem-c-govspeak
 * - Sections split by h2/h3 headings
 */
function parseGovUkGuidance(html: string, url: string): ParsedSection[] {
  const $ = cheerio.load(html);
  const sections: ParsedSection[] = [];

  // GOV.UK guidance uses .gem-c-govspeak or .govspeak for content
  const contentArea = $('.gem-c-govspeak, .govspeak, .publication-content, article').first();
  if (!contentArea.length) return sections;

  contentArea.find('h2, h3').each((_, heading) => {
    const $heading = $(heading);
    const title = $heading.text().trim();
    if (!title) return;

    const contentParts: string[] = [];
    let $next = $heading.next();
    while ($next.length && !$next.is('h2, h3')) {
      const text = $next.text().trim();
      if (text.length > 0) {
        contentParts.push(text);
      }
      $next = $next.next();
    }

    if (contentParts.length > 0) {
      const content = contentParts.join('\n').trim();
      sections.push({
        sectionIdentifier: title.replace(/\s+/g, '-').toLowerCase().slice(0, 80),
        sectionTitle: title,
        content,
        topicTags: inferTopicTags(title, content),
      });
    }
  });

  return sections;
}

// ============================================
// Source registry
// ============================================

const SOURCES: Source[] = [
  // TMA 2004 Part 6 — Civil enforcement of traffic contraventions
  {
    url: 'https://www.legislation.gov.uk/ukpga/2004/18/part/6',
    instrumentName: 'Traffic Management Act 2004',
    instrumentType: 'ACT',
    parser: parseLegislationPage,
  },
  // TMA 2004 Schedule 7 — Road traffic contraventions subject to civil enforcement
  {
    url: 'https://www.legislation.gov.uk/ukpga/2004/18/schedule/7',
    instrumentName: 'Traffic Management Act 2004',
    instrumentType: 'ACT',
    parser: parseLegislationPage,
  },
  // TMA 2004 Schedule 8 — Penalty charges
  {
    url: 'https://www.legislation.gov.uk/ukpga/2004/18/schedule/8',
    instrumentName: 'Traffic Management Act 2004',
    instrumentType: 'ACT',
    parser: parseLegislationPage,
  },
  // TMA 2004 Schedule 9 — Civil enforcement areas and equipment
  {
    url: 'https://www.legislation.gov.uk/ukpga/2004/18/schedule/9',
    instrumentName: 'Traffic Management Act 2004',
    instrumentType: 'ACT',
    parser: parseLegislationPage,
  },
  // Representations and Appeals Regulations 2022 — the actual regulations (not contents page)
  {
    url: 'https://www.legislation.gov.uk/uksi/2022/576/made',
    instrumentName:
      'Civil Enforcement of Road Traffic Contraventions (Representations and Appeals) (England) Regulations 2022',
    instrumentType: 'STATUTORY_INSTRUMENT',
    parser: parseLegislationPage,
  },
  // POFA 2012 Schedule 4 — Private parking (keeper liability)
  {
    url: 'https://www.legislation.gov.uk/ukpga/2012/9/schedule/4',
    instrumentName: 'Protection of Freedoms Act 2012',
    instrumentType: 'ACT',
    parser: parseLegislationPage,
  },
  // DfT statutory guidance on parking enforcement
  {
    url: 'https://www.gov.uk/government/publications/civil-enforcement-of-parking-contraventions/guidance-for-local-authorities-on-enforcing-parking-restrictions',
    instrumentName: 'DfT Statutory Guidance on Civil Enforcement of Parking Contraventions',
    instrumentType: 'GUIDANCE',
    parser: parseGovUkGuidance,
  },
];

// ============================================
// Main
// ============================================

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no database writes' : '📥 Ingesting legal references...');
  console.log(`${SOURCES.length} sources to process\n`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const source of SOURCES) {
    console.log(`\n📄 ${source.instrumentName}`);
    console.log(`   ${source.url}`);

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'ParkingTicketPal/1.0 (legal-reference-ingestion)',
          Accept: 'text/html',
        },
      });

      if (!response.ok) {
        console.error(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        totalErrors++;
        continue;
      }

      const html = await response.text();
      const sections = source.parser(html, source.url);

      console.log(`   Found ${sections.length} sections`);

      if (sections.length === 0) {
        console.warn('   ⚠️  No sections parsed — check parser for this URL');
        continue;
      }

      for (const section of sections) {
        if (DRY_RUN) {
          console.log(
            `   [DRY] ${section.sectionIdentifier}: ${section.sectionTitle || '(no title)'} [${section.topicTags.join(', ')}] (${section.content.length} chars)`,
          );
          continue;
        }

        try {
          const result = await prisma.legalReference.upsert({
            where: {
              sourceUrl_sectionIdentifier: {
                sourceUrl: source.url,
                sectionIdentifier: section.sectionIdentifier,
              },
            },
            create: {
              instrumentName: source.instrumentName,
              instrumentType: source.instrumentType,
              sectionIdentifier: section.sectionIdentifier,
              sectionTitle: section.sectionTitle,
              content: section.content,
              sourceUrl: source.url,
              topicTags: section.topicTags,
            },
            update: {
              sectionTitle: section.sectionTitle,
              content: section.content,
              topicTags: section.topicTags,
            },
          });

          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            totalInserted++;
          } else {
            totalUpdated++;
          }
        } catch (err) {
          console.error(`   ❌ Error upserting ${section.sectionIdentifier}:`, err);
          totalErrors++;
        }
      }
    } catch (err) {
      console.error(`   ❌ Fetch error:`, err);
      totalErrors++;
    }

    // Be polite — don't hammer the server
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\n--- Summary ---');
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Updated:  ${totalUpdated}`);
  console.log(`Errors:   ${totalErrors}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
