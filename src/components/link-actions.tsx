"use client";

import { useEffect, useRef, useState } from "react";
import type { PaymentLink } from "@/lib/types";
import { paymentMessage, whatsappShareUrl } from "@/lib/format";

interface Props {
  link: PaymentLink;
  onCheckStatus?: () => void;
  checking?: boolean;
  /** Larger buttons for the "link ready" highlight card. */
  large?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (http, older browsers) — fall back.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function LinkActions({ link, onCheckStatus, checking, large }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await copyText(link.paymentUrl);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const sizeClass = large
    ? "px-3.5 py-2.5 text-sm"
    : "px-2.5 py-1.5 text-xs sm:text-sm";
  const iconClass = large ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-900 font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${sizeClass}`}
        aria-live="polite"
      >
        {copied ? (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9" />
          </svg>
        ) : (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5h-1A1.5 1.5 0 0 0 4 8v7A1.5 1.5 0 0 0 5.5 16.5h7A1.5 1.5 0 0 0 14 15v-1M8 4h6.5A1.5 1.5 0 0 1 16 5.5V12" />
          </svg>
        )}
        {copied ? "Copied!" : "Copy link"}
      </button>

      <a
        href={whatsappShareUrl(paymentMessage(link))}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${sizeClass}`}
      >
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.45 1.06 2.86 1.21 3.06.15.2 2.09 3.19 5.07 4.47.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35ZM12.04 21.5h-.01a9.44 9.44 0 0 1-4.8-1.32l-.35-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.24-9.43 9.45-9.43 2.52 0 4.89.98 6.67 2.76a9.35 9.35 0 0 1 2.76 6.68c0 5.2-4.24 9.42-9.44 9.42Zm8.03-17.46A11.3 11.3 0 0 0 12.04.5C5.76.5.67 5.58.67 11.86c0 2.09.55 4.13 1.59 5.93L.57 23.5l5.86-1.54a11.35 11.35 0 0 0 5.6 1.42h.01c6.28 0 11.37-5.08 11.38-11.36 0-3.03-1.18-5.88-3.33-8.02Z" />
        </svg>
        Share on WhatsApp
      </a>

      <a
        href={link.paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${sizeClass}`}
      >
        <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h5v5M16 4 9 11M8.5 5.5H6A1.5 1.5 0 0 0 4.5 7v7A1.5 1.5 0 0 0 6 15.5h7a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
        </svg>
        Open
      </a>

      {onCheckStatus && (
        <button
          type="button"
          onClick={onCheckStatus}
          disabled={checking}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass}`}
        >
          <svg
            className={`${iconClass} ${checking ? "animate-spin" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5V7H13" />
          </svg>
          {checking ? "Checking…" : "Check status"}
        </button>
      )}
    </div>
  );
}
