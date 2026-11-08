// GET  /.netlify/functions/bestel-boek  -> prijs en verzending voor op de pagina
// POST /.netlify/functions/bestel-boek  -> maakt een Mollie-betaling aan en geeft de checkout-link terug

import { BOEK, berekenTotaal, euro, mollie, siteUrl } from "../lib/boek.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const kort = (v, max = 120) => String(v ?? "").trim().slice(0, max);

export default async (req) => {
  if (req.method === "GET") {
    return json({
      prijs: BOEK.prijs,
      verzending: BOEK.verzending,
      gratisVerzendingVanaf: BOEK.gratisVerzendingVanaf,
      maxAantal: BOEK.maxAantal,
    });
  }
  if (req.method !== "POST") return json({ fout: "Methode niet toegestaan" }, 405);

  let d;
  try {
    d = await req.json();
  } catch {
    return json({ fout: "Ongeldige aanvraag" }, 400);
  }

  // Honeypot: bots vullen dit verborgen veld in, mensen niet
  if (d.website) return json({ fout: "Ongeldige aanvraag" }, 400);

  const klant = {
    naam: kort(d.naam, 80),
    email: kort(d.email, 120),
    bedrijf: kort(d.bedrijf, 80),
    straat: kort(d.straat, 100),
    postcode: kort(d.postcode, 10).toUpperCase(),
    plaats: kort(d.plaats, 60),
    land: kort(d.land || "NL", 2).toUpperCase(),
    opmerking: kort(d.opmerking, 200),
  };

  const ontbreekt = ["naam", "email", "straat", "postcode", "plaats"].filter((k) => !klant[k]);
  if (ontbreekt.length) return json({ fout: "Vul alle verplichte velden in." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(klant.email)) return json({ fout: "Dit e-mailadres klopt niet." }, 400);
  if (!["NL", "BE"].includes(klant.land)) return json({ fout: "We versturen alleen naar Nederland en België." }, 400);
  if (d.akkoord !== true) return json({ fout: "Ga akkoord met de algemene voorwaarden." }, 400);

  // Bedrag altijd hier berekenen, nooit uit de browser overnemen
  const t = berekenTotaal(d.aantal);
  const site = siteUrl(req);

  try {
    const betaling = await mollie("/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: { currency: "EUR", value: euro(t.totaal) },
        description: `${t.aantal}x ${BOEK.titel}`,
        redirectUrl: `${site}/het-boek/bedankt/`,
        webhookUrl: `${site}/.netlify/functions/mollie-webhook`,
        locale: "nl_NL",
        metadata: { ...klant, ...t, gemaild: false },
      }),
    });

    // Betaal-id aan de bedankpagina meegeven zodat die de status kan tonen
    await mollie(`/payments/${betaling.id}`, {
      method: "PATCH",
      body: JSON.stringify({ redirectUrl: `${site}/het-boek/bedankt/?id=${betaling.id}` }),
    });

    return json({ checkoutUrl: betaling._links.checkout.href });
  } catch (e) {
    console.error(e);
    return json({ fout: "Betalen lukt nu even niet. Probeer het later opnieuw of mail info@scaleupleadership.nl." }, 502);
  }
};
