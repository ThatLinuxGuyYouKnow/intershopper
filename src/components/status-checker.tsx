"use client";

import { useState } from "react";
import type { LinkStatus } from "@/lib/types";
import StatusBadge from "./status-badge";

interface Props {
  linkId: string;
  initialStatus: LinkStatus;
}

/** Lets a customer re-check their payment status from the return page. */
export default function StatusChecker({ linkId, initialStatus }: Props) {
  const [status, setStatus] = useState<LinkStatus>(initialStatus);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function check() {
    if (checking) return;
    setChecking(true);
    setNote(null);
    try {
      const res = await fetch(`/api/links/${linkId}/status`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Status check failed — try again.");
        return;
      }
      if (data.status === "paid") {
        setStatus("paid");
        setNote("Payment confirmed 🎉");
      } else if (data.responseCode === "Z25") {
        setNote("Payment not confirmed yet — try again in a moment.");
      } else {
        const detail = data.responseDescription
          ? `${data.responseCode}: ${data.responseDescription}`
          : "No payment found yet.";
        setNote(detail);
      }
    } catch {
      setNote("Network error — try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {status === "pending" && (
          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check again"}
          </button>
        )}
      </div>
      {note && <p className="text-sm text-slate-500">{note}</p>}
    </div>
  );
}
