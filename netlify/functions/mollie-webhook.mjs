// Mollie roept deze functie aan bij elke statuswijziging van een betaling.
// Is de betaling betaald, dan gaan er twee mails uit: naar de koper en naar Scale-up Leadership.
// Mollie kan de webhook vaker aanroepen. Daarom zetten we na het mailen "gemaild: true" in de metadata.

import { BOEK, esc, mollie } from "../lib/boek.mjs";

async function stuurMail({ aan, onderwerp, html, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Scale-up Leadership <info@scaleupleadership.nl>",
      to: [aan],
      subject: onderwerp,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const bedrag = (v) => `€ ${Number(v).toFixed(2).replace(".", ",")}`;

function adresBlok(m) {
  return [m.naam, m.bedrijf, m.straat, `${m.postcode} ${m.plaats}`, m.land]
    .filter(Boolean)
    .map(esc)
    .join("<br>");
}

function regels(m) {
  return `
    <table cellpadding="6" style="border-collapse:collapse;font-size:15px">
      <tr><td>${m.aantal}x ${esc(BOEK.titel)}</td><td align="right">${bedrag(m.subtotaal)}</td></tr>
      <tr><td>Verzending</td><td align="right">${m.verzending ? bedrag(m.verzending) : "gratis"}</td></tr>
      <tr><td><strong>Totaal (incl. btw)</strong></td><td align="right"><strong>${bedrag(m.totaal)}</strong></td></tr>
    </table>`;
}

const stijl = `font-family:Poppins,Arial,sans-serif;color:#181818;line-height:1.6;max-width:560px`;

export default async (req) => {
  const body = await req.text();
  const id = new URLSearchParams(body).get("id");
  if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) return new Response("ok", { status: 200 });

  try {
    const betaling = await mollie(`/payments/${id}`);
    const m = betaling.metadata || {};
    if (betaling.status !== "paid" || m.gemaild) return new Response("ok", { status: 200 });

    await stuurMail({
      aan: m.email,
      onderwerp: `Je bestelling: ${BOEK.titel}`,
      replyTo: process.env.BESTEL_MAIL_TO,
      html: `<div style="${stijl}">
        <p>Hoi ${esc(m.naam)},</p>
        <p>Dank je wel voor je bestelling. Je betaling is binnen. We sturen je boek zo snel mogelijk op.</p>
        ${regels(m)}
        <p><strong>Verzendadres</strong><br>${adresBlok(m)}</p>
        <p>Klopt er iets niet? Beantwoord deze mail.</p>
        <p>Veel schrijfplezier,<br>Miriam Cnossen<br>Scale-up Leadership</p>
        <p style="font-size:12px;color:#5E6163">Betaalreferentie: ${esc(id)}</p>
      </div>`,
    });

    await stuurMail({
      aan: process.env.BESTEL_MAIL_TO,
      onderwerp: `Nieuwe boekbestelling: ${m.aantal}x van ${m.naam}`,
      replyTo: m.email,
      html: `<div style="${stijl}">
        <p><strong>Nieuwe bestelling, betaald.</strong></p>
        ${regels(m)}
        <p><strong>Versturen naar</strong><br>${adresBlok(m)}</p>
        <p>E-mail: ${esc(m.email)}</p>
        ${m.opmerking ? `<p>Opmerking: ${esc(m.opmerking)}</p>` : ""}
        <p style="font-size:12px;color:#5E6163">Mollie: ${esc(id)}</p>
      </div>`,
    });

    await mollie(`/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ metadata: { ...m, gemaild: true } }),
    });

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    // 500 zodat Mollie het later opnieuw probeert
    return new Response("fout", { status: 500 });
  }
};
