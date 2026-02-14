// Currency / sharing helpers — pure functions, safe on the client and server.

import type { PaymentLink } from "./types";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Kobo (minor units) -> "₦5,000.00" */
export function formatNaira(amountKobo: number): string {
  return nairaFormatter.format(amountKobo / 100);
}

/** Naira input (e.g. from a form) -> kobo, rounding to the nearest kobo. */
export function koboFromNaira(value: number): number {
  return Math.round(value * 100);
}

/** The message pre-filled when sharing a link on WhatsApp. */
export function paymentMessage(link: Pick<PaymentLink, "description" | "amountKobo" | "paymentUrl">): string {
  return `Hi! You can pay for "${link.description}" (${formatNaira(link.amountKobo)}) here: ${link.paymentUrl}`;
}

/** WhatsApp share URL — opens the chat picker with the message pre-filled. */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
