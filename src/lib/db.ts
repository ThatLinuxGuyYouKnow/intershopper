// libSQL (SQLite) client with dual-mode persistence:
//   - local dev:   a SQLite file at ./data/intershopper.db
//   - on Vercel:   TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) for real persistence;
//                  without it, falls back to an ephemeral file in /tmp so the app
//                  still runs (history resets on cold starts).
//
// @libsql/client is on Next.js's default serverExternalPackages list, so it is
// loaded from node_modules at runtime instead of being bundled.

import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

const globalForDb = globalThis as unknown as { __intershopperDb?: Client };

function resolveDbConfig(): { url: string; authToken?: string } {
  const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (remoteUrl) {
    return { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  // Ephemeral filesystem on serverless — write where it is allowed.
  const filePath = process.env.VERCEL
    ? path.join("/tmp", "intershopper.db")
    : path.join(process.cwd(), "data", "intershopper.db");
  return { url: `file:${filePath}` };
}

export function getDb(): Client {
  if (!globalForDb.__intershopperDb) {
    const { url, authToken } = resolveDbConfig();
    if (url.startsWith("file:")) {
      try {
        fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
      } catch {
        // Directory may be read-only; libsql will surface a clear error on write.
      }
    }
    globalForDb.__intershopperDb = createClient({ url, authToken });
  }
  return globalForDb.__intershopperDb;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS payment_links (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  merchant_reference TEXT NOT NULL UNIQUE,
  interswitch_reference TEXT,
  payment_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_at ON payment_links (created_at DESC);
`;

let schemaReady: Promise<void> | undefined;

async function initSchema(): Promise<void> {
  const db = getDb();
  // libsql `execute` runs a single statement; run them in order.
  for (const statement of SCHEMA.split(";")) {
    const sql = statement.trim();
    if (sql.length > 0) await db.execute(sql);
  }
}

/** Creates tables on first use; retries after a failed attempt. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}
