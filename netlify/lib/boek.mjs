// Eén plek voor prijs en verzending. De pagina leest deze bedragen ook uit,
// dus je past ze alleen hier aan.

export const BOEK = {
  titel: "Stilstaan om te groeien",
  auteur: "Miriam Cnossen",
  isbn: "9789090413495",
  prijs: 24.95,        // PAS AAN: verkoopprijs per boek, incl. 9% btw
  verzending: 3.95,    // PAS AAN: verzendkosten per bestelling, incl. btw
  gratisVerzendingVanaf: 3, // vanaf dit aantal boeken geen verzendkosten (zet op 0 om uit te zetten)
  maxAantal: 10,
};

export function berekenTotaal(aantal) {
  const n = Math.max(1, Math.min(BOEK.maxAantal, parseInt(aantal, 10) || 1));
  const gratis = BOEK.gratisVerzendingVanaf > 0 && n >= BOEK.gratisVerzendingVanaf;
  const verzending = gratis ? 0 : BOEK.verzending;
  const subtotaal = Math.round(n * BOEK.prijs * 100) / 100;
  const totaal = Math.round((subtotaal + verzending) * 100) / 100;
  return { aantal: n, subtotaal, verzending, totaal };
}

export const euro = (v) => v.toFixed(2); // Mollie wil "24.95" als string

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function siteUrl(req) {
  return (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export async function mollie(pad, opties = {}) {
  const res = await fetch(`https://api.mollie.com/v2${pad}`, {
    ...opties,
    headers: {
      Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
      "Content-Type": "application/json",
      ...(opties.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mollie ${res.status}: ${data.detail || JSON.stringify(data)}`);
  return data;
}
