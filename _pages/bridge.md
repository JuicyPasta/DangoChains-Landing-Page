---
layout: page
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
  <div class="br-tiers" role="tablist" aria-label="Difficulty"></div>
  <p class="br-meta"></p>
  <p class="br-notice" role="status" hidden></p>
  <div class="br-game" hidden>
    <div class="br-board" lang="ja" aria-label="Board: four kanji around a hidden one"></div>
    <div class="br-slots" lang="ja"></div>
    <p class="br-msg" aria-live="polite"></p>
    <div class="br-tries"></div>
    <div class="br-options" lang="ja" role="group" aria-label="Pick the hidden kanji"></div>
    <ul class="br-history" lang="ja"></ul>
    <div class="br-end" hidden>
      <p class="br-end-title"></p>
      <h2 class="br-h">The four words</h2>
      <ul class="br-words"></ul>
      <p class="br-kanji"></p>
      <details class="br-near-box">
        <summary>Words the other options make</summary>
        <ul class="br-near"></ul>
      </details>
      <pre class="br-share-text"></pre>
      <p class="br-share-row"><button type="button" class="br-share">Share result</button> <span class="br-share-msg" aria-live="polite"></span></p>
      <p class="br-next"></p>
    </div>
  </div>
  <div class="br-week" hidden>
    <p class="br-week-h">Last 7 days</p>
    <div class="br-week-days"></div>
  </div>
  <p class="br-streak"></p>
  <p class="br-cross">Another daily puzzle: <a href="{{ '/play/' | relative_url }}" target="_self">play today’s DangoChains</a>, sorting 16 Japanese words into four groups.</p>
</div>
<noscript><p>熟語 Bridge needs JavaScript to run.</p></noscript>

## How to play

- Four kanji surround a hidden one. Follow the arrows: **天 → □** reads 天□, and **□ → 分** reads □分.
- Pick the kanji that makes a real, common two-kanji word (熟語) with all four. You have three tries.
- A wrong pick shows which of the four words it does make, so every miss teaches you a word.
- When the board is done you see all four words with readings and meanings. Readings stay hidden while you play.
- Three new boards every day at midnight your time: **Easy** (mostly JLPT N5–N4 words), **Normal** (up to N3) and **Hard** (up to N2). The last 7 days stay playable.

<footer class="br-credits">
  <p>This page uses the <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project">JMdict</a> and <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project">KANJIDIC2</a> dictionary files. These files are the property of the <a href="https://www.edrdg.org/">Electronic Dictionary Research and Development Group</a>, and are used in conformance with the Group’s <a href="https://www.edrdg.org/edrdg/licence.html">licence</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). We read them through <a href="https://github.com/scriptin/jmdict-simplified">jmdict-simplified</a>; “common” words are JMdict’s common entries.</p>
  <p>JLPT levels: <a href="http://www.tanos.co.uk/jlpt/">Jonathan Waller’s JLPT lists</a> (CC BY), matched to JMdict by <a href="https://github.com/stephenmk/yomitan-jlpt-vocab">yomitan-jlpt-vocab</a> (CC BY-SA 4.0); kanji levels from his kanji lists via <a href="https://github.com/davidluzgouveia/kanji-data">kanji-data</a> (MIT). The puzzle data (<a href="{{ '/bridge/data/v1/index.json' | relative_url }}">bridge/data</a>) is shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>
</footer>

<style>
#br { max-width: 560px; margin: 0 auto 8px; color: #222; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif; }
#br *, #br *::before, #br *::after { box-sizing: border-box; }
#br [lang="ja"], .br-credits [lang="ja"] { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif; }
#br button { font-family: inherit; font-weight: inherit; cursor: pointer; }
#br .br-tiers button, #br .br-share, #br .br-next button { font-size: 16px; }
#br .br-title { text-align: center; margin: 0 0 4px; padding: 0; border: 0; font-size: 2em; line-height: 1.2; }
#br .br-lede { text-align: center; color: #555; margin: 0 auto 12px; max-width: 30em; }
.br-tiers { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px; }
.br-tiers button { border: 1px solid #5A594E; background: #fff; color: #5A594E; border-radius: 999px; padding: 5px 14px; line-height: 1.3; }
.br-tiers button[aria-selected="true"] { background: #5A594E; color: #fff; }
.br-tiers .br-tick { margin-left: 4px; font-size: .85em; }
#br .br-meta { text-align: center; color: #666; font-size: .875em; margin: 0 0 8px; }
#br .br-notice { margin: 0 0 10px; padding: 8px 12px; border: 1px solid #f7c27a; background: #fff6ea; border-radius: 10px; text-align: center; font-size: .9em; }
.br-board { --t: 62px; --a: 26px; display: grid; justify-content: center; grid-template-columns: var(--t) var(--a) var(--t) var(--a) var(--t); grid-template-rows: var(--t) var(--a) var(--t) var(--a) var(--t); margin: 4px auto 10px; }
.br-tile { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: #efeee6; font-size: 34px; line-height: 1; color: #222; }
.br-center { background: #fff; border: 2px dashed #5A594E; color: #5A594E; }
.br-center.is-wrong { border-style: solid; border-color: #d9534f; background: #fdecea; color: #c9302c; }
.br-center.is-right { border-style: solid; border-color: #3f8f45; background: #e2f2df; color: #2d6a31; }
.br-center.is-lost { border-style: solid; border-color: #5A594E; background: #5A594E; color: #fff; }
.br-arrow { display: flex; align-items: center; justify-content: center; color: #8a897d; font-size: 18px; line-height: 1; }
.br-badge { position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%; font-size: 13px; line-height: 22px; text-align: center; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.br-badge.ok { background: #3f8f45; }
.br-badge.no { background: #b9b8ae; }
.br-slots { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.br-slot { display: inline-flex; align-items: center; gap: 1px; padding: 3px 8px; border-radius: 8px; border: 1px solid #dddcd2; background: #fff; font-size: 18px; line-height: 1.3; }
.br-slot .br-blank { color: #8a897d; }
.br-slot.ok { border-color: #8cc58f; background: #eef8ec; }
.br-slot.ok .br-blank { color: #2d6a31; font-weight: bold; }
.br-slot.no { border-color: #e8c3c1; background: #fbf1f0; text-decoration: line-through; text-decoration-color: #c9302c; }
.br-slot.no .br-blank { color: #c9302c; }
#br .br-msg { text-align: center; min-height: 1.5em; margin: 6px 0 2px; font-weight: 600; }
.br-tries { text-align: center; letter-spacing: 6px; color: #5A594E; font-size: 14px; margin-bottom: 6px; }
.br-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-width: 340px; margin: 8px auto 6px; }
.br-opt { min-height: 58px; padding: 2px 0; border-radius: 12px; border: 1px solid #cfcec4; background: #fff; color: #222; font-size: 28px; line-height: 1.1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.br-opt:hover:not(:disabled) { border-color: #5A594E; background: #f7f6f0; }
.br-opt:disabled { cursor: default; }
.br-opt.is-wrong { background: #fdecea; border-color: #f1b0ab; color: #b33a36; }
.br-opt.is-right { background: #3f8f45; border-color: #3f8f45; color: #fff; }
.br-opt.is-answer { border: 2px solid #3f8f45; }
.br-opt small { font-size: 11px; line-height: 1; margin-top: 2px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
#br .br-history { list-style: none; padding: 0; margin: 6px auto 0; max-width: 340px; font-size: 14px; color: #555; }
#br .br-history li { padding: 2px 0; }
.br-end { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e6e5dc; }
#br .br-end-title { text-align: center; font-size: 1.15em; font-weight: 700; margin: 0 0 6px; }
#br .br-h { font-size: 1em; margin: 12px 0 6px; padding: 0; border: 0; }
#br .br-words, #br .br-near { list-style: none; padding: 0; margin: 0; }
.br-words li { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid #f0efe8; }
.br-w { font-size: 26px; line-height: 1.2; }
.br-r { font-size: 15px; color: #5A594E; }
.br-g { font-size: 14px; color: #444; }
.br-lv { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 6px; background: #efeee6; color: #5A594E; font-size: 11px; line-height: 18px; vertical-align: 1px; }
#br .br-kanji { font-size: 14px; color: #444; margin: 8px 0 0; }
.br-kanji b { font-size: 22px; margin-right: 6px; vertical-align: -2px; }
.br-near-box { margin: 10px 0 0; font-size: 14px; }
.br-near-box summary { cursor: pointer; color: #5A594E; font-weight: 600; }
.br-near li { padding: 4px 0; border-bottom: 1px solid #f4f3ed; }
.br-near .br-nk { font-size: 18px; margin-right: 6px; }
#br .br-share-text { white-space: pre-wrap; word-break: break-all; background: #f7f6f0; border-radius: 10px; padding: 10px 12px; font-size: 13px; line-height: 1.5; margin: 14px 0 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
#br .br-share-row { text-align: center; margin: 0 0 6px; }
.br-share, .br-next button { border: 0; border-radius: 999px; padding: 9px 22px; background: #E8892E; color: #fff; font-weight: 600; }
.br-next button { background: #5A594E; }
.br-share-msg { display: inline-block; min-width: 1em; margin-left: 6px; font-size: 14px; color: #3f8f45; }
#br .br-next { text-align: center; margin: 8px 0 0; font-size: 15px; }
.br-week { margin: 18px 0 0; }
#br .br-week-h { text-align: center; font-size: 13px; color: #666; margin: 0 0 6px; }
.br-week-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; max-width: 380px; margin: 0 auto; }
.br-day { display: flex; flex-direction: column; align-items: center; padding: 4px 0; border-radius: 8px; border: 1px solid #e6e5dc; color: #444 !important; text-decoration: none !important; font-size: 11px; line-height: 1.35; }
.br-day b { font-size: 13px; }
.br-day.is-current { border-color: #5A594E; background: #5A594E; color: #fff !important; }
.br-day .br-dot { font-size: 12px; }
#br .br-streak { text-align: center; font-size: 14px; color: #555; margin: 12px 0 0; }
#br .br-cross { text-align: center; font-size: 14px; margin: 10px 0 0; }
.br-credits { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e6e5dc; font-size: 12px; line-height: 1.5; color: #666; }
.br-credits p { margin: 0 0 8px; }
@media (min-width: 600px) {
  .br-board { --t: 72px; --a: 30px; }
  .br-tile { font-size: 40px; }
  .br-opt { min-height: 64px; font-size: 32px; }
}
</style>

<script src="{{ '/assets/js/bridge.js' | relative_url }}"></script>
