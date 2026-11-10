---
layout: page
title: How to Play
description: "How to play DangoChains: sort 16 Japanese words into four hidden groups of four. The rules, the four colors, furigana, and a worked example."
include_in_header: true
include_in_footer: true
nav_order: 3
---
{% assign app_store = 'https://apps.apple.com/app/id' | append: site.ios_app_id %}

# How to play DangoChains

<p class="lede">DangoChains is a daily word-grouping puzzle for people learning Japanese, in the spirit of Connections. Each board has <strong>16 Japanese words</strong>. Your job is to find the <strong>four hidden groups of four</strong> words that belong together.</p>

<p><a class="btn btn-accent" href="{{ '/play/' | relative_url }}">Play today's puzzle</a></p>

## The rules

<ol class="steps">
  <li><strong>Tap four words, then press Submit.</strong> If all four belong to the same group, the group is revealed with its Japanese name and English meaning.</li>
  <li><strong>“One away”</strong> means three of your four words belong together.</li>
  <li><strong>You have six tries.</strong> The last two are golden: finish with a golden try to spare and you earn a <strong>Golden Dango</strong>. Run out of tries and the board is lost.</li>
  <li><strong>Furigana</strong> (readings above the kanji) are on for Easy. Normal and Hard start with them off, because there the readings are often part of the puzzle. Switch them on or off under the board whenever you like.</li>
</ol>

## Group colors, easiest to trickiest

<ul class="legend">
  <li class="dc-easy">Pink<small>Easy</small></li>
  <li class="dc-medium">Orange<small>Medium</small></li>
  <li class="dc-hard">Green<small>Hard</small></li>
  <li class="dc-expert">Gray<small>Expert</small></li>
</ul>

Every color also carries one to four dots, so you never have to tell the colors apart by eye.

## An example

<div class="example">{% include demo-board.html plain=true %}</div>

On this board two groups are already solved: <strong lang="ja">上に着るもの</strong> (things you wear on top: <span lang="ja">シャツ, セーター, コート, ジャケット</span>) and <strong lang="ja">下に履くもの</strong> (things you wear on the bottom: <span lang="ja">ズボン, スカート, パンツ, ジーンズ</span>). Eight words are left: <span lang="ja">ヘルメット, 靴下 (くつした), 帽子 (ぼうし), サンダル, ブーツ, 靴 (くつ), キャップ</span> and <span lang="ja">ハット</span>. Can you split them into the last two groups? (Hint: think head and feet.)

## Three puzzles every day

<ul class="tiers-list">
  <li><strong>Easy</strong><br>Everyday vocabulary and kana-friendly groups.</li>
  <li><strong>Normal</strong><br>The classic challenge, roughly JLPT N4–N3.</li>
  <li><strong>Hard</strong><br>Idioms, kanji compounds and cultural references, N2 and up.</li>
</ul>

A new set arrives at local midnight. After each game you can review all four groups with readings and English meanings, and share an emoji grid of your guesses with no spoilers.

[Play today's three in your browser]({{ '/play/' | relative_url }}): no install, and the last 7 days are free there too. Teaching a class? [Make your own board]({{ '/make/' | relative_url }}) from 16 words and share it as one link.

## Get the app

DangoChains is free on the App Store and Google Play. No account, no ads and no tracking in the app. Past puzzles live in the archive, a one-time unlock with no subscription.

<p class="stores">
  <a class="appStoreLink" href="{{ app_store }}" target="_blank" rel="noopener"><img src="{{ '/assets/appstore.png' | relative_url }}" width="440" height="150" alt="Download on the App Store" loading="lazy"></a>
  <a class="playStoreLink" href="{{ site.playstore_link }}" target="_blank" rel="noopener"><img src="{{ '/assets/playstore.png' | relative_url }}" width="510" height="150" alt="Get it on Google Play" loading="lazy"></a>
</p>
