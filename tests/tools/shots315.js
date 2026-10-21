// 3.15 screenshots (fake names only): the Stopwatches screen in every state (tools/tilestates.js), WebKit at iPhone
// size, regular and compact, light and dark, and a large text size.
//   node tools/shots315.js <before|after> [url]   →   docs/screenshots-stopwatch/<label>-*.png
// "before" runs against the 3.14.0 code (serve the before-3.15.0 tag).
const path=require('path'), fs=require('fs'), TS=require('./tilestates.js');
const label=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/';
const OUT=path.join(__dirname,'..','..','docs','screenshots-stopwatch'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
const b=await TS.webkit.launch();
for(const [compact,dark,text] of [[false,false,17],[false,true,17],[true,false,17],[false,false,23]]){
  const p=await TS.open(b,{url:URL,compact,text}); if(dark) await p.emulateMedia({colorScheme:'dark'});
  await TS.build(p); await TS.W(400);
  const name=`${label}-${compact?'compact':'rows'}${dark?'-dark':''}${text!==17?'-text'+text:''}.png`;
  await p.screenshot({path:path.join(OUT,name),fullPage:true});
  if(p.errs.length) console.log('page errors',p.errs.join(' | '));
  await p.context().close(); }
await b.close(); console.log('saved to',OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
