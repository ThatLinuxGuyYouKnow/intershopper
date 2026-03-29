import Link from "next/link";
import { formatNaira, formatDate } from "@/lib/format";
import { getLinkByMerchantReference } from "@/lib/links";
import StatusChecker from "@/components/status-checker";

/**
 * Where Interswitch redirects the customer after checkout. The `ref` query
 * param is the transaction reference we generated at link-creation time.
 */
export default async function PaymentSuccessPage(props: PageProps<"/payment/success">) {
  const searchParams = await props.searchParams;
  const ref = typeof searchParams.ref === "string" ? searchParams.ref : "";
  const link = ref ? await getLinkByMerchantReference(ref) : null;

  if (!link) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Payment reference not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          If you just completed a payment, the merchant will confirm it shortly.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9" />
        </svg>
      </span>

      <h1 className="mt-4 text-lg font-semibold text-slate-900">
        Thanks — we&apos;re confirming your payment
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {link.description}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {formatNaira(link.amountKobo)}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Ref {link.merchantReference} · {formatDate(link.createdAt)}
      </p>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <StatusChecker linkId={link.id} initialStatus={link.status} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        You can close this page — the merchant has been notified.
      </p>
      <Link
        href="/"
        className="mt-3 inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
