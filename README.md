# MultiStaff Multiplex Parser API

Independent server-side service for collecting Multiplex cinema schedules and exposing them to MultiStaff ADMIN and the Telegram bot.

The Unity application is not part of this service. Its old parser is used only as a reference for the extraction rules.

## Current implementation stage

This repository is being rebuilt as a Node.js API service. Google Sheets credentials and spreadsheet access are configured later through Northflank environment variables; private keys must never be committed.

## Planned behavior

- Atmosfera and Karavan spreadsheets are enabled initially; Retroville is postponed.
- One spreadsheet per cinema; the service creates the required tabs and configuration structure.
- Weekly archive tabs are preserved and never replace previous weeks.
- Automatic collection starts every Tuesday at 00:00 in Europe/Kyiv.
- Collection window ends Wednesday at 08:00 in Europe/Kyiv.
- Manual collection can be started independently and does not change the next scheduled run.
- One global queue serializes all Multiplex collection work.
- Requests are paced; HTTP 403/429 and anti-bot challenge pages trigger a pause/backoff.
- Empty, failed, or insufficiently complete parses never overwrite valid archived schedules.
- Job progress reflects completed work and successful persistence, not elapsed time.

## Local development

```bash
npm install
npm run dev
```

The service listens on `PORT` (default `3000`).

## Northflank

Build from this repository using the included Dockerfile. Keep the service running continuously. Configure Google service-account credentials and other secrets as environment variables in Northflank, never in Git.

## API

Initial health endpoint: `GET /health`.

Further schedule, status, configuration, and admin endpoints will be added in subsequent implementation steps.
