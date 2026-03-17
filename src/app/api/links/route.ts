import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { connection } from "next/server";
import {
  createBill,
  InterswitchError,
  interswitchConfig,
} from "@/lib/interswitch";
import { koboFromNaira } from "@/lib/format";
import { insertLink, listLinks } from "@/lib/links";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PRICE_NAIRA = 100_000_000; // ₦100m sanity cap

interface CreateLinkBody {
  description?: unknown;
  price?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

export async function GET() {
  await connection(); // live link history — never prerendered
  const links = await listLinks();
  return Response.json({ links, env: interswitchConfig().env });
}

export async function POST(request: NextRequest) {
  let body: CreateLinkBody;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be JSON.");
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 3) {
    return badRequest("Describe the product or service (at least 3 characters).");
  }
  if (description.length > 200) {
    return badRequest("Keep the description under 200 characters.");
  }

  const price = typeof body.price === "string" ? Number(body.price) : body.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return badRequest("Enter a price greater than zero.");
  }
  if (price > MAX_PRICE_NAIRA) {
    return badRequest("Price is above the supported limit.");
  }

  const customerName =
    typeof body.customerName === "string" && body.customerName.trim().length > 0
      ? body.customerName.trim().slice(0, 100)
      : null;

  let customerEmail: string | null = null;
  if (typeof body.customerEmail === "string" && body.customerEmail.trim().length > 0) {
    customerEmail = body.customerEmail.trim().slice(0, 200);
    if (!EMAIL_RE.test(customerEmail)) {
      return badRequest("Enter a valid email address, or leave it blank.");
    }
  }

  const amountKobo = koboFromNaira(price);
  const merchantReference = `ISH${randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase()}`;

  // Where Interswitch sends the customer after payment.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const origin = appUrl || new URL(request.url).origin;
  const redirectUrl = `${origin}/payment/success?ref=${merchantReference}`;

  const email = customerEmail ?? `guest-${merchantReference.toLowerCase()}@example.com`;

  try {
    const bill = await createBill({
      amountKobo,
      customerEmail: email,
      customerId: email,
      transactionReference: merchantReference,
      redirectUrl,
    });

    const link = await insertLink({
      description,
      amountKobo,
      customerName,
      customerEmail: email,
      merchantReference,
      interswitchReference: bill.reference,
      paymentUrl: bill.paymentUrl,
    });

    return Response.json({ link, env: interswitchConfig().env }, { status: 201 });
  } catch (error) {
    if (error instanceof InterswitchError) {
      return Response.json(
        { error: error.message, detail: error.detail },
        { status: 502 },
      );
    }
    console.error("Failed to create payment link:", error);
    return Response.json(
      { error: "Something went wrong while creating the link. Try again." },
      { status: 500 },
    );
  }
}
