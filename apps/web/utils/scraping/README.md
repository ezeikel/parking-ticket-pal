# Parking Appeals Data Scraper - Optimized

## Overview

This scraper collects historical parking appeals data from London Tribunals. It's been optimized to handle long-running scraping sessions with automatic checkpointing, deduplication, and timeout handling.

## Key Features

### 1. **Checkpoint/Resume System**
- Automatically saves progress every 10 appeals
- Can be stopped and resumed without losing progress
- State file stored at: `data/scraping-state.json`

### 2. **Timeout Protection**
- Configured to run for 55 minutes max (safe margin before 1hr timeout)
- Gracefully stops before timeout and saves all progress
- Can be re-run to continue from where it stopped

### 3. **Deduplication**
- Tracks processed case references to avoid duplicates
- Skips already-scraped appeals when resuming
- Safe to run multiple times

### 4. **Batch Writing**
- Writes CSV in batches of 50 records for efficiency
- Reduces I/O operations
- Flushes pending records on exit

### 5. **Progress Tracking**
- Detailed logging with progress reports
- Shows total appeals scraped, current date, runtime
- Logs every 5 pages processed

### 6. **Error Recovery**
- Automatic retry mechanism (3 attempts per appeal)
- Recovers from navigation failures
- Continues processing even if individual appeals fail

## Usage

### Initial Run
```bash
pnpm scrape:past-appeals
```

### Resume After Timeout
Just run the same command - it will automatically resume from the last checkpoint:
```bash
pnpm scrape:past-appeals
```

### Reset and Start Fresh
Delete the state file:
```bash
rm data/scraping-state.json
pnpm scrape:past-appeals
```

## Output Files

- **CSV Data**: `data/appeals.csv` - Contains all scraped appeal records
- **State File**: `data/scraping-state.json` - Tracks scraping progress

## CSV Columns

- Case Reference
- Declarant
- Authority
- VRM (Vehicle Registration Mark)
- PCN (Penalty Charge Notice)
- Contravention Date
- Contravention Time
- Contravention Location
- Penalty Amount
- Contravention
- Referral Date
- Decision Date
- Adjudicator
- Appeal Decision
- Direction
- Reasons

## Configuration

You can adjust settings in the `CONFIG` object:

```typescript
const CONFIG = {
  MAX_RUNTIME_MS: 55 * 60 * 1000,   // 55 minutes
  CHECKPOINT_INTERVAL: 10,           // Save every 10 appeals
  BATCH_SIZE: 50,                    // Write CSV in batches of 50
  REDUCED_WAIT_TIME: 5000,          // 5 second wait for page loads
}
```

## Running as a Cron Job

For daily updates, you can set up a cron job:

```bash
# Run every day at 2 AM to collect new appeals
0 2 * * * cd /path/to/project && pnpm scrape:past-appeals >> logs/scraper.log 2>&1
```

## Optimization Details

### What Was Optimized:

1. **Sequential Processing**: Changed from concurrent to sequential processing to avoid DOM issues
2. **Reduced Wait Times**: Using shorter timeouts where possible (5s instead of 60-120s)
3. **Smart Deduplication**: Tracks all processed case references in memory and on disk
4. **Batch I/O**: Writes to CSV in batches instead of one record at a time
5. **Checkpoint System**: Saves state periodically so you can resume after interruptions
6. **Timeout Handling**: Stops gracefully before hitting system timeouts

### Performance Estimates:

- **Without Optimization**: ~3-5 seconds per appeal
- **With Optimization**: ~2-3 seconds per appeal
- **55-minute session**: Can process ~1,100-1,650 appeals
- **Daily re-runs**: Only processes new appeals (very fast)

## Troubleshooting

### Script stops with timeout
This is normal! Just run it again - it will resume from where it left off.

### Duplicate records in CSV
The script uses deduplication, but if you manually delete the state file, duplicates may occur. To clean:
```bash
# Remove duplicates (keep first occurrence)
sort -u -t, -k1,1 data/appeals.csv > data/appeals-clean.csv
mv data/appeals-clean.csv data/appeals.csv
```

### Browser crashes
The script has error recovery, but if it crashes completely:
1. Check your system resources (RAM, disk space)
2. The state is saved, so just restart the script
3. Consider running with `headless: true` to save resources

### State file corruption
If the state file gets corrupted:
```bash
rm data/scraping-state.json
# Manually backup your CSV before restarting
cp data/appeals.csv data/appeals-backup.csv
pnpm scrape:past-appeals
```

## Next Steps: Database Integration

Once you have the initial CSV data, you can import it into Redis/database:

```typescript
// Example: Import to Prisma database
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const csvData = readFileSync('data/appeals.csv', 'utf-8');
const records = parse(csvData, { columns: true });

for (const record of records) {
  await prisma.appeal.create({
    data: {
      caseReference: record['Case Reference'],
      authority: record.Authority,
      // ... map other fields
    },
  });
}
```

## Future Enhancements

- [ ] Parallel browser contexts for true concurrent scraping
- [ ] Database direct insert instead of CSV
- [ ] Incremental scraping (only new dates)
- [ ] Proxy rotation for rate limiting
- [ ] Headless mode for production
- [ ] Docker containerization
- [ ] Cloud function deployment (with checkpointing to cloud storage)
