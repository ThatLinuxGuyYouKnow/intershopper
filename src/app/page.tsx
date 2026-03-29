import { connection } from "next/server";
import Dashboard from "@/components/dashboard";
import { interswitchConfig } from "@/lib/interswitch";
import { listLinks } from "@/lib/links";

export default async function Home() {
  const { env } = interswitchConfig();

  await connection(); // link history is live data — render at request time

  let links: Awaited<ReturnType<typeof listLinks>> = [];
  let dbError: string | null = null;
  try {
    links = await listLinks();
  } catch (error) {
    console.error("Failed to load payment links:", error);
    dbError =
      "Could not load saved links — the database is unavailable. Creating links may also fail until this is fixed.";
  }

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Get paid with a link.
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Describe your product, set a price, and generate a hosted Interswitch
          payment link — copy it or share it straight to WhatsApp.
        </p>
      </section>

      <Dashboard initialLinks={links} env={env} initialError={dbError} />
    </div>
  );
}
