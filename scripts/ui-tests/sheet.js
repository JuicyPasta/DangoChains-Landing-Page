// Builds the side-by-side contact sheet: node sheet.js <designDir> [--img-ext=png] [--out=index.html]
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const arg = function (n, d) { const a = process.argv.find(function (x) { return x.indexOf('--' + n + '=') === 0; }); return a ? a.split('=')[1] : d; };
const ext = arg('img-ext', 'png'), outName = arg('out', 'index.html');
const before = JSON.parse(fs.readFileSync(path.join(dir, 'before', 'report.json'), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.join(dir, 'after', 'report.json'), 'utf8'));
const facts = fs.existsSync(path.join(dir, 'facts.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'facts.json'), 'utf8')) : null;
const NOTES = {
  '01-home': ['Home', 'Leads with "Play today\'s puzzle" and a live-looking board; then the three games, the study pages, the app (badges + screenshot) and the feature list. The template hero, device frame, jQuery and Font Awesome are gone.'],
  '02-play-start': ['Daily: start', 'Shared header with the game switcher; tabs as a segmented control; tiles sized by the engine so every word fits on legal line breaks; tries as dango on a skewer.'],
  '03-play-mid': ['Daily: mid-game', 'One group solved (colour plus pips as a second cue), two tiles selected.'],
  '04-play-one-away': ['Daily: "One away…"', 'The one-away moment gets its own pill beside the tries; the four tiles shake and the lost try pops.'],
  '05-play-won': ['Daily: won', 'Result card: outcome, the guess grid that will be shared, streak, Share, countdown, next boards; then the word review, store badges and cross-links.'],
  '06-play-lost': ['Daily: out of tries (Hard)', 'A loss reveals the remaining groups one at a time, then the same result card.'],
  '07-play-normal-nofurigana': ['Daily: Normal (furigana off by default)', 'Same defaults as before: Easy shows furigana, Normal and Hard start without.'],
  '08-play-archive-notice': ['Daily: a day older than 7 days', 'The archive notice, with real store badges.'],
  '09-play-custom': ['A custom board from a link', 'Boards made with the maker use the same board.'],
  '10-make': ['Make your own', 'The form on the shared system: one fieldset per group in its level tint, with pips.'],
  '11-make-filled': ['Make your own: example filled in, link created', 'Auto-filled readings and meanings are tinted; the link card has Copy / Play / Share.'],
  '12-bridge-start': ['熟語 Bridge: start', 'Same tabs, tiles, tries and type as the daily.'],
  '13-bridge-mid': ['熟語 Bridge: after a wrong pick', 'The centre tile, the slot chips and the picked option all show what the pick made.'],
  '14-bridge-won': ['熟語 Bridge: solved', 'Result card with the share text first, then the four words.'],
  '15-bridge-lost': ['熟語 Bridge: out of tries (Hard)', ''],
  '16-how-to-play': ['How to Play', 'Numbered rules, a colour legend with the pips, and a real example board instead of a reference to a screenshot.'],
  '17-changelog': ['What\'s New', 'Same words, as release cards.'],
  '18-privacy': ['Privacy Policy', 'Adds one accurate paragraph about Google Fonts; everything else unchanged.'],
  '19-terms': ['Terms of Service', ''],
  '20-study-hub': ['Past puzzles (study hub)', 'Generated pages are restyled from the stylesheet only; the generator and its files are untouched.'],
  '21-study-day': ['A study day page (first answers open)', 'Word chips, a real button to play the board, a spoiler gate, and stacked rows on phones.'],
  '22-study-topics': ['Vocabulary by topic', ''],
  '23-study-topic': ['A topic page', '']
};
const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
const states = Array.from(new Set(after.map(function (r) { return r.state; }))).sort();
function img(side, state, vp, scheme) {
  const f = side + '/' + state + '--' + vp + '-' + scheme + '.' + ext;
  return fs.existsSync(path.join(dir, f)) ? '<a href="' + f + '" target="_blank"><img loading="lazy" src="' + f + '" alt="' + esc(side + ': ' + state + ' ' + vp + ' ' + scheme) + '"></a>' : '<p class="none">not captured</p>';
}
let sections = '';
states.forEach(function (st) {
  const note = NOTES[st] || [st, ''];
  sections += '<section id="' + st + '"><h2>' + esc(note[0]) + '</h2>' + (note[1] ? '<p class="note">' + esc(note[1]) + '</p>' : '');
  ['mobile', 'desktop'].forEach(function (vp) {
    ['light', 'dark'].forEach(function (scheme) {
      sections += '<div class="pair ' + vp + ' ' + scheme + '"><figure><figcaption>Before</figcaption><div class="frame">' + img('before', st, vp, scheme) + '</div></figure>' +
        '<figure><figcaption>After</figcaption><div class="frame">' + img('after', st, vp, scheme) + '</div></figure></div>';
    });
  });
  sections += '</section>';
});
const toc = states.map(function (st) { return '<a href="#' + st + '">' + esc((NOTES[st] || [st])[0]) + '</a>'; }).join('');
const factsHtml = facts ? '<div class="facts">' + facts.map(function (f) { return '<div><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div>' : '';
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">' +
'<title>dangochains.com redesign: before and after</title><style>' +
':root{--bg:#f6f3ec;--card:#fff;--ink:#25241f;--muted:#6a685c;--line:#e2dbcc;--accent:#ffad5c}@media(prefers-color-scheme:dark){:root{--bg:#1b1a17;--card:#25241f;--ink:#f4f0e6;--muted:#a9a698;--line:#3a3932}}' +
'*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
'header.top{max-width:1500px;margin:0 auto;padding:28px 20px 8px}h1{font-size:28px;margin:0 0 6px;letter-spacing:-.01em}header.top p{margin:0 0 10px;color:var(--muted);max-width:60rem}' +
'.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:16px 0 6px}.facts div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.facts b{display:block;font-size:20px}.facts span{color:var(--muted);font-size:13.5px}' +
'.bar{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}.bar div{max-width:1500px;margin:0 auto;padding:10px 20px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}' +
'.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:var(--card)}.seg button{border:0;background:none;color:var(--ink);font:inherit;font-weight:600;padding:7px 16px;cursor:pointer}.seg button[aria-pressed=true]{background:var(--ink);color:var(--bg)}' +
'.toc{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:13.5px}.toc a{color:var(--muted)}' +
'main{max-width:1500px;margin:0 auto;padding:0 20px 80px}section{padding:34px 0 10px;border-bottom:1px solid var(--line)}h2{margin:0 0 4px;font-size:21px}.note{margin:0 0 14px;color:var(--muted);max-width:62rem}' +
'.pair{display:none;grid-template-columns:1fr 1fr;gap:18px;align-items:start}figure{margin:0}figcaption{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}' +
'.frame{max-height:82vh;overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}.frame img{display:block;width:100%;height:auto}.pair.mobile{max-width:860px}.none{padding:30px;color:var(--muted)}' +
'body[data-vp=mobile][data-scheme=light] .pair.mobile.light,body[data-vp=mobile][data-scheme=dark] .pair.mobile.dark,body[data-vp=desktop][data-scheme=light] .pair.desktop.light,body[data-vp=desktop][data-scheme=dark] .pair.desktop.dark{display:grid}' +
'@media(max-width:700px){.pair{gap:8px}h1{font-size:23px}}' +
'</style></head><body data-vp="mobile" data-scheme="light">' +
'<header class="top"><h1>dangochains.com redesign: before and after</h1><p>Every page and game state at 390 × 844 and 1280 × 800, in light and dark, captured with the clock pinned to 2026-11-10 so both sides show the same boards. "Before" is main at b096914; it had no dark mode, so its dark shots match its light ones. Tall pages scroll inside their frame; click an image to open it full size.</p>' + factsHtml + '</header>' +
'<div class="bar"><div><span class="seg" data-k="vp"><button aria-pressed="true" data-v="mobile">Phone 390</button><button aria-pressed="false" data-v="desktop">Desktop 1280</button></span>' +
'<span class="seg" data-k="scheme"><button aria-pressed="true" data-v="light">Light</button><button aria-pressed="false" data-v="dark">Dark</button></span><nav class="toc">' + toc + '</nav></div></div>' +
'<main>' + sections + '</main>' +
'<script>document.querySelectorAll(".seg").forEach(function(seg){seg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;seg.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});document.body.setAttribute("data-"+seg.dataset.k,b.dataset.v)})})</script></body></html>';
fs.writeFileSync(path.join(dir, outName), html);
fs.writeFileSync(path.join(dir, 'notes.json'), JSON.stringify(NOTES, null, 1));
console.log('wrote ' + path.join(dir, outName) + ' (' + states.length + ' states, ' + html.length + ' bytes)');
