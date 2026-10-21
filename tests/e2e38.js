// 3.10: Data sections (Meets, Team, Runners, Highlights; remembered; a "new" dot on Highlights), the Team tab sort fix
// (every sort option, real-looking times incl. under 10:00 and over 20:00, ties alphabetical, no times last, Girls and
// Boys apart, the sorted value is the value shown), raw by default with one app-wide Raw / Adjusted switch (shared by
// Team and Data, remembered, ⓘ sentence, always labeled), a runner's profile from the Team tab with Edit in the nav bar,
// and the Training tab's team training paces (groups, fastest first, units remembered, pinned names, m:ss never cut
// off, "Needs a race" last, tap = profile, Share as PNG or PDF). Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), FS=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/';
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const sec=t=>{ if(!t||t==='–') return null; const m=t.match(/^(\d+):(\d\d(?:\.\d)?)$/); return m?+m[1]*60+ +m[2]:NaN; };

// --- the sort seed: typed 5K results this season (2026), times under 10:00 and over 20:00, ties, runners without a 5K
const R5={ // id: [name, gender, [5K times in s], other-distance results]
  g1:['Ada Birch','G',[598]], g2:['Bea Cole','G',[1200,1201]], g3:['Cara Dunn','G',[1199.9]], g4:['Dee Ellis','G',[1530,1470]],
  g5:['Eva Ford','G',[1140,1260]], g6:['Fay Gale','G',[1200]], g7:['Gia Hart','G',[]], g8:['Hana Ives','G',[],[[3200,660]]],
  b1:['Abe Jones','B',[965]], b2:['Bo King','B',[599.5]], b3:['Cy Lowe','B',[1862.4]], b4:['Don Moss','B',[1139.9,1140.1]],
  b5:['Ed Nunn','B',[1140]], b6:['Finn Ott','B',[]], b7:['aaron Pike','B',[1300]]};
const roster=Object.entries(R5).map(([id,[name,gender]])=>({id,name,group:'',gender}));
const prs={}; Object.entries(R5).forEach(([id,[,,ts,oth]])=>{ prs[id]=[...ts.map((t,i)=>({id:id+'r'+i,dist:5000,t,date:`2026-09-${String(5+i*7).padStart(2,'0')}`,meet:'Typed',src:'hand'})),
  ...(oth||[]).map(([d,t],i)=>({id:id+'o'+i,dist:d,t,date:'2026-09-20',meet:'Typed',src:'hand'}))]; });
const seed1=Object.assign(T.seed(),{roster,prs});
// expected order, worked out here (not by the app): rounded to the tenth shown, fastest first, then name; no 5K last
const nameCmp=(a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'});
function expect(g,k){ const L=Object.entries(R5).filter(([,v])=>v[1]===g).map(([id,[name,,ts]])=>({id,name,avg:ts.length?ts.reduce((a,b)=>a+b,0)/ts.length:null,sb:ts.length?Math.min(...ts):null}));
  if(k==='name') return L.sort((a,b)=>nameCmp(a.name,b.name)).map(x=>x.name);
  const v=x=>x[k]==null?null:Math.round(x[k]*10);
  return L.sort((a,b)=>(v(a)==null)-(v(b)==null)||(v(a)!=null&&v(a)-v(b))||nameCmp(a.name,b.name)).map(x=>x.name); }

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
let P=await T.open(b,{seed:seed1,url:URL,now:'2026-10-05T16:00:00'}); let ev=(f,...a)=>P.evaluate(f,...a);
const tab=t=>ev(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t).then(()=>W(500));
const teamRows=()=>ev(()=>Object.fromEntries(['G','B'].map(g=>[g,[...document.querySelectorAll(`.team-sec[data-sec="${g}"] .ath`)].map(r=>({name:r.querySelector('.ath-nm').textContent,avg:r.querySelector('.ath-avg').textContent,sb:r.querySelector('.ath-sb').textContent}))])));

console.log('1. Team tab sorting (the 3.9 bug): every option, Girls and Boys apart');
await tab('team');
ok('raw is the default (fresh phone): Raw pressed, labeled', await ev(()=>document.querySelector('#teamTools [data-rvchart=raw]').getAttribute('aria-pressed')==='true'&&/Showing Raw times/.test(document.querySelector('#teamTools .time-kind').textContent)));
for(const k of ['avg','sb','name']){
  await ev(k=>document.querySelector(`#teamTools [data-rsort=${k}]`).click(),k); await W(300);
  const R=await teamRows();
  for(const g of ['G','B']){
    const got=R[g].map(x=>x.name), exp=expect(g,k);
    ok(`${k==='avg'?'Average':k==='sb'?'Season best':'Name'}: ${g==='G'?'Girls':'Boys'} in the expected order`, JSON.stringify(got)===JSON.stringify(exp), got.join(', ')+' | expected '+exp.join(', '));
    if(k!=='name'){ const col=R[g].map(x=>sec(x[k])), t=col.filter(v=>v!=null);
      const fn=col.findIndex(v=>v==null);
      ok(`  the ${k==='avg'?'Avg':'SB'} column shown is fastest first, no-time runners last`, t.every((v,i)=>!i||v>=t[i-1])&&(fn<0||col.slice(fn).every(v=>v==null)), R[g].map(x=>x[k]).join(' ')); }
  }
}
await ev(()=>document.querySelector('#teamTools [data-rsort=avg]').click()); await W(300);
let R=await teamRows();
ok('a time under 10:00 sorts before 20:00+ (numbers, not text): Ada Birch 9:58.0 first, Bo King 9:59.5 first', R.G[0].name==='Ada Birch'&&R.G[0].avg==='9:58.0'&&R.B[0].name==='Bo King', R.G[0].name+' '+R.G[0].avg);
ok('ties at the tenth shown go alphabetically (Eva Ford, Fay Gale: 20:00.0 average; Don Moss, Ed Nunn: 19:00.0)', R.G.findIndex(x=>x.name==='Eva Ford')+1===R.G.findIndex(x=>x.name==='Fay Gale')&&R.B.findIndex(x=>x.name==='Don Moss')+1===R.B.findIndex(x=>x.name==='Ed Nunn'), R.G.map(x=>x.name+' '+x.avg).join(', '));
ok('runners with no 5K are last, alphabetical (Gia Hart, Hana Ives; a 3200m only doesn’t count)', JSON.stringify(R.G.slice(-2).map(x=>x.name))==='["Gia Hart","Hana Ives"]'&&R.G.slice(-2).every(x=>x.avg==='–'&&x.sb==='–'));
ok('both columns show: Avg 5K and SB 5K, each labeled Raw', await ev(()=>{ const h=document.querySelector('.team-sec .ath-head').textContent; return /Avg 5K\s*Raw/.test(h)&&/SB 5K\s*Raw/.test(h); }));
ok('the sorted column is marked (header and cells)', await ev(()=>!!document.querySelector('.team-sec .ath-head span.on')&&document.querySelectorAll('.team-sec .ath-avg.on').length>3));
ok('no "adj" abbreviation anywhere on the Team tab', !(await ev(()=>/\badj\b/i.test(document.querySelector('#v-team').textContent))));
ok('Adjusted is off with a reason when there are no race-day ratings', await ev(()=>{ const a=document.querySelector('#teamTools [data-rvchart=adj]'); return a.disabled&&!!a.dataset.why; }));
await ev(()=>document.querySelector('#teamTools [data-adjinfo]').click()); await W(200);
ok('ⓘ shows the one-sentence explanation', await ev(()=>{ const p=document.querySelector('#teamTools .adj-info'); return !p.hidden&&p.textContent.startsWith('Adjusted times remove how hard each course and day was, so you can compare across meets.'); }));
ok('the sort (Average) is remembered after a reload', await (async()=>{ await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(500); await tab('team'); return ev(()=>document.querySelector('#teamTools [data-rsort=avg]').getAttribute('aria-pressed')==='true'); })());

console.log('2. Runner profile from the Team tab');
await ev(()=>{ [...document.querySelectorAll('#teamList .ath')].find(r=>r.dataset.id==='g3').querySelector('.ath-row').click(); }); await W(500);
let pr=await ev(()=>({vis:!document.querySelector('#teamProf').hidden,list:getComputedStyle(document.querySelector('#teamList')).display,name:(document.querySelector('#teamProf .rv-name')||{}).textContent,back:document.querySelector('#navLeft').textContent,edit:!document.querySelector('#profEdit').hidden,add:!document.querySelector('#addAth').offsetParent,txt:document.querySelector('#teamProf').innerText}));
ok('tapping a runner opens their profile in the Team tab (the list steps aside)', pr.vis&&pr.list==='none'&&/Cara Dunn/.test(pr.name), JSON.stringify({vis:pr.vis,list:pr.list,name:pr.name}));
ok('the same runner page as in Data: PR and season best, season chart, races, suggested training paces', ['PR and season best','Season chart','This season','Suggested training paces'].every(s=>pr.txt.includes(s)));
ok('nav bar: ‹ Team on the left, Edit on the right (the tab’s + steps aside)', /‹ Team/.test(pr.back)&&pr.edit&&pr.add, JSON.stringify({back:pr.back,edit:pr.edit}));
await ev(()=>document.querySelector('#profEdit').click()); await W(400);
ok('Edit opens the runner sheet with the name and Girls/Boys', await ev(()=>!!document.querySelector('#modal .res-sheet [data-af=name]')&&!!document.querySelector('#modal .res-sheet [data-rg=G]')));
await P.$eval('#modal [data-af=name]',i=>{ i.value='Cara Dunn-West'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(500);
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(500);
ok('a name edit shows on the profile', await ev(()=>/Cara Dunn-West/.test(document.querySelector('#teamProf .rv-name').textContent)));
await ev(()=>document.querySelector('[data-profback]').click()); await W(400);
ok('‹ Team goes back to the list', await ev(()=>document.querySelector('#teamProf').hidden&&getComputedStyle(document.querySelector('#teamList')).display!=='none'&&!document.querySelector('[data-profback]')));
await P.close();

console.log('3. Raw vs Adjusted with race-day ratings (planted season), Data sections, Highlights');
P=await T.open(b,{seed:FS.seed,url:URL,now:'2026-10-05T16:00:00'}); ev=(f,...a)=>P.evaluate(f,...a);
await tab('results');
const seg=await ev(()=>[...document.querySelectorAll('.rv-switch [data-rv]')].map(x=>x.textContent.trim()));
ok('Data sections: Meets, Team, Runners, Highlights', JSON.stringify(seg)==='["Meets","Team","Runners","Highlights"]', seg.join());
ok('nothing above the sections (the celebrations moved into Highlights)', await ev(()=>document.querySelector('#v-results').firstElementChild.classList.contains('rv-switch')));
ok('a dot on Highlights: a meet with new highlights', await ev(()=>document.querySelector('#rvHighBtn').classList.contains('has-dot')&&/new/i.test(document.querySelector('#rvHighBtn').getAttribute('aria-label'))));
await ev(()=>document.querySelector('[data-rv=high]').click()); await W(600);
const hi=await ev(()=>{ const L=document.querySelector('#rvHigh .latest'), rows=document.querySelectorAll('#rvHigh .hl-row').length; document.querySelector('#rvHigh [data-hlr]').click(); const N=document.querySelector('#rvHigh .hld-next');
  const r={L:!!L,rows,next:!!N,share:!!L.querySelector('#shareLatest'),nshare:!!document.querySelector('#rvHigh .hld [data-share],#rvHigh .hld #shareLatest'),coaches:!!N&&/coaches only/i.test(N.textContent)}; document.querySelector('[data-hlback]').click(); return r; });
ok('Highlights (3.13): a row per runner with Share; a runner’s page has the next step (the growth focus), coaches only, with no Share', hi.L&&hi.rows>0&&hi.next&&hi.share&&!hi.nshare&&hi.coaches, JSON.stringify(hi));
ok('the dot goes once Highlights is opened', await ev(()=>!document.querySelector('#rvHighBtn').classList.contains('has-dot')));
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await tab('results');
ok('the Data tab remembers the last section (Highlights) after a reload', await ev(()=>document.querySelector('[data-rv=high]').getAttribute('aria-pressed')==='true'&&!document.querySelector('#rvHigh').hidden));
ok('the dot stays gone after a reload', await ev(()=>!document.querySelector('#rvHighBtn').classList.contains('has-dot')));
await ev(()=>document.querySelector('[data-rv=team]').click()); await W(600);
ok('Data > Team is raw by default and labeled', await ev(()=>document.querySelector('#rvTeam [data-rvchart=raw]').getAttribute('aria-pressed')==='true'&&/Showing Raw times/.test(document.querySelector('#rvTeam .time-kind').textContent)));
await tab('team'); await ev(()=>document.querySelector('#teamTools [data-rvchart=adj]').click()); await W(500);
ok('Adjusted on the Team tab: labeled “Adjusted” in full', await ev(()=>/Showing Adjusted times/.test(document.querySelector('#teamTools .time-kind').textContent)&&/Avg 5K\s*Adjusted/.test(document.querySelector('.team-sec .ath-head').textContent)&&!/\badj\b/i.test(document.querySelector('#v-team').textContent)));
for(const k of ['avg','sb']){ await ev(k=>document.querySelector(`#teamTools [data-rsort=${k}]`).click(),k); await W(300); const RR=await teamRows();
  for(const g of ['G','B']){ const v=RR[g].map(x=>sec(x[k])).filter(x=>x!=null), nm=RR[g].map(x=>x.name);
    ok(`Adjusted, ${k==='avg'?'Average':'Season best'}, ${g==='G'?'Girls':'Boys'}: the shown column is fastest first (ties by name)`, v.every((x,i)=>!i||x>v[i-1]||(x===v[i-1]&&nameCmp(nm[i-1],nm[i])<=0)), RR[g].map(x=>x.name+' '+x[k]).join(', ')); } }
const vals=await ev(()=>MSApp.sortVals());
ok('Adjusted averages differ from raw (the ratings are applied)', vals.filter(v=>v.avg!=null).some(v=>Math.abs(v.avg-v.avgRaw)>0.5), JSON.stringify(vals.slice(0,2)));
await tab('results'); await ev(()=>document.querySelector('[data-rv=runners]').click()); await W(600);
ok('the switch is shared: Data > Runners shows Adjusted too, labeled in full ("Avg … Adjusted")', await ev(()=>document.querySelector('#rvRunners [data-rvchart=adj]').getAttribute('aria-pressed')==='true'&&/Avg \d+:\d\d\.\d Adjusted/.test(document.querySelector('#rvRunners .rv-row').textContent)));
await ev(()=>document.querySelector('[data-rv=team]').click()); await W(600);
ok('…and Data > Team', await ev(()=>document.querySelector('#rvTeam [data-rvchart=adj]').getAttribute('aria-pressed')==='true'));
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await tab('team');
ok('Adjusted is remembered after a reload', await ev(()=>document.querySelector('#teamTools [data-rvchart=adj]').getAttribute('aria-pressed')==='true'));
await ev(()=>document.querySelector('#teamTools [data-rvchart=raw]').click()); await W(300);
await tab('results'); await ev(()=>document.querySelector('[data-rv=meets]').click()); await W(500);
ok('Meets says its times are raw', await ev(()=>/Raw times/.test(document.querySelector('#adjNoteMeets').textContent)));

console.log('4. Team training paces (Training tab; 3.14: a distance and an effort, one list)');
await tab('workouts');
const tp=await ev(()=>{ const w=document.querySelector('#wkPaces'); return {h:w.querySelector('h2').textContent,title:w.querySelector('.tp-title').textContent,secs:[...w.querySelectorAll('.tp-sh')].map(x=>x.textContent.trim()),
  rows:[...w.querySelectorAll('.tp-row')].map(r=>({n:r.querySelector('.tp-nm').textContent,v:r.querySelector('.tp-v').textContent}))}; });
ok('at the bottom of Training: a title for the selection and one time per runner', /Team training paces/.test(tp.h)&&tp.title==='800 m at CV pace'&&tp.rows.length>0, tp.title);
ok('grouped Girls then Boys', /Girls/.test(tp.secs[0])&&/Boys/.test(tp.secs[1]), tp.secs.join('|'));
const D=await ev(()=>MSApp.teamPaces());
ok('fastest first within each group (VDOT)', D.secs.every(g=>{ const v=g.groups.flat().map(r=>r.V); return v.every((x,i)=>!i||x<=v[i-1]+1e-9); }));
ok('every time is m:ss', tp.rows.filter(r=>r.v!=='Needs a race').every(r=>/^\d+:\d\d$/.test(r.v)), JSON.stringify(tp.rows[0]));
await require('./lib.js').tpPick(P,'mile','threshold'); await W(300);
const first=await ev(()=>{ const r=document.querySelector('#wkPaces .tp-row'); return {id:r.dataset.tpr,v:r.querySelector('.tp-v').textContent}; });
await ev(id=>document.querySelector(`#wkPaces [data-tpr="${id}"]`).click(),first.id); await W(300);
await ev(()=>[...document.querySelectorAll('#modal [data-x=prof]')][0].click()); await W(600);
const card=await ev(()=>({vis:!document.querySelector('#wkProf').hidden,back:document.querySelector('#navLeft').textContent,pt:(document.querySelector('#wkProf .pace-table')||{}).innerText||''}));
ok('a runner → the basis sheet → their profile on the Training tab (‹ Training)', card.vis&&/‹ Training/.test(card.back), card.back);
ok('same basis as the profile: the Threshold mile there matches the list', (()=>{ const m=card.pt.match(/Threshold[\s\S]*?mile\s*(\d+:\d\d)/); return m&&m[1]===first.v; })(), first.v+' vs '+(card.pt.match(/Threshold[^\n]*\n?[\s\S]{0,80}/)||[''])[0].replace(/\s+/g,' '));
await ev(()=>document.querySelector('[data-profback]').click()); await W(300);
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await tab('workouts');
ok('the selection is remembered (1 mile at threshold pace)', await ev(()=>document.querySelector('#wkPaces .tp-title').textContent==='1 mile at threshold pace'));
const pin=await ev(()=>({cut:[...document.querySelectorAll('#wkPaces .tp-v')].filter(c=>c.scrollWidth>c.clientWidth+1).length,page:document.documentElement.scrollWidth}));
ok('no time is cut off, and the page itself never scrolls sideways', pin.cut===0&&pin.page<=390, JSON.stringify(pin));
const pdf=await ev(()=>MSApp.pacePdf());
ok('Share: the full pace chart as a PDF (a page per effort)', pdf.head.startsWith('%PDF-1.4')&&pdf.tail.includes('%%EOF')&&pdf.pages===10, JSON.stringify(pdf));
await ev(()=>document.querySelector('#tpShare').click()); await W(300);
ok('Share offers this view as an image and the full pace chart (PDF)', await ev(()=>!!document.querySelector('#modal #tpPng')&&!!document.querySelector('#modal #tpPdf')));
await ev(()=>document.querySelector('#overlay').hidden=true);
await P.close();

console.log('5. Runners without enough race data (sort seed)');
P=await T.open(b,{seed:seed1,url:URL,now:'2026-10-05T16:00:00'}); ev=(f,...a)=>P.evaluate(f,...a);
await tab('workouts');
const nd=await ev(()=>[...document.querySelectorAll('#wkPaces .tp-gG .tp-row')].map(r=>({n:r.querySelector('.tp-nm').textContent,none:r.classList.contains('tp-none'),txt:r.textContent})));
ok('marked “Needs a race” and listed last in their group (Gia Hart)', nd.length&&nd[nd.length-1].n==='Gia Hart'&&nd[nd.length-1].none&&/Needs a race/.test(nd[nd.length-1].txt)&&nd.filter(x=>x.none).length===1, nd.map(x=>x.n+(x.none?'*':'')).join(', '));
ok('a 3200m this season is enough data (Hana Ives has paces)', nd.some(x=>x.n==='Hana Ives'&&!x.none));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
await P.close(); await b.close();
console.log(bad?`${bad} FAILED`:'all passed'); process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
