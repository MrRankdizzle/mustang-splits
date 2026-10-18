// 3.8: "Latest meet" at the top of the Data tab: a card per runner worth celebrating (girls and boys) with the reason
// (PR, season best, course best, first sub-20, a big step vs the last race and vs this meet last year, course-adjusted,
// moving up in team order, negative split, fastest final segment, most even pacing, a return after an Injury-tagged
// race) and team wins (tighter top-5 spread, faster top-5 average); Share = a bold heading with an emoji and bullets.
// "Growth focus" (coaches only, never in the shared text): runners drifting off season-best pace across 3+ races,
// positively framed, with a next target and suggestions by pattern (the first always a check-in), each linked to a
// workout. A planted fake season (fake names only).
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
const URL=process.env.URL||'http://localhost:8765/';
const {seed}=require('./tools/fake-season.js');

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-05T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(800);

console.log('1. Latest meet in Data > Highlights (3.10; at the top of the Data tab in 3.8; 3.13: numbers, a page per runner)');
const top=await ev(()=>{ const s=document.querySelector('#rvHigh .latest'); return s&&!document.querySelector('#rvHigh').hidden?{head:s.querySelector('h3').textContent+' '+s.querySelector('.latest-sub').textContent}:null; });
ok('Highlights names the meet and date', top&&/Mustang Invite/.test(top.head)&&/10\/3/.test(top.head), JSON.stringify(top));
// what counts (unchanged since 3.12): every highlight's full wording, from the data the page draws
const cards=await ev(()=>Object.fromEntries(MSApp.latestMeet().stories.filter(s=>s.hl.length).map(s=>[s.a.name,s.hl.map(h=>h.txt).join(' | ')])));
const has=(n,re)=>!!cards[n]&&re.test(cards[n]);
ok('PR and first sub-20 (Ada Fern, 19:55)', has('Ada Fern',/New 5K PR: 19:55\b/)&&has('Ada Fern',/First 5K under 20:00/), cards['Ada Fern']);
ok('season best when her PR is from last year (Bea Holt)', has('Bea Holt',/Season best at 5K: 20:50\b/)&&!has('Bea Holt',/PR/), cards['Bea Holt']);
ok('best time on the course (Cora Lind, Alpha Park)', has('Cora Lind',/Best time on Alpha Park/), cards['Cora Lind']);
ok('a strong return after an Injury-tagged race (Dot Marsh)', has('Dot Marsh',/first race back/i), cards['Dot Marsh']);
ok('big step vs the last race, course-adjusted (Ben Quill)', has('Ben Quill',/faster than the last race/), cards['Ben Quill']);
ok('moving up in team order (Cal Reyes, #5 to #3)', has('Cal Reyes',/Moved up 2 spots on the boys team since the last meet \(to #3\)/), cards['Cal Reyes']);
ok('faster than this meet last year (Eli Tate)', has('Eli Tate',/faster than at this meet last year/), cards['Eli Tate']);
ok('negative split (Abe Park)', has('Abe Park',/Negative split/), cards['Abe Park']);
ok('fastest final segment and most even pacing are named per team', Object.values(cards).some(c=>/Fastest final segment on the girls team/.test(c))&&Object.values(cards).some(c=>/Fastest final segment on the boys team/.test(c))&&Object.values(cards).some(c=>/Most even pacing/.test(c)));
ok('girls and boys both celebrated', ['Ada Fern','Abe Park'].every(n=>cards[n]));
const team=await ev(()=>MSApp.latestMeet().team.map(t=>t.txt));
ok('team wins: a faster top-5 average (Boys)', team.some(t=>/^Boys: faster top-5 average/.test(t)), team.join(' | '));
ok('every runner has a row on the page', await ev(()=>document.querySelectorAll('#rvHigh .hl-row').length===MSApp.latestMeet().stories.length));
await ev(()=>document.querySelector('#rvHigh [data-hlr="g0"]').click()); await W(400);
ok('a row opens the runner’s page; its profile link opens the runner card', await ev(()=>{ const ok1=/Ada Fern/.test(document.querySelector('#rvHigh .hld-name').textContent); document.querySelector('#rvHigh .hld [data-goto]').click(); return ok1&&!document.querySelector('#rvRunners').hidden&&!!document.querySelector('[data-rvback]'); }));
await ev(()=>{ const bk=document.querySelector('[data-rvback]'); if(bk) bk.click(); document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(500);

console.log('2. Share: text for a team chat');
const txt=await ev(()=>MSApp.latestShare());
const L=txt.split('\n');
ok('a short bold heading with an emoji (text for a chat: icons can’t travel in it)', /^\*\*🎉 Mustang Invite highlights\*\*$/.test(L[0]), L[0]);
ok('then one bullet per highlight', L.slice(1).length>=8&&L.slice(1).every(l=>/^• /.test(l)), L.slice(1,4).join(' / '));
ok('names and reasons (Ada Fern: new 5K PR, first sub-20)', L.some(l=>/^• Ada Fern: new 5K PR, 19:55, first sub-20 5K/.test(l)), L.find(l=>/Ada/.test(l)));
ok('girls before boys', L.findIndex(l=>/Ada Fern/.test(l))<L.findIndex(l=>/Abe Park/.test(l)));
ok('no health reason in the shared text', !/injur|illness/i.test(txt)&&/Dot Marsh: .*strong return to racing/.test(txt));
ok('never the growth focus', !/breakthrough|Eve Nash|Finn Underwood|check in/i.test(txt), txt.match(/Eve Nash|Finn Underwood/));
await ev(()=>document.querySelector('#shareLatest').click()); await W(300);
ok('the Share button offers Copy', await ev(()=>/Copy/.test(document.querySelector('#modal').textContent)));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });

console.log('3. Growth focus (3.12: the next step on each runner’s page; coaches only)');
const ids=await ev(()=>[...document.querySelectorAll('#rvHigh [data-hlr]')].map(x=>x.dataset.hlr)), all=[];
for(const id of ids){ await ev(id=>document.querySelector(`#rvHigh [data-hlr="${id}"]`).click(),id); await W(150);
  all.push(await ev(()=>{ const nx=document.querySelector('#rvHigh .hld-next'); return {n:document.querySelector('#rvHigh .hld-name').textContent,t:nx.innerText.replace(/\s+/g,' '),steps:[...nx.querySelectorAll('li')].map(l=>l.textContent),links:[...nx.querySelectorAll('[data-tpl-open]')].map(x=>({id:x.dataset.tplOpen,t:x.innerText.replace(/\s+/g,' ')})),kind:nx.querySelector('.hld-priv').textContent,lock:!!nx.querySelector('h4 svg')}; }));
  await ev(()=>document.querySelector('[data-hlback]').click()); await W(100); }
const items=all.filter(x=>/Ready for a breakthrough/.test(x.t));
ok('every next step is marked coaches only, with a lock', all.length===12&&all.every(x=>/coaches only/i.test(x.kind)&&x.lock), all.length);
const eve=items.find(x=>x.n==='Eve Nash'), finn=items.find(x=>x.n==='Finn Underwood');
ok('Eve Nash (goes out fast, fades) and Finn Underwood (across the board) are there', !!eve&&!!finn, items.map(x=>x.n).join());
ok('nobody without a 3-race pattern, and Injury-tagged races never make one (Dot Marsh)', items.every(x=>['Eve Nash','Finn Underwood'].includes(x.n)), items.map(x=>x.n).join());
ok('forward-looking words, never “worse” or “declining”', all.every(x=>!/worse|declin|slowing|bad/i.test(x.t)));
ok('a realistic next target: back to season-best pace', /Target: \d:\d\d\/mi, about \d+:\d\d 5K/.test(eve.t), eve.t.slice(0,200));
const st=x=>x.steps.filter(l=>!/^Ready for a breakthrough|^Target/.test(l));
ok('the first suggestion is always a check-in (sleep, stress, illness, training load)', [eve,finn].every(x=>/^Check in with \w+: sleep, stress, illness and training load/.test(st(x)[0])), st(eve)[0]);
const lk=x=>x.links.map(l=>l.t).join(' | ');
ok('fades → even-pace and negative-split workouts', /even pacing/i.test(lk(eve))&&/negative split/i.test(lk(eve)), lk(eve));
ok('across the board → more easy days and recovery', /easy|recovery/i.test(lk(finn)), lk(finn));
ok('every pattern links to at least two workouts', [eve,finn].every(x=>x.links.length>=2), [eve,finn].map(x=>x.links.length).join());
await ev(()=>document.querySelector('#rvHigh [data-hlr="g4"]').click()); await W(300);
await ev(()=>document.querySelector('#rvHigh .hld [data-tpl-open]').click()); await W(600);
ok('the link opens that workout on the Training tab', await ev(()=>!document.querySelector('#v-workouts').hidden&&!!document.querySelector('#modal .tpl-sheet')));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
