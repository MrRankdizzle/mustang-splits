// 3.8: "Latest meet" at the top of the Data tab: a card per runner worth celebrating (girls and boys) with the reason
// (PR, season best, course best, first sub-20, a big step vs the last race and vs this meet last year, course-adjusted,
// moving up in team order, negative split, fastest final segment, most even pacing, a return after an Injury-tagged
// race) and team wins (tighter top-5 spread, faster top-5 average); Share = a bold heading with an emoji and bullets.
// "Growth focus" (coaches only, never in the shared text): runners drifting off season-best pace across 3+ races,
// positively framed, with a next target and suggestions by pattern (the first always a check-in), each linked to a
// workout. A planted fake season (fake names only).
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
const URL=process.env.URL||'http://localhost:8765/';
const MI=1609.344;
// --- the planted season ---------------------------------------------------------------------------------------------
const G=['Ada Fern','Bea Holt','Cora Lind','Dot Marsh','Eve Nash','Fay Orr'], B=['Abe Park','Ben Quill','Cal Reyes','Dan Stone','Eli Tate','Finn Underwood'];
const roster=[...G.map((n,i)=>({id:'g'+i,name:n,group:'',gender:'G'})),...B.map((n,i)=>({id:'b'+i,name:n,group:'',gender:'B'}))];
const days=[['2026-09-05','cA','sA'],['2026-09-12','cB','sB'],['2026-09-19','cA','sC'],['2026-09-26','cB','sD'],['2026-10-03','cA','sE']];
// finish times (s) per runner per day; the last day is the "latest meet"
const base={g0:1215,g1:1260,g2:1300,g3:1330,g4:1250,g5:1380,b0:1040,b1:1100,b2:1135,b3:1110,b4:1090,b5:1170};
const T5={
  g0:[1215,1210,1206,1208,1195],      // 19:55: PR and first sub-20
  g1:[1262,1258,1255,1257,1250],      // season best (her PR is a 2025 time)
  g2:[1290,1300,1302,1305,1296],      // best time on Alpha Park (not SB: 9/5 1290 was Alpha... see below)
  g3:[1330,1325,1328,1400,1320],      // 9/26 tagged Injury, then back on 10/3
  g4:[1240,1252,1266,1281,1297],      // growth focus: fades
  g5:[1380,1378,1376,1374,1372],
  b0:[1040,1036,1033,1031,1029],
  b1:[1100,1098,1097,1099,1068],      // big step forward vs last race
  b2:[1135,1133,1131,1134,1075],      // up in team order (#5 -> #3)
  b3:[1110,1108,1106,1104,1102],      //
  b4:[1090,1088,1086,1085,1083],      // faster than this meet last year
  b5:[1170,1182,1195,1206,1221]};     // growth focus: across the board
// g2: make Alpha slower before, so 10/3 is her best there but not her season best (9/12 Beta 1275)
T5.g2=[1310,1275,1308,1290,1296];
// splits: [mile1, mile2] as fractions; most runners even; g4 fades (fast first mile); b0 negative split on 10/3
const split=(id,di,t)=>{ let f=[0.322,0.322];
  if(id==='g4') f=[0.300,0.320];
  if(id==='b0'&&di===4) f=[0.330,0.333];
  const m1=Math.round(t*f[0]*10)/10, m2=Math.round(t*(f[0]+f[1])*10)/10; return [m1,m2,t]; };
const race=(di,g)=>{ const [date,cid,sid]=days[di], ids=roster.filter(a=>a.gender===g).map(a=>a.id), rid=`r${di}${g}`;
  const marks=[]; ids.forEach(id=>split(id,di,T5[id][di]).forEach((t,ci)=>marks.push({id:`${rid}-${id}-${ci}`,ci,rid:id,t,dev:'d',byName:'Coach Ann',at:0,chosen:false,deleted:false,hist:[]})));
  const edits=(di===3&&g==='G')?[{op:'tag',rid:'g3',tags:['Injury'],note:'',uid:'u',dev:'d',byName:'Coach Ann',at:1}]:[];
  return {id:'h'+rid,date,savedAtMs:Date.parse(date+'T20:00'),uploaded:false,edits,race:{name:`Meet ${di+1}`,raceId:rid,courseId:cid,courseName:'',goalSrc:'none',meetId:'m'+di,seriesId:sid,division:g+'V',
    checkpoints:[{id:'k1',name:'Mile 1',dist:MI,unit:'mi'},{id:'k2',name:'Mile 2',dist:2*MI,unit:'mi'},{id:'k3',name:'Finish',dist:5000,unit:'m'}],
    rows:ids.map(id=>({id,name:roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks}}; };
// last season: the same meet as 10/3 (series sE) with b4 at 18:40 and g1's PR (20:40)
const lastYear=g=>{ const ids=g==='B'?['b4']:['g1'], t={b4:1120,g1:1240}; const rid='ly'+g;
  return {id:'h'+rid,date:'2025-10-04',savedAtMs:Date.parse('2025-10-04T20:00'),uploaded:false,edits:[],race:{name:'Meet 5 (2025)',raceId:rid,courseId:'cA',courseName:'',goalSrc:'none',meetId:'m25',seriesId:'sE',division:g+'V',
    checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks:ids.map(id=>({id:rid+id,ci:0,rid:id,t:t[id],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}))}}; };
const log=[...days.flatMap((d,di)=>[race(di,'G'),race(di,'B')]),lastYear('G'),lastYear('B')].reverse();
const seed=T.seed(); Object.assign(seed,{roster,raceLog:log,courses:[{id:'cA',name:'Alpha Park',checkpoints:[]},{id:'cB',name:'Beta Woods',checkpoints:[]}],
  series:['sA','sB','sC','sD','sE'].map((id,i)=>({id,name:['Opener Invite','Woods Invite','Park Classic','Conference Relays','Mustang Invite'][i]})),
  meets:[...days.map(([date,cid,sid],i)=>({id:'m'+i,seriesId:sid,courseId:cid,date,time:'',kind:'Invite',levels:['V','JV'],season:2026})),{id:'m25',seriesId:'sE',courseId:'cA',date:'2025-10-04',time:'',kind:'Invite',levels:['V'],season:2025}]});

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-05T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); }); await W(800);

console.log('1. Latest meet at the top of the Data tab');
const top=await ev(()=>{ const s=document.querySelector('#v-results .latest'), sw=document.querySelector('#v-results .rv-switch'); return s&&sw?{first:!!(s.compareDocumentPosition(sw)&Node.DOCUMENT_POSITION_FOLLOWING),head:s.querySelector('h3').textContent+' '+s.querySelector('.latest-sub').textContent}:null; });
ok('a “Latest meet” section above Meets / Runners / Team, naming the meet and date', top&&top.first&&/Latest meet/.test(top.head)&&/Mustang Invite/.test(top.head)&&/10\/3/.test(top.head), JSON.stringify(top));
await ev(()=>{ const a=document.querySelector('#latestAll'); if(a) a.click(); }); await W(400);
const cards=await ev(()=>Object.fromEntries([...document.querySelectorAll('#v-results .cele')].map(c=>[c.querySelector('h4 button').textContent,c.innerText.replace(/\s+/g,' ')])));
const has=(n,re)=>!!cards[n]&&re.test(cards[n]);
ok('PR and first sub-20 (Ada Fern, 19:55)', has('Ada Fern',/New 5K PR: 19:55\b/)&&has('Ada Fern',/First 5K under 20:00/), cards['Ada Fern']);
ok('season best when her PR is from last year (Bea Holt)', has('Bea Holt',/Season best at 5K: 20:50\b/)&&!has('Bea Holt',/PR/), cards['Bea Holt']);
ok('best time on the course (Cora Lind, Alpha Park)', has('Cora Lind',/Best time on Alpha Park/), cards['Cora Lind']);
ok('a strong return after an Injury-tagged race (Dot Marsh)', has('Dot Marsh',/first race back/i), cards['Dot Marsh']);
ok('big step vs the last race, course-adjusted (Ben Quill)', has('Ben Quill',/faster than the last race/), cards['Ben Quill']);
ok('moving up in team order (Cal Reyes, #5 to #3)', has('Cal Reyes',/Up to #3 on the boys team \(from #5\)/), cards['Cal Reyes']);
ok('faster than this meet last year (Eli Tate)', has('Eli Tate',/faster than at this meet last year/), cards['Eli Tate']);
ok('negative split (Abe Park)', has('Abe Park',/Negative split/), cards['Abe Park']);
ok('fastest final segment and most even pacing are named per team', Object.values(cards).some(c=>/Fastest final segment on the girls team/.test(c))&&Object.values(cards).some(c=>/Fastest final segment on the boys team/.test(c))&&Object.values(cards).some(c=>/Most even pacing/.test(c)));
ok('girls and boys both celebrated', ['Ada Fern','Abe Park'].every(n=>cards[n]));
const team=await ev(()=>[...document.querySelectorAll('#v-results .cele-team li')].map(x=>x.textContent));
ok('team wins: a faster top-5 average (Boys)', team.some(t=>/^Boys: faster top-5 average/.test(t)), team.join(' | '));
ok('a runner card opens the runner', await ev(()=>{ document.querySelector('#v-results .cele [data-goto]').click(); return !document.querySelector('#rvRunners').hidden&&!!document.querySelector('[data-rvback]'); }));
await ev(()=>{ const bk=document.querySelector('[data-rvback]'); if(bk) bk.click(); document.querySelector('.tab[data-tab=results]').click(); }); await W(500);

console.log('2. Share: text for a team chat');
const txt=await ev(()=>MSApp.latestShare());
const L=txt.split('\n');
ok('a short bold heading with an emoji', /^\*\*🎉 Mustang Invite highlights\*\*$/.test(L[0]), L[0]);
ok('then one bullet per highlight', L.slice(1).length>=8&&L.slice(1).every(l=>/^• /.test(l)), L.slice(1,4).join(' / '));
ok('names and reasons (Ada Fern: new 5K PR, first sub-20)', L.some(l=>/^• Ada Fern: new 5K PR, 19:55, first sub-20 5K/.test(l)), L.find(l=>/Ada/.test(l)));
ok('girls before boys', L.findIndex(l=>/Ada Fern/.test(l))<L.findIndex(l=>/Abe Park/.test(l)));
ok('no health reason in the shared text', !/injur|illness/i.test(txt)&&/Dot Marsh: .*strong return to racing/.test(txt));
ok('never the growth focus', !/breakthrough|Eve Nash|Finn Underwood|check in/i.test(txt), txt.match(/Eve Nash|Finn Underwood/));
await ev(()=>document.querySelector('#shareLatest').click()); await W(300);
ok('the Share button offers Copy', await ev(()=>/Copy/.test(document.querySelector('#modal').textContent)));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });

console.log('3. Growth focus (coaches only)');
const gf=await ev(()=>{ const d=document.querySelector('#v-results details.growth'); if(!d) return null; d.open=true; return {sum:d.querySelector('summary').textContent,items:[...d.querySelectorAll('.gf')].map(x=>({n:x.querySelector('h4 button').textContent,t:x.innerText.replace(/\s+/g,' '),steps:[...x.querySelectorAll('.gf-steps li')].map(l=>l.textContent),links:[...x.querySelectorAll('[data-tpl-open]')].map(l=>l.dataset.tplOpen)}))}; });
ok('a Growth focus section marked coaches only', gf&&/coaches only/i.test(gf.sum), gf&&gf.sum);
const eve=gf&&gf.items.find(x=>x.n==='Eve Nash'), finn=gf&&gf.items.find(x=>x.n==='Finn Underwood');
ok('Eve Nash (goes out fast, fades) and Finn Underwood (across the board) are there', !!eve&&!!finn, gf&&gf.items.map(x=>x.n).join());
ok('nobody without a 3-race pattern, and Injury-tagged races never make one (Dot Marsh)', gf.items.every(x=>['Eve Nash','Finn Underwood'].includes(x.n)), gf.items.map(x=>x.n).join());
ok('forward-looking words, never “worse” or “declining”', gf.items.every(x=>/ready for a breakthrough/i.test(x.t)&&!/worse|declin|slowing|bad/i.test(x.t)));
ok('a realistic next target: back to season-best pace', /Next target: Back to season-best pace: \d:\d\d\/mi/.test(eve.t), eve.t.slice(0,200));
ok('the first suggestion is always a check-in (sleep, stress, illness, training load)', [eve,finn].every(x=>/^Check in with \w+: sleep, stress, illness and training load/.test(x.steps[0])));
ok('fades → even-pace and negative-split workouts', /even pacing/i.test(eve.steps.join(' '))&&/negative split|cutdown/i.test(eve.steps.join(' ')), eve.steps.join(' | '));
ok('across the board → more easy days and recovery', /easy|recovery/i.test(finn.steps.slice(1).join(' ')), finn.steps.join(' | '));
ok('every workout suggestion links to a workout', [eve,finn].every(x=>x.links.length===x.steps.length-1&&x.links.length>=2));
await ev(()=>document.querySelector('#v-results details.growth [data-tpl-open]').click()); await W(600);
ok('the link opens that workout on the Training tab', await ev(()=>!document.querySelector('#v-workouts').hidden&&!!document.querySelector('#modal .tpl-sheet')));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
