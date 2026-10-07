// Loads the fake team (tests/fixtures/fake-team-history.json, made by make-fake-team.js) into a fresh phone:
// roster with short names like the coach's ("Avery L."), the 2026 schedule, then the history file imported.
// Used by tests/e2e22.js and tools/shots212.js. Every name is made up.
const path=require('path');
const W=ms=>new Promise(r=>setTimeout(r,ms||250));
const SHORT=[['Avery L.','G'],['Maren S.','G'],['Tessa V.','G'],['Juniper C.','G'],['Nora P.','G'],['Sloane W.','G'],['Ivy D.','G'],
  ['Rowan H.','B'],['Silas B.','B'],['Emmett V.','B'],['Calvin O.','B'],['Jasper K.','B'],['Theo M.','B'],['Felix O.','B']];
const roster=()=>SHORT.map(([name,gender],i)=>({id:'f'+i,name,group:'',gender}));
const seed=()=>({v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true,genderGroups2100:true},
  workouts:[],watches:[],courses:[],prs:{},series:[],meets:[],merges:[],race:null,roster:roster(),raceLog:[]});
const FILE=path.join(__dirname,'..','fixtures','fake-team-history.json');
// opts: {url, w, h, dark, now}
async function open(browser,opts={}){
  const P=await (await browser.createBrowserContext()).newPage(), errs=[]; P.on('pageerror',e=>errs.push(e.message+(process.env.STACK?' @ '+String(e.stack).split('\n').slice(1,3).join(' | '):''))); P.errs=errs;
  await P.emulateMediaFeatures([{name:'prefers-color-scheme',value:opts.dark?'dark':'light'}]);
  await P.evaluateOnNewDocument((sd,now,flat)=>{ try{ localStorage.setItem('mustang-splits:tour','1'); if(flat) localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
    const off=Date.parse(now)-Date.now(), Rr=Date; class D extends Rr{ constructor(...a){ if(a.length) super(...a); else super(Rr.now()+off); } static now(){ return Rr.now()+off; } } D.parse=Rr.parse; D.UTC=Rr.UTC; window.Date=D; },JSON.stringify(opts.seed||seed()),opts.now||'2026-10-05T16:00:00',opts.flat!==false); // 3.4: flat Settings for tests unless asked
  await P.setViewport({width:opts.w||390,height:opts.h||844,isMobile:true,hasTouch:true,deviceScaleFactor:opts.scale||2});
  await P.goto(opts.url||'http://localhost:8765/'); await P.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(600);
  return P;
}
async function load(P,{file=FILE,schedule=true}={}){
  // the 2026 schedule
  if(schedule){ await P.click('#openSettings'); await W(); if(!(await P.$('#openMeets'))){ await P.click('#modal [data-spage=data]'); await W(); } await P.click('#openMeets'); await W(); await P.click('#modal [data-mx=seed]'); await W(); await P.evaluate(()=>document.querySelector('#overlay').hidden=true); }
  // the history file
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#openSettings').click(); if(!document.querySelector('#openImport')){ const d=document.querySelector('#modal [data-spage=data]'); if(d) d.click(); } document.querySelector('#openImport').click(); }); await W(); // 3.0: Settings > Data (3.4: its own page)
  await P.$eval('#histFile',i=>{ i.value=''; }); await (await P.$('#histFile')).uploadFile(file);
  await P.waitForFunction(()=>!!document.querySelector('#modal .imp-prev'),{timeout:20000}); await W(300);
  await P.click('#modal [data-confirmall]').catch(()=>{}); await W();
  await P.click('#modal [data-x=yes]'); await W(1500); await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
}
async function teamView(P){
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=team]').click(); }); await W(700);
}
module.exports={open,load,teamView,roster,seed,FILE,W};
