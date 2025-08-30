import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// Define the structure of a contravention code
type ContraventionCode = {
  code: string;
  generalSuffixes: string;
  description: string;
  notes: string;
};

async function saveToCSV(
  contraventionCodes: ContraventionCode[],
): Promise<void> {
  const outputDir = path.join(process.cwd(), 'data');

  // Create the directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, 'contravention_codes.csv');

  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'code', title: 'Code' },
      { id: 'generalSuffixes', title: 'General Suffixes' },
      { id: 'description', title: 'Description' },
      { id: 'notes', title: 'Notes' },
    ],
  });

  await csvWriter.writeRecords(contraventionCodes);
  console.log(`📄 Saved contravention codes to ${csvPath}`);
}

// Uncomment if you want to save to database
/*
async function saveToDatabase(contraventionCodes: ContraventionCode[]): Promise<void> {
  console.log('💾 Saving contravention codes to database...');
  
  for (const code of contraventionCodes) {
    await prisma.contraventionCode.upsert({
      where: { code: code.code },
      update: {
        description: code.description,
        generalSuffixes: code.generalSuffixes
      },
      create: {
        code: code.code,
        description: code.description,
        generalSuffixes: code.generalSuffixes
      }
    });
  }
  
  console.log('✅ Saved contravention codes to database');
}
*/

export async function getContraventionCodes(): Promise<ContraventionCode[]> {
  try {
    // Fetch the HTML content directly with native fetch
    const url =
      'https://www.gov.uk/government/publications/civil-enforcement-of-parking-contraventions/guidance-for-local-authorities-on-enforcing-parking-restrictions';
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const contraventionCodes: ContraventionCode[] = [];

    // Find heading with ID for table 1 and get the table that follows it
    const table1Heading = $(
      '#table-1-higher-level-parking-contravention-codes-on-street',
    );

    const table1 = table1Heading.nextAll('table').first();

    // Find heading with ID for table 2 and get the table that follows it
    const table2Heading = $(
      '#table-2-higher-level-parking-contravention-codes-off-street',
    );

    const table2 = table2Heading.nextAll('table').first();

    // Process both tables
    [table1, table2].forEach((table) => {
      if (!table.length) {
        console.warn('Table not found');
        return;
      }

      table.find('tbody tr').each((_, row) => {
        const columns = $(row).find('td');
        if (columns.length >= 4) {
          const code = $(columns[0]).text().trim();
          const generalSuffixes = $(columns[1]).text().trim();
          const description = $(columns[2]).text().trim();
          const notes = $(columns[3]).text().trim();

          // Only add entries with non-empty codes
          if (code) {
            contraventionCodes.push({
              code,
              generalSuffixes,
              description,
              notes,
            });
          }
        }
      });
    });

    return contraventionCodes;
  } catch (error) {
    console.error('Error extracting contravention codes:', error);
    return [];
  }
}

async function main() {
  try {
    console.log('🎬 Starting script...');
    const codes = await getContraventionCodes();
    await saveToCSV(codes);
    // Uncomment if you want to save to database
    // await saveToDatabase(codes);
    console.log('🎉 Script completed successfully');
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is being run directly
if (require.main === module) {
  main();
}
