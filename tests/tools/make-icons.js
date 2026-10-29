// Builds icons.js (3.13): the Lucide icons the app uses, inlined so they work offline with no extra request.
// Usage: npm pack lucide-static@0.460.0 in an empty folder, untar it, then
//   node tools/make-icons.js <that folder>/package > ../icons.js
// To add an icon: add its Lucide name to NAMES and run this again (keep the version: the license header names it).
const fs=require('fs'), path=require('path');
const dir=process.argv[2]; if(!dir){ console.error('usage: node tools/make-icons.js <lucide-static package dir>'); process.exit(1); }
const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
const NAMES=['medal','trending-up','map-pin','flag','heart','users','gauge','sparkles','star','tag','triangle-alert','ban','info','circle-check',
  'flame','sun','snowflake','wind','droplets','cloud-rain','cloud-sun','cloud','lock','chevron-right','timer','footprints','flag-triangle-right',
  'folder-open','sun-medium','play','pause','hourglass','undo-2','circle-dot','chevron-down','trophy','award','crown','calendar-check'];
const out={};
NAMES.forEach(n=>{ const s=fs.readFileSync(path.join(dir,'icons',n+'.svg'),'utf8');
  const inner=s.replace(/<!--[\s\S]*?-->/g,'').replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>[\s\S]*$/,'');
  out[n]=inner.replace(/\s*\n\s*/g,'').replace(/\s+\/>/g,'/>').trim(); });
const lic=fs.readFileSync(path.join(dir,'LICENSE'),'utf8').trim().split('\n').map(l=>(' * '+l).trimEnd()).join('\n');
const licTxt=fs.readFileSync(path.join(dir,'LICENSE'),'utf8').trim();
process.stdout.write(`/* Mustang Splits icons (3.13): ${NAMES.length} icons from Lucide ${pkg.version} (https://lucide.dev), inlined so they work offline.
 * Built by tests/tools/make-icons.js. Each value is the inside of a 24 × 24 outline icon (stroke currentColor, width 2,
 * round caps and joins); app.js ic() wraps it in an <svg>.
 *
${lic}
 */
window.MSIconsCredit=${JSON.stringify({name:'Lucide',version:pkg.version,url:'https://lucide.dev',license:'ISC License',text:licTxt})};
window.MSIcons=${JSON.stringify(out,null,0).replace(/","/g,'",\n"').replace(/^\{/,'{\n').replace(/\}$/,'\n}')};
`);
