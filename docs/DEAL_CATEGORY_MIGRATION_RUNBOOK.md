# Deal Category Backfill Runbook

This runbook backfills `dealCategory` on existing `deals` documents without deleting or merging any records.

## What it does

- Reads all documents in `deals`
- Classifies each row as:
  - `side` when all selected products are side products (`book`, `workshop`, `business_track`)
  - `core` otherwise
- Updates only `dealCategory` (+ `updatedAt`)

## Safety

- Default mode is dry-run
- No deletes
- No merge
- Existing revenue and counts are unchanged

## Command

Dry run:

```bash
npx tsx "scripts/backfill-deal-category.ts" --serviceAccount="./Keys/serviceAccount.json" --dryRun=true
```

Apply:

```bash
npx tsx "scripts/backfill-deal-category.ts" --serviceAccount="./Keys/serviceAccount.json" --dryRun=false
```

## Expected output

Example:

```text
backfill-deal-category: scanned=120 updates=118 core=88 side=32 dryRun=true
```

## Post-checks

- Confirm `core + side = scanned`
- Spot-check:
  - Book-only deals => `side`
  - Course deals => `core`
  - Mixed products => `core`
