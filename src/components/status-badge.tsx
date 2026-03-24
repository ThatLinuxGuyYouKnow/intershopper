import type { LinkStatus } from "@/lib/types";

const STYLES: Record<LinkStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const DOT: Record<LinkStatus, string> = {
  pending: "bg-amber-500",
  paid: "bg-emerald-500",
};

export default function StatusBadge({ status }: { status: LinkStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {status === "paid" ? "Paid" : "Pending"}
    </span>
  );
}
