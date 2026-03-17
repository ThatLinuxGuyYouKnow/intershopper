import type { NextRequest } from "next/server";
import { InterswitchError, getTransactionStatus } from "@/lib/interswitch";
import { getLinkById, setLinkStatus } from "@/lib/links";

/**
 * Checks a link's payment status with Interswitch and persists it.
 *
 * Interswitch response codes seen in testing:
 *   00  -> transaction found/approved (we also verify the amount matches)
 *   Z25 -> transaction not found
 *   Z1  -> amount inconsistency
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/links/[id]/status">,
) {
  const { id } = await ctx.params;

  const link = await getLinkById(id);
  if (!link) {
    return Response.json({ error: "Link not found." }, { status: 404 });
  }

  try {
    const result = await getTransactionStatus(
      link.merchantReference,
      link.interswitchReference,
      link.amountKobo,
    );

    const approved = result.responseCode === "00";
    // Amount only exists once a transaction is found — don't flag a mismatch
    // for "not found" responses (Amount comes back as 0 there).
    const amountMatches = approved ? result.amountKobo === link.amountKobo : null;
    const paid = approved && amountMatches === true;

    if (paid && link.status !== "paid") {
      await setLinkStatus(link.id, "paid");
    }

    return Response.json({
      status: paid ? "paid" : "pending",
      responseCode: result.responseCode,
      responseDescription: result.responseDescription,
      amountMatches,
      paymentCancelled: result.paymentCancelled,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof InterswitchError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    console.error("Status check failed:", error);
    return Response.json(
      { error: "Status check failed. Try again." },
      { status: 500 },
    );
  }
}
