// Persistence layer for generated payment links.

import { randomUUID } from "node:crypto";
import { ensureSchema, getDb } from "./db";
import type { LinkStatus, PaymentLink } from "./types";

interface LinkRow {
  id: string;
  description: string;
  amount_kobo: number;
  customer_name: string | null;
  customer_email: string;
  merchant_reference: string;
  interswitch_reference: string | null;
  payment_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toPaymentLink(row: LinkRow): PaymentLink {
  return {
    id: row.id,
    description: row.description,
    amountKobo: Number(row.amount_kobo),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    merchantReference: row.merchant_reference,
    interswitchReference: row.interswitch_reference,
    paymentUrl: row.payment_url,
    status: row.status === "paid" ? "paid" : "pending",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InsertLinkInput {
  description: string;
  amountKobo: number;
  customerName: string | null;
  customerEmail: string;
  merchantReference: string;
  interswitchReference: string;
  paymentUrl: string;
}

export async function insertLink(input: InsertLinkInput): Promise<PaymentLink> {
  await ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  await db.execute({
    sql: `INSERT INTO payment_links (
      id, description, amount_kobo, customer_name, customer_email,
      merchant_reference, interswitch_reference, payment_url, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    args: [
      id,
      input.description,
      input.amountKobo,
      input.customerName,
      input.customerEmail,
      input.merchantReference,
      input.interswitchReference,
      input.paymentUrl,
      now,
      now,
    ],
  });

  const link = await getLinkById(id);
  if (!link) throw new Error("Failed to read back the created payment link.");
  return link;
}

export async function listLinks(limit = 100): Promise<PaymentLink[]> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM payment_links ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return (result.rows as unknown as LinkRow[]).map(toPaymentLink);
}

export async function getLinkById(id: string): Promise<PaymentLink | null> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM payment_links WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0] as unknown as LinkRow | undefined;
  return row ? toPaymentLink(row) : null;
}

export async function getLinkByMerchantReference(reference: string): Promise<PaymentLink | null> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM payment_links WHERE merchant_reference = ?`,
    args: [reference],
  });
  const row = result.rows[0] as unknown as LinkRow | undefined;
  return row ? toPaymentLink(row) : null;
}

export async function setLinkStatus(id: string, status: LinkStatus): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.execute({
    sql: `UPDATE payment_links SET status = ?, updated_at = ? WHERE id = ?`,
    args: [status, new Date().toISOString(), id],
  });
}
