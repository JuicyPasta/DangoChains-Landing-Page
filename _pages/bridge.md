---
layout: game
title: 熟語 Bridge
nav_order: 4
description: "熟語 Bridge: a daily kanji puzzle for Japanese learners. Find the one kanji that completes four common words. Easy, Normal and Hard (JLPT N5–N2), with readings and meanings after every game."
include_in_header: true
include_in_footer: true
---

<div id="br" class="br" data-data="{{ '/bridge/data/v1/' | relative_url }}" data-site="{{ site.url }}{{ site.baseurl }}" data-root="{{ '/' | relative_url }}">
  <div class="br-head">
    <h1 class="br-title"><span lang="ja">熟語</span> Bridge</h1>
    <p class="br-lede">One hidden kanji makes a word with all four kanji around it. Find it in three tries.</p>
  </div>
  <div class="br-tiers" role="tablist" aria-label="Difficulty"><button type="button" role="tab" aria-selected="false" disabled>Easy</button><button type="button" role="tab" aria-selected="false" disabled>Normal</button><button type="button" role="tab" aria-selected="false" disabled>Hard</button></div>
  <p class="br-meta">&nbsp;</p>
  <p class="br-notice" role="status" hidden></p>
  <div class="br-game" hidden>
    <div class="br-board" lang="ja" aria-label="Board: four kanji around a hidden one"></div>
    <div class="br-slots" lang="ja"></div>
    <p class="br-msg" aria-live="polite"></p>
    <div class="br-tries-row"><div class="br-tries"></div></div>
    <div class="br-options" lang="ja" role="group" aria-label="Pick the hidden kanji"></div>
    <ul class="br-history" lang="ja"></ul>
    <div class="br-end" hidden>
      <div class="br-end-card">
        <p class="br-end-title"></p>
        <pre class="br-share-text"></pre>
        <p class="br-share-row"><button type="button" class="btn btn-accent br-share">Share result</button> <span class="br-share-msg" aria-live="polite"></span></p>
        <p class="br-next"></p>
      </div>
      <h2 class="br-h">The four words</h2>
      <ul class="br-words"></ul>
      <p class="br-kanji"></p>
      <details class="br-near-box">
        <summary>Words the other options make</summary>
        <ul class="br-near"></ul>
      </details>
    </div>
  </div>
  <div class="br-week" hidden>
    <p class="br-week-h">Last 7 days</p>
    <div class="br-week-days"></div>
  </div>
  <p class="br-streak"></p>
  <p class="br-cross">Another daily puzzle: <a href="{{ '/play/' | relative_url }}">play today’s DangoChains</a>, sorting 16 Japanese words into four groups.</p>
</div>
<noscript><p class="dc-notice">熟語 Bridge needs JavaScript to run.</p></noscript>

<div class="prose prose--inset game-extra" markdown="1">

## How to play

- Four kanji surround a hidden one. Follow the arrows: **天 → □** reads 天□, and **□ → 分** reads □分.
- Pick the kanji that makes a real, common two-kanji word (熟語) with all four. You have three tries.
- A wrong pick shows which of the four words it does make, so every miss teaches you a word.
- When the board is done you see all four words with readings and meanings. Readings stay hidden while you play.
- Three new boards every day at midnight your time: **Easy** (mostly JLPT N5–N4 words), **Normal** (up to N3) and **Hard** (up to N2). The last 7 days stay playable.

</div>

<footer class="br-credits">
  <p>This page uses the <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project">JMdict</a> and <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project">KANJIDIC2</a> dictionary files. These files are the property of the <a href="https://www.edrdg.org/">Electronic Dictionary Research and Development Group</a>, and are used in conformance with the Group’s <a href="https://www.edrdg.org/edrdg/licence.html">licence</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). We read them through <a href="https://github.com/scriptin/jmdict-simplified">jmdict-simplified</a>; “common” words are JMdict’s common entries.</p>
  <p>JLPT levels: <a href="http://www.tanos.co.uk/jlpt/">Jonathan Waller’s JLPT lists</a> (CC BY), matched to JMdict by <a href="https://github.com/stephenmk/yomitan-jlpt-vocab">yomitan-jlpt-vocab</a> (CC BY-SA 4.0); kanji levels from his kanji lists via <a href="https://github.com/davidluzgouveia/kanji-data">kanji-data</a> (MIT). The puzzle data (<a href="{{ '/bridge/data/v1/index.json' | relative_url }}">bridge/data</a>) is shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>
</footer>

<script src="{{ '/assets/js/bridge.js' | relative_url }}?v={{ site.time | date: '%Y%m%d%H%M' }}"></script>
