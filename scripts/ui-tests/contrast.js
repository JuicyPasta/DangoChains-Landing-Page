// WCAG contrast check for the design tokens (text on its backgrounds), light and dark.
function lum(hex) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const T = {
  light: { bg: '#FBF7EF', surface: '#FFFFFF', surface2: '#F4EFE4', tile: '#ECE6D8', tileHover: '#E2DBCA', ink: '#25241F', ink2: '#4E4D43', muted: '#6A685C', line: '#E2DBCC', lineStrong: '#B9B19E',
    primary: '#5A594E', onPrimary: '#FFFDF8', accent: '#FFAD5C', onAccent: '#25241F', link: '#A3470A', good: '#256B3B', bad: '#AD3B12', gold: '#F2C230', focus: '#1F5FD1',
    g1: '#FF9FB2', g2: '#FFAD5C', g3: '#B6CF6A', g4: '#C8C8C8', onG: '#25241F', g1s: '#FFE5EA', g2s: '#FFEBD6', g3s: '#EAF2D3', g4s: '#EEEDEA' },
  dark: { bg: '#1B1A17', surface: '#25241F', surface2: '#2D2C26', tile: '#35342D', tileHover: '#403F37', ink: '#F4F0E6', ink2: '#D2CEC1', muted: '#A9A698', line: '#3A3932', lineStrong: '#6B695E',
    primary: '#EFEADC', onPrimary: '#25241F', accent: '#FFAD5C', onAccent: '#25241F', link: '#FFB870', good: '#8FD6A0', bad: '#FF9E80', gold: '#F2C230', focus: '#8DB8FF',
    g1: '#F892A7', g2: '#F7A654', g3: '#ACC662', g4: '#BFBFBA', onG: '#1B1A17', g1s: '#4B2E35', g2s: '#4A3622', g3s: '#36401F', g4s: '#3A3A36' }
};
const pairs = [
  ['ink', 'bg', 4.5], ['ink', 'surface', 4.5], ['ink', 'tile', 4.5], ['ink', 'tileHover', 4.5], ['ink', 'surface2', 4.5],
  ['ink2', 'bg', 4.5], ['ink2', 'surface', 4.5], ['ink2', 'surface2', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'surface', 4.5], ['muted', 'surface2', 4.5], ['muted', 'tile', 4.5],
  ['onPrimary', 'primary', 4.5], ['onAccent', 'accent', 4.5],
  ['link', 'bg', 4.5], ['link', 'surface', 4.5], ['link', 'surface2', 4.5],
  ['good', 'bg', 4.5], ['good', 'surface', 4.5], ['bad', 'bg', 4.5], ['bad', 'surface', 4.5], ['bad', 'surface2', 4.5],
  ['onG', 'g1', 4.5], ['onG', 'g2', 4.5], ['onG', 'g3', 4.5], ['onG', 'g4', 4.5],
  ['ink', 'g1s', 4.5], ['ink', 'g2s', 4.5], ['ink', 'g3s', 4.5], ['ink', 'g4s', 4.5],
  ['muted', 'g1s', 4.5], ['muted', 'g2s', 4.5], ['muted', 'g3s', 4.5], ['muted', 'g4s', 4.5],
  ['focus', 'bg', 3], ['focus', 'surface', 3], ['focus', 'tile', 3], ['focus', 'primary', 3],
  ['lineStrong', 'bg', 3], ['lineStrong', 'surface', 3], ['primary', 'bg', 3], ['primary', 'tile', 3], ['gold', 'bg', 1], ['accent', 'bg', 1]
];
for (const theme of ['light', 'dark']) {
  console.log('== ' + theme);
  for (const [fg, bg, min] of pairs) {
    const r = ratio(T[theme][fg], T[theme][bg]);
    console.log((r >= min ? '  ok ' : '  LOW') + ' ' + (fg + ' on ' + bg).padEnd(24) + r.toFixed(2) + (r < min ? '  (needs ' + min + ')' : ''));
  }
}
