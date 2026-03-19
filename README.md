# Julian Photography — Booking Form

A Next.js booking form with Google Calendar integration for Julian Photography.

## Quick Start

```bash
npm install
cp .env.example .env    # then fill in your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services → Library**
   - Search for "Google Calendar API" and click **Enable**
4. Create a Service Account:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → Service Account**
   - Give it a name (e.g. `julian-booking`) and click **Done**
5. Create a key for the Service Account:
   - Click on the newly created service account
   - Go to the **Keys** tab → **Add Key → Create new key → JSON**
   - Download the JSON file
6. From the downloaded JSON, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
7. Share your Google Calendar with the service account:
   - Open [Google Calendar](https://calendar.google.com)
   - Go to the calendar's **Settings → Share with specific people**
   - Add the service account email with **Make changes to events** permission
8. Get your Calendar ID:
   - In calendar settings, scroll to **Integrate calendar**
   - Copy the **Calendar ID** → `GOOGLE_CALENDAR_ID`

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email (from JSON key file) |
| `GOOGLE_PRIVATE_KEY` | Private key string (from JSON key file, keep the `\n` escapes) |
| `GOOGLE_CALENDAR_ID` | Target Google Calendar ID |

## Tech Stack

- **Next.js 14** — React framework with API routes
- **googleapis** — Google Calendar event creation
- **Vanilla CSS** — Custom styling with warm, elegant design
