// GET /.netlify/functions/betaalstatus?id=tr_xxx -> { status: "paid" | "open" | "canceled" | ... }
// Geeft alleen de status terug, geen klantgegevens.

import { mollie } from "../lib/boek.mjs";

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^tr_[A-Za-z0-9]+$/.test(id)) {
    return new Response(JSON.stringify({ status: "onbekend" }), { status: 400 });
  }
  try {
    const b = await mollie(`/payments/${id}`);
    return new Response(JSON.stringify({ status: b.status }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ status: "onbekend" }), { status: 502 });
  }
};
