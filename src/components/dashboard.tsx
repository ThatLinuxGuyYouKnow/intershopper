"use client";

import { useState, type FormEvent } from "react";
import type { PaymentLink } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";
import LinkActions from "./link-actions";
import StatusBadge from "./status-badge";

interface Props {
  initialLinks: PaymentLink[];
  env: "sandbox" | "production";
  initialError?: string | null;
}

interface StatusFeedback {
  kind: "ok" | "info" | "error";
  text: string;
}

const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

export default function Dashboard({ initialLinks, env, initialError }: Props) {
  const [links, setLinks] = useState<PaymentLink[]>(initialLinks);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [freshLink, setFreshLink] = useState<PaymentLink | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, StatusFeedback>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          price: Number(price),
          customerName: customerName.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.link) {
        setError(data.error ?? "Could not create the payment link. Try again.");
        return;
      }
      const link = data.link as PaymentLink;
      setFreshLink(link);
      setLinks((current) => [link, ...current.filter((item) => item.id !== link.id)]);
      setDescription("");
      setPrice("");
      setCustomerName("");
      setCustomerEmail("");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkStatus(link: PaymentLink) {
    if (checkingId) return;
    setCheckingId(link.id);
    setFeedback((current) => ({
      ...current,
      [link.id]: { kind: "info", text: "Checking with Interswitch…" },
    }));
    try {
      const res = await fetch(`/api/links/${link.id}/status`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback((current) => ({
          ...current,
          [link.id]: { kind: "error", text: data.error ?? "Status check failed." },
        }));
        return;
      }
      const paid = data.status === "paid";
      if (paid) {
        setLinks((current) =>
          current.map((item) => (item.id === link.id ? { ...item, status: "paid" } : item)),
        );
        setFeedback((current) => ({
          ...current,
          [link.id]: { kind: "ok", text: "Payment confirmed 🎉" },
        }));
      } else {
        // Z25 = transaction not found (nobody has paid yet).
        const friendly =
          data.responseCode === "Z25"
            ? "No payment yet."
            : `${data.responseCode}: ${data.responseDescription}`;
        setFeedback((current) => ({
          ...current,
          [link.id]: {
            kind: "info",
            text: data.amountMatches === false ? `Amount mismatch — ${friendly}` : friendly,
          },
        }));
      }
    } catch {
      setFeedback((current) => ({
        ...current,
        [link.id]: { kind: "error", text: "Network error while checking." },
      }));
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      {/* ---------- Create form ---------- */}
      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">New payment link</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              env === "production"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                : "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
            }`}
          >
            {env === "production" ? "Live" : "Sandbox"}
          </span>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Describe what you&apos;re selling and set the price. We&apos;ll create a hosted
          Interswitch payment link you can copy or share on WhatsApp.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Product description
            </label>
            <textarea
              id="description"
              required
              minLength={3}
              maxLength={200}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. 50kg bag of rice — delivery within Lagos"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-slate-700">
              Price
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
                ₦
              </span>
              <input
                id="price"
                type="number"
                required
                min={1}
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                className={`${FIELD} pl-8`}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Customer name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="customerName"
                type="text"
                maxLength={100}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Amaka Okafor"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-medium text-slate-700">
                Customer email <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="customerEmail"
                type="email"
                maxLength={200}
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="amaka@example.com"
                className={FIELD}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                  <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Creating link…
              </>
            ) : (
              "Generate payment link"
            )}
          </button>
        </form>
      </section>

      {/* ---------- Results + history ---------- */}
      <section className="space-y-6">
        {freshLink && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-emerald-900">Payment link ready</h2>
            </div>
            <p className="mb-1 text-sm text-emerald-800">
              {freshLink.description} — <strong>{formatNaira(freshLink.amountKobo)}</strong>
            </p>
            <div className="mb-4 truncate rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-600">
              {freshLink.paymentUrl}
            </div>
            <LinkActions link={freshLink} large />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Your links</h2>
            <span className="text-sm text-slate-500">{links.length} total</span>
          </div>

          {links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">No links yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first payment link with the form.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {links.map((link) => {
                const note = feedback[link.id];
                return (
                  <li key={link.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {link.description}
                          </p>
                          <StatusBadge status={link.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatNaira(link.amountKobo)} · {formatDate(link.createdAt)} · ref{" "}
                          <span className="font-mono">{link.merchantReference}</span>
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatNaira(link.amountKobo)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <LinkActions
                        link={link}
                        checking={checkingId === link.id}
                        onCheckStatus={() => checkStatus(link)}
                      />
                    </div>

                    {note && (
                      <p
                        className={`mt-2 text-xs ${
                          note.kind === "ok"
                            ? "text-emerald-600"
                            : note.kind === "error"
                              ? "text-red-600"
                              : "text-slate-500"
                        }`}
                      >
                        {note.text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
