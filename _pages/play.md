---
layout: game
title: Daily Japanese word puzzle
nav_title: Play
nav_order: 1
description: "A free daily word puzzle for Japanese learners: sort 16 Japanese words into 4 hidden groups. Easy, Normal and Hard boards every day, with readings and English meanings after each game. No account, no install."
include_in_header: true
include_in_footer: true
---
{% assign bridge_doc = site.pages | where: "url", "/bridge/" | first %}{% assign bridge_page = site.html_pages | where: "url", "/bridge/" | first %}{% assign v = site.time | date: '%Y%m%d%H%M' %}
<div class="dc-app" id="dc-app">
  <h1 class="dc-title" id="dc-heading">Today's DangoChains</h1>
  <p class="dc-sub" id="dc-sub">Three free daily puzzles for Japanese learners.</p>
  <p class="dc-intro" id="dc-intro">Find four groups of four. Six tries; the last two are golden. <a href="{{ '/how-to-play/' | relative_url }}">How to play</a></p>
  <div class="dc-tiers" id="dc-tiers" role="tablist" aria-label="Difficulty"><button type="button" role="tab" aria-selected="false" disabled>Easy</button><button type="button" role="tab" aria-selected="false" disabled>Normal</button><button type="button" role="tab" aria-selected="false" disabled>Hard</button></div>
  <div class="dc-notice" id="dc-notice" hidden></div>
  <div id="dc-board"><div class="dc-skeleton" aria-hidden="true">{% for i in (1..16) %}<i></i>{% endfor %}</div><noscript><p class="dc-notice">The puzzle needs JavaScript. The DangoChains app has the same puzzles: <a href="{{ site.playstore_link }}">Google Play</a> · <a href="https://apps.apple.com/app/id{{ site.ios_app_id }}">App Store</a></p></noscript></div>
  <p class="dc-note" id="dc-furi-note" hidden>Normal and Hard start with furigana off: the readings are part of the puzzle.</p>

  <section class="dc-end" id="dc-end" aria-label="Your result" tabindex="-1" hidden>
    <div class="dc-end-card">
      <p class="dc-result" id="dc-result"></p>
      <p class="dc-result-sub" id="dc-result-sub"></p>
      <pre class="dc-rows" id="dc-rows" aria-hidden="true"></pre>
      <p class="dc-streak" id="dc-streak"></p>
      <button type="button" class="dc-btn dc-btn-primary dc-share" id="dc-share">Share</button>
      <p class="dc-share-status" id="dc-share-status" aria-live="polite"></p>
      <textarea class="dc-share-fallback" id="dc-share-fallback" readonly hidden aria-label="Share text"></textarea>
      <p class="dc-next" id="dc-next"></p>
      <p class="dc-more" id="dc-more"></p>
    </div>
    <div class="dc-section">
      <h2>The words</h2>
      <div id="dc-review"></div>
    </div>
    <div class="dc-cta">
      <p id="dc-cta-text"></p>
      <p class="dc-stores" id="dc-cta-stores"></p>
    </div>
    <div class="dc-links" id="dc-links"></div>
  </section>
</div>

<script type="application/json" id="dc-config">
{
  "siteUrl": {{ site.url | append: site.baseurl | jsonify }},
  "feedBase": {{ '/feed/v1' | relative_url | jsonify }},
  "playPath": {{ '/play/' | relative_url | jsonify }},
  "makePath": {{ '/make/' | relative_url | jsonify }},
  "howToPath": {{ '/how-to-play/' | relative_url | jsonify }},
  "bridgePath": {% if bridge_doc or bridge_page %}{{ '/bridge/' | relative_url | jsonify }}{% else %}null{% endif %},
  "playStore": {{ site.playstore_link | jsonify }},
  "appStore": {{ site.ios_app_id | prepend: 'https://apps.apple.com/app/id' | jsonify }},
  "playBadge": {{ '/assets/playstore.png' | relative_url | jsonify }},
  "appBadge": {{ '/assets/appstore.png' | relative_url | jsonify }}
}
</script>
<script src="{{ '/assets/js/dango-board.js' | relative_url }}?v={{ v }}"></script>
<script src="{{ '/assets/js/dango-daily.js' | relative_url }}?v={{ v }}"></script>
