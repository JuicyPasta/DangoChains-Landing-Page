---
layout: game
title: Make your own board
nav_title: Make
nav_order: 2
description: "Make your own DangoChains board: 16 Japanese words in 4 groups, readings filled in for you, shared as one link. Made for classes and study groups."
include_in_header: true
include_in_footer: true
---
{% assign v = site.time | date: '%Y%m%d%H%M' %}
<div class="dc-app" id="dc-make">
  <h1 class="dc-title">Make your own board</h1>
  <p class="dc-intro">Made for classes and study groups: type 16 words in four groups, the readings fill in for you, and you get one link anyone can play.</p>

  <form class="dc-form" id="dc-form" novalidate autocomplete="off">
    <div class="dc-field">
      <label for="dc-title">Title <span class="dc-small">(optional)</span></label>
      <input type="text" id="dc-title" maxlength="80" placeholder="e.g. Unit 5: food">
    </div>
    <p class="dc-small">Put the easiest group first. Groups are colored in order, pink to gray, as in the daily. Readings and meanings show after the game; furigana show during it.</p>
    {% assign colors = "pink (easiest),orange,green,gray (trickiest)" | split: "," %}{% assign levels = "easy,medium,hard,expert" | split: "," %}
    {% for level in levels %}{% assign g = forloop.index0 %}
    <fieldset class="dc-make-group dc-{{ level }}">
      <legend>Group {{ forloop.index }} · {{ colors[g] }}</legend>
      <label for="dc-g{{ g }}-name">Group name</label>
      <input type="text" class="dc-in-name" id="dc-g{{ g }}-name" maxlength="60" placeholder="What the four words share">
      <div class="dc-make-head" aria-hidden="true"><span>Word</span><span>Reading</span><span>Meaning (optional)</span></div>
      <div class="dc-make-words">
        {% for w in (1..4) %}
        <div class="dc-make-word">
          <input type="text" class="dc-in-word" lang="ja" maxlength="24" placeholder="Word {{ w }}" aria-label="Group {{ g | plus: 1 }}, word {{ w }}">
          <input type="text" class="dc-in-reading" lang="ja" maxlength="48" placeholder="Reading" aria-label="Group {{ g | plus: 1 }}, word {{ w }}: reading in kana">
          <input type="text" class="dc-in-gloss" maxlength="80" placeholder="Meaning (optional)" aria-label="Group {{ g | plus: 1 }}, word {{ w }}: meaning in English">
        </div>
        {% endfor %}
      </div>
    </fieldset>
    {% endfor %}
    <div class="dc-errors" id="dc-errors" role="alert" hidden></div>
    <div class="dc-make-actions">
      <button type="submit" class="dc-btn dc-btn-primary">Create link</button>
      <button type="button" class="dc-btn" id="dc-example">Fill in an example</button>
      <button type="button" class="dc-btn btn-quiet" id="dc-reset">Clear</button>
    </div>
  </form>

  <div class="dc-result-box" id="dc-result-box" hidden>
    <label for="dc-link"><b>Your board's link</b></label>
    <input type="text" id="dc-link" readonly>
    <div class="dc-make-actions">
      <button type="button" class="dc-btn dc-btn-primary" id="dc-copy">Copy link</button>
      <a class="dc-btn" id="dc-open" href="#" target="_blank" rel="noopener">Play it</a>
      <button type="button" class="dc-btn" id="dc-share-link" hidden>Share…</button>
    </div>
    <p class="dc-share-status" id="dc-copy-status" aria-live="polite"></p>
    <p class="dc-small">Anyone with the link can play. The whole board lives in the link: nothing is uploaded or stored. To change it, edit the form and create a new link.</p>
    <p class="dc-small" id="dc-long" hidden>This link is long because of all the readings and meanings. Browsers and most chat apps handle it fine; if one cuts it off, shorten the meanings.</p>
  </div>

  <p class="dc-small dc-make-foot">Readings come from the word list behind the daily puzzles, then from <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noopener">JMdict</a>'s common words, which also suggest English meanings (© EDRDG, <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">CC BY-SA 4.0</a>). Check them, since some words have more than one reading or meaning, and type your own for any word it doesn't know. Want a ready-made puzzle? <a href="{{ '/play/' | relative_url }}">Play today's DangoChains</a>.</p>
</div>

<script type="application/json" id="dc-config">
{
  "siteUrl": {{ site.url | append: site.baseurl | jsonify }},
  "playPath": {{ '/play/' | relative_url | jsonify }},
  "readingsUrl": {{ '/assets/data/readings.json' | relative_url | jsonify }},
  "fallbackReadingsUrl": {{ '/assets/data/readings-jmdict.json' | relative_url | jsonify }},
  "glossesUrl": {{ '/assets/data/glosses-jmdict.json' | relative_url | jsonify }}
}
</script>
<script src="{{ '/assets/js/dango-board.js' | relative_url }}?v={{ v }}"></script>
<script src="{{ '/assets/js/dango-make.js' | relative_url }}?v={{ v }}"></script>
