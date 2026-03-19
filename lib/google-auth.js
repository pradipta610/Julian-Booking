import { google } from 'googleapis';

/**
 * Creates a Google Auth JWT client.
 * Supports two modes:
 * 1. GOOGLE_CREDENTIALS_BASE64 — base64-encoded service account JSON (recommended for Vercel)
 * 2. Individual env vars — GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (for local dev)
 */
export function getGoogleAuth(scopes) {
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const json = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    );
    return new google.auth.JWT(
      json.client_email,
      null,
      json.private_key,
      scopes
    );
  }

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes
  );
}
