---
titel: Bedankt voor je bestelling
omschrijving: ''
permalink: /het-boek/bedankt/
label: Je bestelling
kop: Even checken
kop_accent: ''
intro: ''
afbeelding: ''
knop: ''
knop_url: ''
scanblok: false
---

<p class="lead" id="bb-tekst">We kijken of je betaling binnen is.</p>

<p><a class="pill-btn" id="bb-knop" href="/">Naar de homepage <span class="arrow">&rarr;</span></a></p>

{% raw %}
<script>
/* Haalt bij Mollie op of de betaling gelukt is en past de tekst daarop aan.
   Het id staat in het adres, dat zet de bestelfunctie erin. */
(function(){
  var id = new URLSearchParams(location.search).get('id');
  var kop = document.querySelector('.page-hero h1');
  var label = document.querySelector('.page-hero .label');
  var tekst = document.getElementById('bb-tekst');
  var knop = document.getElementById('bb-knop');

  function zet(l, k, t, knopTekst, knopLink){
    if (label) label.textContent = l;
    if (kop) kop.textContent = k;
    tekst.textContent = t;
    knop.firstChild.nodeValue = knopTekst + ' ';
    knop.href = knopLink;
  }

  var pogingen = 0;
  function check(){
    if (!id) {
      return zet('Je bestelling', 'Bedankt!',
        'Is je betaling gelukt? Dan krijg je binnen een paar minuten een bevestiging per mail.',
        'Naar de homepage', '/');
    }
    fetch('/.netlify/functions/betaalstatus?id=' + encodeURIComponent(id))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d.status === 'paid' || d.status === 'authorized') {
          zet('Betaling gelukt', 'Bedankt voor je bestelling!',
            'Je krijgt een bevestiging per mail. We sturen je boek zo snel mogelijk op.',
            'Doe ook de scan', '/scan');
        } else if (d.status === 'open' || d.status === 'pending') {
          if (++pogingen < 6) return setTimeout(check, 2500);
          zet('Bijna klaar', 'Je betaling wordt nog verwerkt',
            'Zodra hij binnen is krijg je een mail. Je hoeft niets te doen.',
            'Naar de homepage', '/');
        } else {
          zet('Niet betaald', 'Je betaling is niet gelukt',
            'Er is niets afgeschreven. Probeer het gerust opnieuw.',
            'Opnieuw bestellen', '/het-boek/#bestellen');
        }
      })
      .catch(function(){
        zet('Je bestelling', 'Bedankt!',
          'Is je betaling gelukt? Dan krijg je binnen een paar minuten een bevestiging per mail.',
          'Naar de homepage', '/');
      });
  }
  check();
})();
</script>
{% endraw %}
