/**
 * Import PCN UK scraped data into the ChallengeArgument table.
 *
 * Reads code-*.json and other-*.json from data/pcn-uk/, classifies sections
 * by argumentType, filters boilerplate, downloads sign diagram images to R2,
 * and upserts ChallengeArgument rows.
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/import-pcn-uk.ts
 *
 *   # Dry run:
 *   pnpm tsx scripts/import-pcn-uk.ts --dry-run
 *
 *   # Skip image download:
 *   pnpm tsx scripts/import-pcn-uk.ts --skip-images
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env before importing prisma
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

const { prisma } = await import('../src/client.js');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_IMAGES = process.argv.includes('--skip-images');

// ============================================
// Types
// ============================================

type ScrapedSection = {
  heading: string;
  content: string;
  contentHtml: string;
  images: Array<{ src: string; alt: string }>;
  isPremium: boolean;
};

type ScrapedCodeFile = {
  code: string;
  url: string;
  pageTitle: string;
  contraventionDescription: string;
  category: string;
  sections: ScrapedSection[];
  scrapedAt: string;
};

type ScrapedOtherFile = {
  url: string;
  pageTitle: string;
  pageType: string;
  sections: ScrapedSection[];
  scrapedAt: string;
};

type ArgumentRow = {
  contraventionCode: string;
  argumentType: string;
  heading: string;
  content: string;
  signDiagramUrls: string[];
  sourceUrl: string;
};

// ============================================
// Boilerplate filter
// ============================================

const BOILERPLATE_HEADINGS = [
  'how to have your penalty charge notice',
  'how to have your pcn',
  'follow our 3 stage process',
  'page quick index',
  'back to parking',
  'back to bus lanes',
  'back to moving traffic',
  'go to top',
];

function isBoilerplate(heading: string): boolean {
  const lower = heading.toLowerCase().trim();
  return BOILERPLATE_HEADINGS.some((bp) => lower.includes(bp));
}

// ============================================
// Argument type classification
// ============================================

const SIGN_KEYWORDS = [
  'sign',
  'line',
  'marking',
  'road marking',
  'diagram',
  'cpz sign',
  'zone sign',
  'controlled parking zone sign',
];

const CASE_KEYWORDS = [
  'adjudicator',
  'case no',
  'case number',
  'appeal was allowed',
  'appeal was upheld',
  'vs ',
  ' v ',
  'adjudicators decision',
  'adjudicators decisions',
];

const PROCEDURAL_KEYWORDS = [
  'procedur',
  'notice to owner',
  'charge certificate',
  'enforcement',
  'time limit',
  'statutory declaration',
  'representations',
  'notice of rejection',
];

function classifySection(
  heading: string,
  content: string,
  images: Array<{ src: string; alt: string }>,
): string {
  const lower = heading.toLowerCase() + ' ' + content.toLowerCase().slice(0, 500);

  // If section has sign diagram images, it's a sign requirement
  const hasSignImages = images.some(
    (img) =>
      img.src.toLowerCase().includes('sign') ||
      img.src.toLowerCase().includes('line') ||
      img.src.toLowerCase().includes('marking'),
  );
  if (hasSignImages) return 'sign_requirement';

  // Check heading first for stronger signal
  const headingLower = heading.toLowerCase();
  if (
    SIGN_KEYWORDS.some(
      (kw) => headingLower.includes(kw) && !headingLower.includes('adjudicator'),
    ) &&
    images.length > 0
  ) {
    return 'sign_requirement';
  }

  if (CASE_KEYWORDS.some((kw) => headingLower.includes(kw))) {
    return 'case_precedent';
  }

  if (PROCEDURAL_KEYWORDS.some((kw) => headingLower.includes(kw))) {
    return 'procedural_tip';
  }

  // Fall back to content analysis
  if (CASE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'case_precedent';
  }

  return 'legal_point';
}

// ============================================
// Image download to R2
// ============================================

// Track downloaded images: sourceUrl -> R2 URL
const imageUrlMap = new Map<string, string>();

/**
 * Derive a clean R2 path from the source image URL.
 *
 * Source URLs have varied structures:
 *   /userfiles/image/Sign Diagrams/Sign-633-b.gif  → signs/sign-633-b.gif
 *   /userfiles/image/Sign Diagrams/Line-1017.gif   → lines/line-1017.gif
 *   /userfiles/image/Signs/32d.jpg                  → signs/32d.jpg
 *   /userfiles/image/Photos/DroppedKerbs-009x570.jpg → photos/droppedkerbs-009x570.jpg
 *   /userfiles/image/bus-lanes/.../958-023113ac.gif → bus-lanes/958-023113ac.gif
 *   /userfiles/image/Sample-PCN.jpg                 → misc/sample-pcn.jpg
 */
function deriveR2Path(imageUrl: string): string {
  const urlPath = decodeURIComponent(new URL(imageUrl).pathname);
  const filename = (urlPath.split('/').pop() || 'image.gif').toLowerCase().replace(/\s+/g, '-');

  // Categorise by source folder
  const lowerPath = urlPath.toLowerCase();
  let subfolder = 'misc';
  if (lowerPath.includes('/sign diagrams/') || lowerPath.includes('/sign%20diagrams/')) {
    subfolder = filename.startsWith('line') || filename.startsWith('mline') ? 'lines' : 'signs';
  } else if (lowerPath.includes('/signs/')) {
    subfolder = 'signs';
  } else if (lowerPath.includes('/photos/')) {
    subfolder = 'photos';
  } else if (lowerPath.includes('/bus-lanes/')) {
    subfolder = 'bus-lanes';
  }

  return `static/reference/sign-diagrams/${subfolder}/${filename}`;
}

// Lazy R2 client
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

async function downloadImageToR2(imageUrl: string): Promise<string | null> {
  if (SKIP_IMAGES) return imageUrl;

  // Check cache
  if (imageUrlMap.has(imageUrl)) return imageUrlMap.get(imageUrl)!;

  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) {
    console.warn('  R2_BUCKET or R2_PUBLIC_URL not set, skipping image upload');
    return imageUrl;
  }

  try {
    const r2Path = deriveR2Path(imageUrl);

    // Download image with retries
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(imageUrl);
        if (response.ok) break;
      } catch {
        if (attempt === 2) throw new Error(`Fetch failed after 3 attempts`);
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }

    if (!response || !response.ok) {
      console.warn(`  ✗ Download failed ${imageUrl}: ${response?.status}`);
      return imageUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get('content-type') || 'image/gif';

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Path,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const r2Url = `${publicUrl}/${r2Path}`;
    console.log(`  ✓ ${r2Path}`);
    imageUrlMap.set(imageUrl, r2Url);
    return r2Url;
  } catch (err) {
    console.warn(
      `  ✗ ${imageUrl}:`,
      err instanceof Error ? err.message : err,
    );
    return imageUrl;
  }
}

async function processImages(
  images: Array<{ src: string; alt: string }>,
): Promise<string[]> {
  const urls: string[] = [];
  for (const img of images) {
    const url = await downloadImageToR2(img.src);
    if (url) urls.push(url);
  }
  return urls;
}

// ============================================
// Code-to-keyword mapping for "other" pages
// ============================================

const CODE_KEYWORD_MAP: Record<string, string[]> = {
  '01': ['yellow line', 'single yellow', 'double yellow', 'restricted street', 'prescribed hours'],
  '02': ['loading', 'unloading', 'goods vehicle'],
  '04': ['meter', 'expired meter', 'parking meter'],
  '05': ['pay and display', 'pay & display', 'expired ticket'],
  '06': ['parking place', 'beyond bay'],
  '07': ['feeding the meter', 'return within'],
  '08': ['trailer'],
  '09': ['school keep clear'],
  '11': ['doctor', 'gp bay'],
  '12': ['resident', "residents'", 'resident permit'],
  '16': ['permit bay', 'permit holder'],
  '19': ['taxi rank', 'cab rank'],
  '20': ['loading bay', 'loading area'],
  '21': ['suspended bay', 'suspension'],
  '22': ['re-park', 'return'],
  '23': ['wrong class', 'vehicle class'],
  '24': ['not correctly parked', 'within bay', 'bay marking'],
  '25': ['footway', 'pavement', 'verge'],
  '26': ['double parking', 'parked more than 50'],
  '27': ['dropped kerb', 'dropped footway', 'crossover'],
  '28': ['bus stop', 'bus clearway'],
  '30': ['cycle lane', 'cycle track', 'cycle facility'],
  '31': ['box junction', 'yellow box'],
  '32': ['gate', 'banned route', 'prohibited route'],
  '33': ['no entry', 'prohibited entry'],
  '34': ['bus lane', 'bus gate'],
  '35': ['weight restriction', 'goods vehicle restriction'],
  '37': ['cycling', 'cycling contravention'],
  '38': ['one way', 'wrong way'],
  '40': ['pedestrian zone', 'restricted zone'],
  '45': ['red route', 'tlrn'],
  '46': ['red route', 'clearway', 'red route stopping'],
  '47': ['bus stop', 'bus stand'],
  '48': ['school entrance', 'school keep clear'],
  '50': ['car park', 'off-street'],
  '51': ['car park', 'off-street', 'parking place'],
  '52': ['car park', 'bay'],
  '53': ['car park', 'permit'],
  '54': ['car park', 'class'],
  '55': ['car park', 'footway'],
  '62': ['car park', 'cctv'],
  '82': ['pcn', 'penalty charge', 'cctv'],
  '83': ['congestion', 'congestion charge'],
  '99': ['unknown'],
};

function findRelevantCodes(content: string): string[] {
  const lower = content.toLowerCase();
  const codes: string[] = [];

  for (const [code, keywords] of Object.entries(CODE_KEYWORD_MAP)) {
    const matches = keywords.filter((kw) => lower.includes(kw));
    if (matches.length >= 1) {
      codes.push(code);
    }
  }

  // If no specific match, return empty — we won't create orphan rows
  return codes;
}

// ============================================
// Process code files
// ============================================

function processCodeFile(data: ScrapedCodeFile): ArgumentRow[] {
  const rows: ArgumentRow[] = [];

  for (const section of data.sections) {
    if (isBoilerplate(section.heading)) continue;
    if (section.content.trim().length < 50) continue;

    const argumentType = classifySection(
      section.heading,
      section.content,
      section.images,
    );

    rows.push({
      contraventionCode: data.code,
      argumentType,
      heading: section.heading.trim(),
      content: section.content.trim(),
      signDiagramUrls: [], // Populated during upsert with R2 URLs
      sourceUrl: data.url,
    });
  }

  return rows;
}

// ============================================
// Process other files (adjudicator decisions, etc.)
// ============================================

function processOtherFile(data: ScrapedOtherFile): ArgumentRow[] {
  const rows: ArgumentRow[] = [];

  // Only process adjudicator decisions and appeals guidance
  if (
    data.pageType !== 'adjudicator-decisions' &&
    data.pageType !== 'appeals-guidance'
  ) {
    return rows;
  }

  for (const section of data.sections) {
    if (isBoilerplate(section.heading)) continue;
    if (section.content.trim().length < 100) continue;

    const relevantCodes = findRelevantCodes(
      section.heading + ' ' + section.content,
    );

    // If no relevant codes found, skip — we don't create untagged rows
    if (relevantCodes.length === 0) continue;

    const argumentType =
      data.pageType === 'adjudicator-decisions'
        ? 'case_precedent'
        : classifySection(section.heading, section.content, section.images);

    for (const code of relevantCodes) {
      rows.push({
        contraventionCode: code,
        argumentType,
        heading: section.heading.trim(),
        content: section.content.trim().slice(0, 5000), // Cap at 5KB
        signDiagramUrls: [],
        sourceUrl: data.url,
      });
    }
  }

  return rows;
}

// ============================================
// Educational content generation
// ============================================

type EducationalOverride = {
  commonScenarios?: string[];
  appealApproach?: string[];
  additionalFaqItems?: Array<{ question: string; answer: string }>;
};

function generateEducationalOverrides(
  data: ScrapedCodeFile,
): EducationalOverride | null {
  const appealSections = data.sections.filter(
    (s) =>
      !isBoilerplate(s.heading) &&
      s.content.trim().length >= 100 &&
      classifySection(s.heading, s.content, s.images) === 'legal_point',
  );

  if (appealSections.length === 0) return null;

  // Extract appeal approach points from legal_point sections
  const appealApproach: string[] = [];
  for (const section of appealSections) {
    // Extract key sentences that are actionable advice
    const sentences = section.content
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 300)
      .filter(
        (s) =>
          s.toLowerCase().includes('must') ||
          s.toLowerCase().includes('should') ||
          s.toLowerCase().includes('check') ||
          s.toLowerCase().includes('if the') ||
          s.toLowerCase().includes('you can') ||
          s.toLowerCase().includes('appeal'),
      );

    for (const sentence of sentences.slice(0, 3)) {
      if (appealApproach.length < 6) {
        appealApproach.push(sentence);
      }
    }
  }

  if (appealApproach.length === 0) return null;

  // Generate FAQ items from sign requirement sections
  const signSections = data.sections.filter(
    (s) =>
      !isBoilerplate(s.heading) &&
      classifySection(s.heading, s.content, s.images) === 'sign_requirement',
  );

  const additionalFaqItems: Array<{ question: string; answer: string }> = [];
  for (const section of signSections.slice(0, 2)) {
    const answer = section.content.trim().slice(0, 500);
    if (answer.length > 50) {
      additionalFaqItems.push({
        question: `What are the sign and marking requirements for Code ${data.code}?`,
        answer,
      });
    }
  }

  return {
    appealApproach: appealApproach.slice(0, 4),
    ...(additionalFaqItems.length > 0 ? { additionalFaqItems } : {}),
  };
}

function generateEducationalContentFile(
  overrides: Map<string, EducationalOverride>,
): string {
  const entries: string[] = [];

  for (const [code, override] of overrides) {
    const parts: string[] = [];
    if (override.appealApproach) {
      parts.push(
        `    appealApproach: ${JSON.stringify(override.appealApproach, null, 6).replace(/\n/g, '\n    ')},`,
      );
    }
    if (override.additionalFaqItems) {
      parts.push(
        `    additionalFaqItems: ${JSON.stringify(override.additionalFaqItems, null, 6).replace(/\n/g, '\n    ')},`,
      );
    }
    if (parts.length > 0) {
      entries.push(`  '${code}': {\n${parts.join('\n')}\n  }`);
    }
  }

  return `/**
 * Auto-generated educational content overrides from PCN UK data.
 * DO NOT EDIT — regenerate with: pnpm tsx scripts/import-pcn-uk.ts
 *
 * These are merged with manual overrides in educational-content.ts.
 * Manual overrides take precedence.
 */

type FaqItem = {
  question: string;
  answer: string;
};

type CodeEducationalContent = {
  commonScenarios: string[];
  appealApproach: string[];
  additionalFaqItems: FaqItem[];
};

const GENERATED_CODE_OVERRIDES: Partial<
  Record<string, Partial<CodeEducationalContent>>
> = {
${entries.join(',\n')}
};

export default GENERATED_CODE_OVERRIDES;
`;
}

// ============================================
// Main
// ============================================

async function main() {
  const dataDir = resolve(__dirname, '../data/pcn-uk');
  const files = readdirSync(dataDir).filter(
    (f) => f.endsWith('.json') && !f.includes('index'),
  );

  const codeFiles = files.filter((f) => f.startsWith('code-'));
  const otherFiles = files.filter((f) => f.startsWith('other-'));

  console.log(
    `Found ${codeFiles.length} code files, ${otherFiles.length} other files`,
  );
  if (DRY_RUN) console.log('DRY RUN — no database changes will be made\n');

  const allRows: ArgumentRow[] = [];
  const educationalOverrides = new Map<string, EducationalOverride>();
  // Track images per row for post-processing
  const rowImages = new Map<string, Array<{ src: string; alt: string }>>();

  // Process code files
  for (const file of codeFiles) {
    const data: ScrapedCodeFile = JSON.parse(
      readFileSync(resolve(dataDir, file), 'utf-8'),
    );
    const rows = processCodeFile(data);
    allRows.push(...rows);

    // Track images for each row
    for (const section of data.sections) {
      if (section.images.length > 0 && !isBoilerplate(section.heading)) {
        const key = `${data.url}|${section.heading.trim()}`;
        rowImages.set(key, section.images);
      }
    }

    // Generate educational content
    const override = generateEducationalOverrides(data);
    if (override) {
      educationalOverrides.set(data.code, override);
    }

    console.log(`  ${file}: ${rows.length} arguments`);
  }

  // Process other files
  for (const file of otherFiles) {
    const data: ScrapedOtherFile = JSON.parse(
      readFileSync(resolve(dataDir, file), 'utf-8'),
    );
    const rows = processOtherFile(data);
    allRows.push(...rows);

    if (rows.length > 0) {
      console.log(`  ${file}: ${rows.length} arguments`);
    }
  }

  console.log(`\nTotal arguments to upsert: ${allRows.length}`);

  // Type distribution
  const typeCounts = allRows.reduce(
    (acc, r) => {
      acc[r.argumentType] = (acc[r.argumentType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log('Type distribution:', typeCounts);

  // Code distribution (top 10)
  const codeCounts = allRows.reduce(
    (acc, r) => {
      acc[r.contraventionCode] = (acc[r.contraventionCode] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const topCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(
    'Top 10 codes:',
    topCodes.map(([c, n]) => `${c}(${n})`).join(', '),
  );

  if (DRY_RUN) {
    console.log('\nDry run complete. No changes made.');

    // Still generate educational content file in dry run
    console.log(
      `\nGenerated educational overrides for ${educationalOverrides.size} codes`,
    );
    return;
  }

  // Download images and upsert rows
  console.log('\nUpserting rows...');
  let upserted = 0;
  let skipped = 0;

  for (const row of allRows) {
    // Process images for this row
    const key = `${row.sourceUrl}|${row.heading}`;
    const images = rowImages.get(key) || [];
    const signDiagramUrls = images.length > 0 ? await processImages(images) : [];

    try {
      await prisma.challengeArgument.upsert({
        where: {
          sourceUrl_heading: {
            sourceUrl: row.sourceUrl,
            heading: row.heading,
          },
        },
        create: {
          contraventionCode: row.contraventionCode,
          argumentType: row.argumentType,
          heading: row.heading,
          content: row.content,
          signDiagramUrls,
          sourceUrl: row.sourceUrl,
        },
        update: {
          contraventionCode: row.contraventionCode,
          argumentType: row.argumentType,
          content: row.content,
          signDiagramUrls,
        },
      });
      upserted++;
    } catch (err) {
      // For "other" pages mapped to multiple codes, heading+sourceUrl won't be unique
      // across codes. Use create with a modified heading to handle this.
      try {
        const uniqueHeading = `[Code ${row.contraventionCode}] ${row.heading}`;
        await prisma.challengeArgument.upsert({
          where: {
            sourceUrl_heading: {
              sourceUrl: row.sourceUrl,
              heading: uniqueHeading,
            },
          },
          create: {
            contraventionCode: row.contraventionCode,
            argumentType: row.argumentType,
            heading: uniqueHeading,
            content: row.content,
            signDiagramUrls,
            sourceUrl: row.sourceUrl,
          },
          update: {
            contraventionCode: row.contraventionCode,
            argumentType: row.argumentType,
            content: row.content,
            signDiagramUrls,
          },
        });
        upserted++;
      } catch {
        skipped++;
      }
    }
  }

  console.log(`Upserted: ${upserted}, Skipped: ${skipped}`);

  // Write generated educational content
  const generatedContent = generateEducationalContentFile(educationalOverrides);
  const outputPath = resolve(
    __dirname,
    '../../../apps/web/data/contravention-codes/educational-content-generated.ts',
  );
  writeFileSync(outputPath, generatedContent, 'utf-8');
  console.log(
    `\nGenerated educational content: ${outputPath} (${educationalOverrides.size} codes)`,
  );

  if (imageUrlMap.size > 0) {
    console.log(`Downloaded ${imageUrlMap.size} sign diagram images to R2`);
  }
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
