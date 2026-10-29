// 3.18: season summaries and the awards worksheet. Data > Highlights has a Latest meet | Season switch (remembered);
// Season = team cards and a page per runner (celebrations, shareable); Awards = coaches only, never shared: MVR (average
// place among our varsity runners, 80% of the varsity meets), Varsity Letter checklist, Most Improved and Rookie of the
// Year (evidence), Mustang Award (no one overlooked), recipients, Captain / good standing (yes or no only), Varsity at
// each meet, Championship meets, settings, the Awards worksheet PDF. Then two coach phones on the emulator share the
// awards decisions. Fake names only (the fake team history, tests/fixtures).
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), H=require('./tools/phones.js');
const URL=process.env.URL||'http://localhost:8765/';
const MI=1609.344;

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };

console.log('1. The MVR arithmetic (pure)');
const P0=await T.open(b,{url:URL,now:'2026-10-20T16:00:00'}); const ev0=(f,...a)=>P0.evaluate(f,...a);
const ex=await ev0(()=>MSApp.mvrCalc([{id:'r1',name:'Runner 1',places:[2,1,3,1,2,2,2,3]},{id:'r2',name:'Runner 2',places:[1,2,5,2,1,1,1,2]}],8,80));
const r1=ex.rows.find(r=>r.id==='r1'), r2=ex.rows.find(r=>r.id==='r2');
ok('Runner 1: 2,1,3,1,2,2,2,3 = 16 (2.0)', r1.math==='2,1,3,1,2,2,2,3 = 16 (2.0)'&&r1.avg===2, r1.math);
ok('Runner 2: 1,2,5,2,1,1,1,2 = 15 (1.875)', r2.math==='1,2,5,2,1,1,1,2 = 15 (1.875)'&&r2.avg===1.875, r2.math);
ok('Runner 2 wins (lowest average), Runner 1 second', ex.winners.join()==='r2'&&ex.ranked.map(r=>r.id).join()==='r2,r1'&&r1.rank===2, JSON.stringify(ex.ranked.map(r=>[r.id,r.rank])));
const th=await ev0(()=>{ const rows=[{id:'a',name:'A',places:[1,1,1,1,1,1]},{id:'b',name:'B',places:[2,2,2,2,2,2,2]},{id:'c',name:'C',places:[3,3,3,3,3,3,3,3]}];
  return {at80:MSApp.mvrCalc(rows,8,80),at75:MSApp.mvrCalc(rows,8,75),five:MSApp.mvrCalc([{id:'d',name:'D',places:[1,1,1,1]}],5,80)}; });
ok('80%: 6 of 8 meets (75%) is not eligible, 7 of 8 is', th.at80.ranked.map(r=>r.id).join()==='b,c'&&th.at80.out.map(r=>r.id).join()==='a'&&th.at80.need===7, JSON.stringify(th.at80.ranked.map(r=>r.id)));
ok('…a better average under the threshold never wins', th.at80.winners.join()==='b');
ok('the threshold is a setting: at 75% the 6-of-8 runner is eligible and wins', th.at75.winners.join()==='a');
ok('exactly 80% (4 of 5) is eligible', th.five.ranked.length===1&&th.five.need===4);
const tie=await ev0(()=>MSApp.mvrCalc([{id:'x',name:'X',places:[1,3,2]},{id:'y',name:'Y',places:[2,2,2]},{id:'z',name:'Z',places:[3,1,3,3]}],3,80));
ok('ties are flagged for the coaches (both rank 1, both listed)', tie.ties.length===1&&tie.ties[0].sort().join()==='x,y'&&tie.winners.sort().join()==='x,y'&&tie.ranked.every(r=>r.id==='z'?r.rank===3:r.rank===1), JSON.stringify(tie.ties));
await P0.close();

console.log('2. The Season view (fake team history)');
// one hand-timed girls race without official results (it stays "unknown" for varsity until confirmed)
const seed=T.seed(), ids=['f0','f1','f2','f3','f4'], tt=[1340,1370,1395,1400,1420];
seed.raceLog=[{id:'hR',date:'2026-10-08',savedAtMs:Date.parse('2026-10-08T20:00'),uploaded:false,edits:[],race:{name:'Practice meet',raceId:'rR',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'GV',
  checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks:ids.map((id,i)=>({id:'m'+id,ci:0,rid:id,t:tt[i],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}))}}];
const P=await T.open(b,{url:URL,seed,now:'2026-10-20T16:00:00'}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a);
const openHigh=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(600); };
await openHigh();
ok('Highlights has a Latest meet | Season switch (3.19: | Share), Latest meet first', await ev(()=>{ const B=[...document.querySelectorAll('#rvHigh .hl-mode [data-hlm]')]; return B.map(x=>x.textContent).join('|')==='Latest meet|Season|Share'&&B[0].getAttribute('aria-pressed')==='true'&&!!document.querySelector('#rvHigh .latest h3'); }));
await ev(()=>document.querySelector('[data-hlm=season]').click()); await W(500);
ok('Season shows team cards for Girls and Boys and a row per runner', await ev(()=>document.querySelectorAll('#rvHigh .ss .tcard').length===2&&document.querySelectorAll('#rvHigh .ss [data-ssr]').length===14));
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await openHigh();
ok('the switch is remembered (Season after a reload)', await ev(()=>!!document.querySelector('#rvHigh .ss')&&document.querySelector('[data-hlm=season]').getAttribute('aria-pressed')==='true'));
const tg=await ev(()=>MSApp.seasonTeam(2026,'G'));
ok('team card: top-5 average and 1–5 spread across the season, PRs and season bests', tg&&tg.meets>=5&&tg.avg>0&&tg.spread>0&&tg.prs>0, JSON.stringify(tg));
const s0=await ev(()=>MSApp.seasonStory('f0',2026));
ok('runner: the arc from opener to season best (raw and course-adjusted)', s0&&s0.arc>0&&s0.sb<s0.opener&&s0.arcAdj!=null, JSON.stringify(s0&&[s0.opener,s0.sb,s0.arc,s0.arcAdj]));
ok('runner: season over season (last year’s season best) and the career PR by season', s0.sos>0&&s0.career.length===2&&s0.career[1].pr<=s0.career[0].pr, JSON.stringify(s0.career));
ok('runner: PRs, a milestone, team place over the season, consistency', s0.prs>=1&&s0.milestone>0&&s0.places.length>=5&&s0.places.every(p=>p===1)&&s0.cons&&s0.cons.n>=5, JSON.stringify([s0.prs,s0.milestone,s0.places,s0.cons]));
ok('runner: a one-sentence story from the numbers, by first name (no pronouns)', /^Avery opened at \d+:\d\d(\.\d)? and ran a season best of .+, .+ faster.*\.$/.test(s0.story)&&!/\b(she|he|her|his|they|their)\b/i.test(s0.story), s0.story);
await ev(()=>document.querySelector('[data-ssr="f0"]').click()); await W(400);
ok('a row opens the runner’s season page (‹ Highlights, name in the nav bar)', await ev(()=>/Avery Lindqvist/.test(document.querySelector('#rvHigh .ss-d .hld-name').textContent)&&!!document.querySelector('[data-hlback]')&&document.querySelector('#navSmall').textContent==='Avery Lindqvist'&&!document.querySelector('#rvHigh .hl-mode')));
ok('the page has the arc, best adjusted race, team place, season over season', await ev(()=>{ const t=document.querySelector('#rvHigh .ss-d').textContent; return /Season arc/.test(t)&&/Best adjusted race/.test(t)&&/Team place over the season/.test(t)&&/Season over season/.test(t)&&document.querySelectorAll('#rvHigh .ss-races li').length>=5; }));
await ev(()=>document.querySelector('[data-hlback]').click()); await W(300);

console.log('3. Awards (coaches only)');
await ev(()=>document.querySelector('[data-ssaw]').click()); await W(400);
ok('Awards opens with the lock and "Coaches only · never shared"', await ev(()=>{ const p=document.querySelector('#rvHigh .aw .aw-priv'); return !!p&&!!p.querySelector('svg.ic')&&/Coaches only · never shared/.test(p.textContent)&&document.querySelector('#navSmall').textContent==='Awards'; }));
ok('Girls and Boys separately by default', await ev(()=>[...document.querySelectorAll('[data-awteam]')].map(x=>x.textContent).join('|')==='Girls|Boys'));
let A=await ev(()=>MSApp.awards(2026,'G'));
ok('varsity from the official results’ division text; the hand-timed race is unknown until confirmed', A.total===6&&A.unknown===5&&!A.vDates.includes('2026-10-08'), JSON.stringify([A.total,A.unknown,A.vDates]));
ok('MVR shows the full math for every runner', A.mvr.ranked.length>=4&&A.mvr.ranked.every(r=>/^\d(,\d)* = \d+ \(\d+\.\d+\)$/.test(r.math))&&await ev(()=>document.querySelectorAll('#rvHigh .aw-sec .aw-math').length>=7), JSON.stringify(A.mvr.ranked.map(r=>r.math)));
ok('MVR: runners under 80% of the varsity meets are listed apart', A.mvr.out.length>=1&&A.mvr.out.every(r=>r.n<A.mvr.need));
// confirm the hand-timed race as varsity: a 7th meet for the five who ran it
await ev(()=>MSApp.awPut('v-2026-10-08',{k:'v',season:2026,date:'2026-10-08'},{var:{f0:'V',f1:'V',f2:'V',f3:'V',f4:'V'}})); A=await ev(()=>MSApp.awards(2026,'G'));
ok('a coach confirms it: 7 varsity meets, places added to the math', A.total===7&&A.unknown===0&&A.mvr.ranked.find(r=>r.id==='f0').n===7, JSON.stringify(A.mvr.ranked.map(r=>r.id+':'+r.math)));
ok('…and the two who missed it now fall under 80% (5 of 7 = 71%)', A.mvr.out.some(r=>r.id==='f5')&&A.mvr.need===6);
// Letter: grade and seasons from the history, editable; championship; good standing
const L0=A.letter.find(x=>x.id==='f0');
ok('Letter: grade and high school seasons from the history (grade 12, 2 seasons)', L0.grade===12&&L0.hs===2&&!L0.senior&&L0.maj, JSON.stringify(L0));
const nec=await ev(()=>(MSApp.getMeets().find(m=>m.seriesId==='s-nec-conference')||{}).id);
ok('Championship meets: NEC Conference, WIAA Sectional and WIAA State are set by default', !!nec&&await ev(id=>MSApp.isChamp(id),nec)&&await ev(()=>MSApp.getMeets().filter(m=>MSApp.isChamp(m.id)).every(m=>['s-nec-conference','s-wiaa-sectional','s-wiaa-state'].includes(m.seriesId))));
const wau=await ev(()=>(MSApp.getMeets().find(m=>m.date==='2026-10-01')||{}).id);
await ev((id)=>MSApp.awPut('m-'+id,{k:'m',meetId:id},{season:2026,champ:true}),wau);
await ev(()=>MSApp.awPut('r-2026-f0',{k:'r',season:2026,aid:'f0'},{hs:4,standing:'yes',captain:true}));
A=await ev(()=>MSApp.awards(2026,'G')); const L1=A.letter.find(x=>x.id==='f0');
ok('Letter: varsity at a championship meet, senior with 3–4 seasons, good standing', L1.champ.length===1&&L1.senior&&L1.standing==='yes'&&L1.captain, JSON.stringify(L1));
ok('Rookie of the Year: first-year high school runners from the history (grade 9, first season 2026)', A.roty.slice().sort().join()==='f3,f6', A.roty.join());
await ev(()=>MSApp.awPut('r-2026-f1',{k:'r',season:2026,aid:'f1'},{hs:1})); A=await ev(()=>MSApp.awards(2026,'G'));
ok('…and a runner whose seasons are set to 1 joins them', A.roty.includes('f1'));
ok('Most Improved: evidence lists (season-long adjusted, season over season, PR drops)', A.mir.season.length>=3&&A.mir.sos.length>=3&&A.mir.pr.length>=3);
ok('Mustang Award lists everyone but the captain', !A.mustang.includes('f0')&&A.mustang.length===6);
await ev(()=>document.querySelector('[data-awmark^="G.mvr|f1"]').click()); await W(300);
A=await ev(()=>MSApp.awards(2026,'G'));
ok('marking an MVR recipient: shown, and off the Mustang list', !A.mustang.includes('f1')&&await ev(()=>/Recipient: Maren Schoenfeld/.test(document.querySelector('#aw-mvr').parentNode.textContent)));
ok('the notes for Most Improved and Rookie of the Year are shown', await ev(()=>{ const t=document.querySelector('#rvHigh .aw').textContent; return t.includes('Practice approach and academics are the coaches’ call.')&&t.includes('Practice participation and enthusiasm are the coaches’ call.'); }));
// the runner sheet: Captain, good standing yes / no only, grade and seasons
await ev(()=>document.querySelector('[data-awrun="f2"]').click()); await W(300);
ok('runner sheet: Captain switch, good standing Yes / No / Not set, no text field', await ev(()=>{ const m=document.querySelector('#modal .aw-sheet'); return !!m&&!!m.querySelector('[data-aw=captain]')&&[...m.querySelectorAll('[data-st]')].map(x=>x.textContent).join('|')==='Yes|No|Not set'&&!m.querySelector('textarea,input[type=text],input:not([type])'); }));
await ev(()=>{ document.querySelector('#modal [data-st=no]').click(); }); await W(200); await ev(()=>{ document.querySelector('#modal [data-aw=captain]').click(); }); await W(200);
ok('…saved as yes/no and a checkbox only', await ev(()=>{ const d=MSApp.getAwards().find(x=>x.id==='r-2026-f2'); return d&&d.standing==='no'&&d.captain===true&&Object.keys(d).every(k=>['id','k','season','aid','captain','standing','hs','grade'].includes(k)); }));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
// Varsity at each meet
await ev(()=>document.querySelector('[data-awvar]').click()); await W(300);
ok('Varsity at each meet: every race day with Varsity / JV per runner and where it came from', await ev(()=>{ const m=document.querySelector('#modal .aw-sheet'); return m&&m.querySelectorAll('.aw-day').length>=12&&/from official results/.test(m.textContent)&&/confirmed by a coach/.test(m.textContent); }));
await ev(()=>{ const b2=[...document.querySelectorAll('#modal [data-vl=JV]')].find(x=>x.dataset.va==='f0'&&x.dataset.vdate==='2026-09-03'); b2.click(); }); await W(200);
A=await ev(()=>MSApp.awards(2026,'G'));
ok('…a coach’s JV choice takes that race out of the runner’s MVR places', A.mvr.ranked.concat(A.mvr.out).find(r=>r.id==='f0').n===6);
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
// settings: together, threshold
await ev(()=>MSApp.awPut('s-2026',{k:'s',season:2026},{set:{split:false,thr:70,total:'varsity'}})); await ev(()=>{ document.querySelector('[data-hlback]').click(); document.querySelector('[data-ssaw]').click(); }); await W(300);
ok('settings: Girls and Boys together, MVR threshold 70%', await ev(()=>!document.querySelector('[data-awteam]')&&/at least 70%/.test(document.querySelector('#rvHigh .aw').textContent)));
await ev(()=>MSApp.awPut('s-2026',{k:'s',season:2026},{set:{split:true,thr:80,total:'varsity'}}));
// the worksheet PDF
const pdf=await ev(async()=>{ const bl=MSApp.awardsPdf(2026), t=await bl.slice(0,8).text(), all=await bl.text(); return {type:bl.type,size:bl.size,head:t,pages:(all.match(/\/Type \/Page\b/g)||[]).length}; });
ok('Awards worksheet: a PDF with a page or more per team', pdf.type==='application/pdf'&&pdf.head.startsWith('%PDF')&&pdf.size>20000&&pdf.pages>=2, JSON.stringify(pdf));

console.log('4. Shared recaps never carry coach-only content');
const share=await ev(()=>[MSApp.seasonShare(2026),...MSApp.getRoster().map(a=>MSApp.seasonShare(2026,a.id))].join('\n----\n'));
const coach=/award|MVR|Most Valuable|Letter|Captain|standing|Rookie|Improved|Mustang Award|coaches|Next step|check in|Injury|Illness|varsity|recipient/i;
ok('team and runner recaps: celebrations only (no awards, captains, standing, coach notes or health reasons)', share.length>500&&!coach.test(share), (share.match(coach)||[''])[0]);
ok('…each runner recap has the season best and the story', /Avery Lindqvist · 2026 season\nAvery opened at/.test(share)&&/• Season best: /.test(share));
ok('no emoji in the Season view or Awards', await ev(()=>{ const re=/[\u{1F300}-\u{1FAFF}☀-➿★▲⚑ⓘ]/u; document.querySelector('[data-hlback]').click(); const a=document.querySelector('#rvHigh').textContent; document.querySelector('[data-ssaw]').click(); return !re.test(a)&&!re.test(document.querySelector('#rvHigh').textContent); }));
await P.setViewport({width:320,height:700,isMobile:true,hasTouch:true}); await W(300);
// (the nav bar's season picker already runs past 320 pt on the Data tab in 3.17: a known issue, checked here on the content)
const fits=()=>{ const W=document.documentElement.clientWidth; return [...document.querySelectorAll('#rvHigh *')].every(n=>{ if(!n.offsetParent||n.getBoundingClientRect().right<=W+0.5) return true; for(let p=n.parentElement;p;p=p.parentElement){ if(getComputedStyle(p).overflowX!=='visible') return true; } return false; }); };
ok('no sideways scrolling at 320 pt (Awards and Season)', await ev(`(()=>{ const fits=${fits.toString()}; const a=fits(); document.querySelector('[data-hlback]').click(); return a&&fits(); })()`));
ok('tap targets in Awards are at least 44 pt', await ev(()=>{ document.querySelector('[data-ssaw]').click(); return [...document.querySelectorAll('#rvHigh .aw button')].filter(x=>x.offsetParent&&!x.classList.contains('adj-i')).every(x=>{ const r=x.getBoundingClientRect(); return r.height>=43.5; }); }));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
await P.close();

console.log('5. Two coach phones share the awards decisions (emulator)');
if(!process.env.NO_EMU){ const errs=[];
  const [PA,PB]=await H.team(b,['Coach Ann','Coach Ben'],errs,S=>{ S.roster=[{id:'q1',name:'Quinn Ash',group:'',gender:'G'}]; });
  await PA.evaluate(()=>MSApp.awPut('r-2026-q1',{k:'r',season:2026,aid:'q1'},{captain:true,standing:'yes'}));
  const got=await H.waitFor(PB,()=>{ const d=MSApp.getAwards().find(x=>x.id==='r-2026-q1'); return d&&d.captain===true&&d.standing==='yes'; },null,15000);
  ok('Coach Ben’s phone gets Captain and good standing from Coach Ann', got);
  await PB.evaluate(()=>MSApp.awPut('r-2026-q1',{k:'r',season:2026,aid:'q1'},{captain:undefined}));
  const off=await H.waitFor(PA,()=>{ const d=MSApp.getAwards().find(x=>x.id==='r-2026-q1'); return d&&!d.captain&&d.standing==='yes'; },null,15000);
  ok('…Coach Ben unchecks Captain: gone on Coach Ann’s phone too (the document is replaced, not merged)', off);
  await PA.evaluate(()=>MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['q1']}}));
  ok('recipients reach the other phone', await H.waitFor(PB,()=>{ const d=MSApp.getAwards().find(x=>x.id==='s-2026'); return d&&d.recip&&(d.recip['G.mvr']||[]).includes('q1'); },null,15000));
  ok('no errors on either phone', !errs.length, errs.join(' | '));
}
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(2); });
