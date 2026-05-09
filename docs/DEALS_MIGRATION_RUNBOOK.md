# Deals Migration Runbook

## Goal
Merge historical duplicate deal records so each client has one canonical deal record.

## Script
Use:

`tsx scripts/merge-client-deals.ts --serviceAccount=./Keys/serviceAccount.json --dryRun=true`

Then apply:

`tsx scripts/merge-client-deals.ts --serviceAccount=./Keys/serviceAccount.json --dryRun=false`

## What gets merged
- `products` -> union
- `programCount` -> derived from merged products
- `programName` -> rebuilt from merged products
- `dealValue` -> sum of all merged records
- `contactAttempts` -> sum
- `closeDate/date` -> latest close date in group

## Rollback
- Take Firestore export before applying.
- If rollback needed, import backup export.
