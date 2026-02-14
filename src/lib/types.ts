// Shared, dependency-free types — safe to import from client components.

export type LinkStatus = "pending" | "paid";

export interface PaymentLink {
  id: string;
  description: string;
  amountKobo: number;
  customerName: string | null;
  customerEmail: string;
  /** Reference we generated and sent to Interswitch (used in the return redirect). */
  merchantReference: string;
  /** Reference Interswitch assigned to the bill. */
  interswitchReference: string | null;
  paymentUrl: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
}
