// fixtures for the results importer (fake names). Shapes modeled on real files: a timing company's CSV (UTF-16 with a BOM,
// hh:mm:ss.t times, splits and paces), Hy-Tek text, athletic.net tabs, MileSplit text, one cell per line, Excel, PDF.
const zlib=require('zlib');
const G=[['Ada Fern','Little Chute',1194.6,1],['Bea Holt','Little Chute',1250.9,2],['Cora Lind','Little Chute',1296.1,3],['Dot Marsh','Little Chute',1320.4,4],['Eve Nash','Little Chute',1297.5,5],['Fay Orr','Little Chute',1372.0,6]];
const OTHERS=['Luxemburg-Casco','Winneconne','Notre Dame','Freedom','Waupaca','Chilton','New London','Denmark','Sturgeon Bay','Two Rivers','Seymour','Kiel','Xavier','Wrightstown'];
const FN=['Riley','Quinn','Mara','Tess','Jo','Lena','Kay','Ivy','Nia','Zoe','Ella','Uma','Vera','Wren','Ora','Pia','Gwen','Hope','Isla','June'], LN=['Quinn','Lark','Moss','Vale','Ash','Birch','Cole','Dale','Ember','Frost','Gale','Hart','Iris','Jade','Kane','Lowe','Mills','Nash','Oak','Pike'];
// 60 finishers: ours at places 5, 8, 12, 13, 20, 24; the rest other schools; 4 "Not started"
function field(){ const rows=[]; let p=1, t=1099.3; const ours=[5,8,12,13,20,24]; let oi=0;
  for(let i=0;i<60;i++){ t+=7+((i*37)%11); const isOurs=ours.includes(p); const nm=isOurs?G[oi][0]:`${FN[i%20]} ${LN[(i*7)%20]}`, team=isOurs?'Little Chute':OTHERS[i%OTHERS.length];
    rows.push({pos:p,bib:1700+i*3,name:nm,t:isOurs?G[oi][2]:Math.round(t*10)/10,team,grade:9+(i%4),pts:i<50?i+1:'',m1:Math.round((isOurs?G[oi][2]:t)*0.31*10)/10,m2:Math.round((isOurs?G[oi][2]:t)*0.64*10)/10}); if(isOurs) oi++; p++; }
  rows.sort((a,b)=>a.t-b.t).forEach((r,i)=>{ r.pos=i+1; r.pts=i<50?i+1:''; });
  return rows; }
const hms=s=>{ const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${x<10?'0':''}${x.toFixed(1)}`; };
const mss=s=>{ const m=Math.floor(s/60), x=s%60; return `${m}:${x<10?'0':''}${x.toFixed(1)}`; };
const pace=s=>{ const p=s/3.10686; return `${Math.floor(p/60)}:${String(Math.round(p%60)).padStart(2,'0')} min/m`; };
// 1. the timing company's CSV, UTF-16LE with a BOM (as downloaded)
function timingCsv(){ const R=field(); const head='Pos,Race No,Name,Time,Age Group,Team Points,Gender,Team,Pos In Team,State Qualifier,Pace,One Mile,O/Pos,Two Mile,O/Pos';
  const lines=[head,...R.map(r=>`${r.pos},${r.bib},${r.name},${hms(r.t)},Varsity,${r.pts},Female,${r.team},1,${r.pos<=15?'Team':''},${pace(r.t)},${hms(r.m1)},${r.pos},${hms(r.m2)},${r.pos}`),
    ...[1,2,3,4].map(k=>`,${1900+k},${FN[k]} ${LN[k+3]},Not started,Varsity,,Female,${OTHERS[k]},,,,,,,`)];
  const txt=lines.join('\r\n'); const buf=Buffer.alloc(2+txt.length*2); buf[0]=0xFF; buf[1]=0xFE; for(let i=0;i<txt.length;i++) buf.writeUInt16LE(txt.charCodeAt(i),2+i*2); return {buf,rows:R,text:txt}; }
// 2. the same page copied from the phone: one cell per line (empty cells become empty lines)
function oneCellPerLine(){ const {text}=timingCsv(); return text.split('\r\n').map(l=>l.split(',').join('\n')).join('\n'); }
// 3. athletic.net style: tab-separated with a header, both races and team scores on one page
function athleticTabs(){ const R=field(); return ['Girls 5,000 Meters Varsity','Team Scores','1.\tLittle Chute\t48','2.\tFreedom\t61','','Individual Results','PL\tATHLETE\tGR\tTEAM\tTIME\tPTS',
  ...R.slice(0,40).map(r=>`${r.pos}.\t${r.name}\t${r.grade}\t${r.team}\t${mss(r.t)}${r.pos%7===0?' PR':''}\t${r.pts}`),'','Boys 5,000 Meters Varsity','1.\tAbe Park\t12\tLittle Chute\t17:08.1\t1'].join('\n'); }
// 4. MileSplit style: single spaces, pace column
function mileSplit(){ const R=field(); return ['Girls 5000 Meter Run Varsity Results','Pl Athlete Yr Team Time Pace',...R.slice(0,40).map(r=>`${r.pos} ${r.name} ${r.grade} ${r.team} ${mss(r.t)} ${pace(r.t).replace(' min/m','')}`)].join('\n'); }
// 5. Hy-Tek fixed width
function hytek(){ const R=field(); return ['Girls 5000 Meter Run Varsity','Place Name                    Year School                  Finals  Points',...R.slice(0,40).map(r=>{ const [f,l]=r.name.split(' '); return `${String(r.pos).padStart(3)} ${(l+', '+f).padEnd(26)} ${String(r.grade).padStart(2)} ${r.team.padEnd(22)} ${mss(r.t).padStart(8)}  ${r.pts}`; }),'Team Scores','  1 Little Chute                 48 (avg 21:13.9, total 1:46:09.5)'].join('\n'); }
// 6. a minimal .xlsx (stored zip, inline strings; times as numbers = fractions of a day)
function crc32(buf){ let c, crc=0xFFFFFFFF; for(let n=0;n<buf.length;n++){ c=(crc^buf[n])&0xFF; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; crc=(crc>>>8)^c; } return (crc^0xFFFFFFFF)>>>0; }
function zipStore(files){ const parts=[], cd=[]; let off=0; files.forEach(([name,data])=>{ const nb=Buffer.from(name), db=Buffer.from(data), crc=crc32(db);
    const lh=Buffer.alloc(30); lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0,6); lh.writeUInt16LE(0,8); lh.writeUInt32LE(0,10); lh.writeUInt32LE(crc,14); lh.writeUInt32LE(db.length,18); lh.writeUInt32LE(db.length,22); lh.writeUInt16LE(nb.length,26); lh.writeUInt16LE(0,28);
    const ch=Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(0,8); ch.writeUInt16LE(0,10); ch.writeUInt32LE(0,12); ch.writeUInt32LE(crc,16); ch.writeUInt32LE(db.length,20); ch.writeUInt32LE(db.length,24); ch.writeUInt16LE(nb.length,28); ch.writeUInt16LE(0,30); ch.writeUInt16LE(0,32); ch.writeUInt16LE(0,34); ch.writeUInt16LE(0,36); ch.writeUInt32LE(0,38); ch.writeUInt32LE(off,42);
    parts.push(lh,nb,db); cd.push(ch,nb); off+=lh.length+nb.length+db.length; });
  const cdb=Buffer.concat(cd), e=Buffer.alloc(22); e.writeUInt32LE(0x06054b50,0); e.writeUInt16LE(files.length,8); e.writeUInt16LE(files.length,10); e.writeUInt32LE(cdb.length,12); e.writeUInt32LE(off,16); return Buffer.concat([...parts,cdb,e]); }
function xlsx(){ const R=field(); const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); const col=i=>String.fromCharCode(65+i);
  const row=(cells,ri)=>`<row r="${ri}">${cells.map((c,i)=>typeof c==='number'?`<c r="${col(i)}${ri}"><v>${c}</v></c>`:`<c r="${col(i)}${ri}" t="inlineStr"><is><t>${esc(c)}</t></is></c>`).join('')}</row>`;
  const rows=[row(['Place','Bib','Name','School','Grade','Time'],1),...R.slice(0,30).map((r,i)=>row([r.pos,r.bib,r.name,r.team,r.grade,r.t/86400],i+2))];
  const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`;
  const wb=`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Girls Varsity" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const rels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  return zipStore([['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'],['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',rels],['xl/worksheets/sheet1.xml',sheet]]); }
// 7. PDFs: (a) Flate content, Helvetica, Td lines; (b) hex strings with a ToUnicode CMap (as Chrome prints)
function pdfOf(lines,hex){ const content=['BT','/F1 10 Tf','50 750 Td','12 TL',...lines.map((l,i)=>(i?'T* ':'')+(hex?`<${Buffer.from(l,'latin1').toString('hex')}> Tj`:`(${l.replace(/[()\\]/g,m=>'\\'+m)}) Tj`)),'ET'].join('\n');
  const z=zlib.deflateSync(Buffer.from(content,'latin1'));
  const cmap=`/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /X def 1 begincodespacerange <00> <FF> endcodespacerange 1 beginbfrange <20> <7E> <0020> endbfrange endcmap CMapName currentdict /CMap defineresource pop end end`;
  const objs=[`<< /Type /Catalog /Pages 2 0 R >>`,`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    hex?`<< /Type /Font /Subtype /TrueType /BaseFont /ABCDEF+Arial /ToUnicode 6 0 R >>`:`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,{stream:z,dict:`<< /Length ${z.length} /Filter /FlateDecode >>`}];
  if(hex) objs.push({stream:Buffer.from(cmap),dict:`<< /Length ${cmap.length} >>`});
  const parts=[Buffer.from('%PDF-1.4\n')], offs=[]; let len=parts[0].length;
  objs.forEach((o,i)=>{ offs.push(len); let b; if(typeof o==='string') b=Buffer.from(`${i+1} 0 obj\n${o}\nendobj\n`); else b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n${o.dict}\nstream\n`),o.stream,Buffer.from('\nendstream\nendobj\n')]); parts.push(b); len+=b.length; });
  const xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n${offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`;
  return Buffer.concat([...parts,Buffer.from(xref)]); }
function pdf(hex){ return pdfOf(hytek().split('\n'),hex); }
module.exports={field,timingCsv,oneCellPerLine,athleticTabs,mileSplit,hytek,xlsx,pdf,G};
