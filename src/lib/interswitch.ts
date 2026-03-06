// Interswitch Pay Bill API client.
//
// Verified against the official docs + live endpoints:
//   - Token:    POST {passport}/passport/oauth/token   (Basic base64(clientId:secret))
//   - Create:   POST {gateway}/paymentgateway/api/v1/paybill   (Bearer token)
//   - Status:   GET  {gateway}/collections/api/v1/gettransaction.json
//
// Environments:
//   sandbox    -> passport-sandbox.interswitchng.com + sandbox.interswitchng.com
//   production -> passport.interswitchng.com          + webpay.interswitchng.com

export type InterswitchEnv = "sandbox" | "production";

const PRESETS: Record<
  InterswitchEnv,
  { passportUrl: string; paybillUrl: string; statusUrl: string }
> = {
  sandbox: {
    passportUrl: "https://passport-sandbox.interswitchng.com/passport/oauth/token",
    paybillUrl: "https://sandbox.interswitchng.com/paymentgateway/api/v1/paybill",
    statusUrl:
      "https://sandbox.interswitchng.com/collections/api/v1/gettransaction.json",
  },
  production: {
    passportUrl: "https://passport.interswitchng.com/passport/oauth/token",
    paybillUrl: "https://webpay.interswitchng.com/paymentgateway/api/v1/paybill",
    statusUrl:
      "https://webpay.interswitchng.com/collections/api/v1/gettransaction.json",
  },
};

export class InterswitchError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "InterswitchError";
    this.status = status;
    this.detail = detail;
  }
}

export function interswitchEnv(): InterswitchEnv {
  const value = (process.env.INTERSWITCH_ENV ?? "sandbox").toLowerCase();
  return value === "production" ? "production" : "sandbox";
}

export function interswitchConfig() {
  const env = interswitchEnv();
  const preset = PRESETS[env];
  return {
    env,
    passportUrl: process.env.INTERSWITCH_PASSPORT_URL || preset.passportUrl,
    paybillUrl: process.env.INTERSWITCH_PAYBILL_URL || preset.paybillUrl,
    statusUrl: process.env.INTERSWITCH_STATUS_URL || preset.statusUrl,
    clientId: process.env.INTERSWITCH_CLIENT_ID ?? "",
    secretKey: process.env.INTERSWITCH_SECRET_KEY ?? "",
    merchantCode: process.env.INTERSWITCH_MERCHANT_CODE || "MX6072",
    payableCode: process.env.INTERSWITCH_PAYABLE_CODE || "9405967",
  };
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;
let tokenInflight: Promise<string> | null = null;

async function getAccessToken(): Promise<string | null> {
  const cfg = interswitchConfig();
  if (!cfg.clientId || !cfg.secretKey) return null; // no credentials -> call unauthenticated
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.token;
  }
  if (tokenInflight) return tokenInflight;

  tokenInflight = (async () => {
    const basic = Buffer.from(`${cfg.clientId}:${cfg.secretKey}`).toString("base64");
    const res = await fetch(cfg.passportUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "profile",
      }),
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new InterswitchError(
        `Interswitch token request failed (${res.status}). Check INTERSWITCH_CLIENT_ID / INTERSWITCH_SECRET_KEY.`,
        res.status,
        text.slice(0, 300),
      );
    }

    let data: { access_token?: string; expires_in?: number };
    try {
      data = JSON.parse(text);
    } catch {
      throw new InterswitchError("Interswitch returned an invalid token response.", res.status, text.slice(0, 300));
    }
    if (!data.access_token) {
      throw new InterswitchError("Interswitch token response did not include an access token.", res.status, text.slice(0, 300));
    }

    const expiresIn = Number(data.expires_in ?? 86400);
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return tokenCache.token;
  })().finally(() => {
    tokenInflight = null;
  });

  return tokenInflight;
}

/** Extract a readable message from an Interswitch error body. */
function errorDetail(text: string): string | undefined {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const message =
      data.description ??
      data.error_description ??
      data.error ??
      data.responseDescription ??
      data.message;
    if (typeof message === "string" && message.length > 0) return message;
  } catch {
    /* not JSON — fall through */
  }
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 300 ? trimmed : undefined;
}

export interface CreateBillInput {
  amountKobo: number;
  customerEmail: string;
  customerId: string;
  transactionReference: string;
  redirectUrl: string;
}

export interface CreateBillResult {
  paymentUrl: string;
  /** Interswitch's own reference for the bill. */
  reference: string;
}

/**
 * Creates a one-time payment link (bill) at Interswitch and returns the
 * hosted `paymentUrl` the customer can pay on.
 */
export async function createBill(input: CreateBillInput): Promise<CreateBillResult> {
  const cfg = interswitchConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(cfg.paybillUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      merchantCode: cfg.merchantCode,
      payableCode: cfg.payableCode,
      // Interswitch amounts are in minor units (kobo for NGN).
      amount: String(input.amountKobo),
      redirectUrl: input.redirectUrl,
      customerId: input.customerId,
      currencyCode: "566", // ISO 4217 numeric for NGN
      customerEmail: input.customerEmail,
      transactionReference: input.transactionReference,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok || !data || typeof data.paymentUrl !== "string") {
    const detail = errorDetail(text);
    const friendly =
      res.status === 401
        ? "Interswitch rejected the credentials (401). Check your client ID and secret key."
        : res.status === 403
          ? "Interswitch denied the request (403)."
          : `Interswitch could not create the payment link (${res.status}).`;
    throw new InterswitchError(detail ? `${friendly} ${detail}` : friendly, res.status, detail);
  }

  return {
    paymentUrl: data.paymentUrl as string,
    reference: String(data.reference ?? ""),
  };
}

export interface TransactionStatusResult {
  responseCode: string;
  responseDescription: string;
  /** Amount Interswitch reports, in kobo. */
  amountKobo: number;
  paymentCancelled: boolean;
}

/**
 * Queries Interswitch for the status of a bill/transaction.
 * Tries our own transaction reference first, then Interswitch's reference.
 */
export async function getTransactionStatus(
  merchantReference: string,
  interswitchReference: string | null,
  amountKobo: number,
): Promise<TransactionStatusResult> {
  const cfg = interswitchConfig();
  const candidates = [merchantReference, interswitchReference].filter(
    (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index,
  );

  let lastResult: TransactionStatusResult | null = null;
  for (const reference of candidates) {
    const url = new URL(cfg.statusUrl);
    url.searchParams.set("merchantcode", cfg.merchantCode);
    url.searchParams.set("transactionreference", reference);
    url.searchParams.set("amount", String(amountKobo));

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    if (!res.ok) {
      throw new InterswitchError(
        `Status check failed at Interswitch (${res.status}).`,
        res.status,
        text.slice(0, 300),
      );
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new InterswitchError("Interswitch returned an invalid status response.", res.status, text.slice(0, 300));
    }

    const result: TransactionStatusResult = {
      responseCode: String(data.ResponseCode ?? ""),
      responseDescription: String(data.ResponseDescription ?? ""),
      amountKobo: Number(data.Amount ?? 0),
      paymentCancelled: Boolean(data.PaymentCancelled),
    };
    lastResult = result;
    // Z25 = "Transaction not Found" — try the other reference before giving up.
    if (result.responseCode !== "Z25") return result;
  }

  if (!lastResult) {
    throw new InterswitchError("No transaction reference available for the status check.", 400);
  }
  return lastResult;
}
