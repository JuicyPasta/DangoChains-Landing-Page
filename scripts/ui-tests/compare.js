// node compare.js <before.json> <after.json>  -> strict differences (must be none) and ui differences (to review)
const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
function diff(x, y, path, out) {
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  if (x && y && typeof x === 'object' && typeof y === 'object' && Array.isArray(x) === Array.isArray(y)) {
    const keys = Array.from(new Set(Object.keys(x).concat(Object.keys(y))));
    keys.forEach(function (k) { diff(x[k], y[k], path + '.' + k, out); });
    return;
  }
  out.push({ path: path, before: x, after: y });
}
let strict = 0, ui = 0, strictValues = 0;
const ids = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
const uiSeen = {};
ids.forEach(function (id) {
  if (!a[id] || !b[id]) { console.log('MISSING ' + id + ' in ' + (a[id] ? 'after' : 'before')); strict++; return; }
  const s = []; diff(a[id].strict, b[id].strict, 'strict', s);
  strictValues += JSON.stringify(a[id].strict).length;
  s.forEach(function (d) { strict++; console.log('STRICT DIFF  ' + id + '  ' + d.path + '\n   before: ' + JSON.stringify(d.before) + '\n   after:  ' + JSON.stringify(d.after)); });
  const u = []; diff(a[id].ui, b[id].ui, 'ui', u);
  u.forEach(function (d) {
    ui++;
    const key = d.path.replace(/\.\d+/g, '.N') + ' :: ' + JSON.stringify(d.before) + ' -> ' + JSON.stringify(d.after);
    (uiSeen[key] = uiSeen[key] || []).push(id);
  });
});
console.log('\n' + ids.length + ' tests compared; ' + strictValues + ' characters of strict data; STRICT differences: ' + strict + '; ui differences: ' + ui);
if (process.argv[4] === '--ui') Object.keys(uiSeen).forEach(function (k) { console.log('  ui (' + uiSeen[k].length + 'x, e.g. ' + uiSeen[k][0] + ')  ' + k.slice(0, 420)); });
process.exit(strict ? 1 : 0);
