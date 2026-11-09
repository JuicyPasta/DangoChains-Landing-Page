---
layout: page
title: Play today's puzzle
nav_title: Play
nav_order: 1
description: "Today's DangoChains: 16 Japanese words, 4 hidden groups. Three free daily puzzles for Japanese learners, with furigana. No account, no install."
include_in_header: true
include_in_footer: true
---
{% assign bridge_doc = site.pages | where: "url", "/bridge/" | first %}{% assign bridge_page = site.html_pages | where: "url", "/bridge/" | first %}
<link rel="stylesheet" href="{{ '/assets/css/dango.css' | relative_url }}">

<div class="dc-app" id="dc-app">
  <h1 class="dc-title" id="dc-heading">Today's DangoChains</h1>
  <p class="dc-sub" id="dc-sub">Three free daily puzzles for Japanese learners.</p>
  <p class="dc-intro" id="dc-intro">Find four groups of four. Tap four words, then <b>Submit</b>. Six tries; the last two are golden. <a href="{{ '/how-to-play/' | relative_url }}" target="_self">How to play</a></p>
  <div class="dc-tiers" id="dc-tiers" role="tablist" aria-label="Difficulty"></div>
  <div class="dc-notice" id="dc-notice" hidden></div>
  <div id="dc-board"><noscript><p class="dc-notice">The puzzle needs JavaScript. The DangoChains app has the same puzzles: <a href="{{ site.playstore_link }}">Google Play</a> · <a href="https://apps.apple.com/app/id{{ site.ios_app_id }}">App Store</a></p></noscript></div>
  <p class="dc-note" id="dc-furi-note" hidden>Hard starts with furigana off: the readings are part of the puzzle.</p>

  <section class="dc-end" id="dc-end" hidden>
    <p class="dc-result" id="dc-result"></p>
    <p class="dc-streak" id="dc-result-sub"></p>
    <p class="dc-streak" id="dc-streak"></p>
    <button type="button" class="dc-btn dc-btn-primary dc-share" id="dc-share">Share</button>
    <p class="dc-share-status" id="dc-share-status" aria-live="polite"></p>
    <textarea class="dc-share-fallback" id="dc-share-fallback" readonly hidden aria-label="Share text"></textarea>
    <p class="dc-next" id="dc-next"></p>
    <p class="dc-more" id="dc-more"></p>
    <div class="dc-section">
      <h3>The words</h3>
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
  "appStore": {{ site.ios_app_id | prepend: 'https://apps.apple.com/app/id' | jsonify }}
}
</script>
<script src="{{ '/assets/js/dango-board.js' | relative_url }}"></script>
<script src="{{ '/assets/js/dango-daily.js' | relative_url }}"></script>
