/* Mustang Splits spreadsheet writer (3.19): builds a formatted .xlsx (Office Open XML) with no library, so the coach's
 * workbook works offline. Loaded before app.js as window.MSXlsx. Only what the workbook needs: shared strings, number
 * formats, fonts, fills, borders, alignment, column widths, frozen panes, filters, merged cells, conditional formats
 * (colour scales and formulas), formulas with their cached values, and Excel sparklines (x14). The zip is deflated with
 * the browser's CompressionStream when it has one, stored otherwise (both open everywhere).
 *
 * MSXlsx.build({title, styles, dxfs, sheets}) → Promise<Blob>
 *   styles: {name: {fmt, b, i, sz, color, fill, h, v, wrap, border:'bottom'|'all'|'top', indent}}  (colours 'RRGGBB')
 *   dxfs:   {name: {fill, color, b}}   (conditional formats)
 *   sheet:  {name, rows:[[cell…]…], cols:[width…], heights:{row:pt}, freeze:{r, c}, filter:'A1:N40', merges:['A1:D1'],
 *            cf:[{ref, scale:[[type, val, 'RRGGBB']…]} | {ref, expr, dxf}], spark:[{src:'C2:F2', at:'G2'}], tab:'RRGGBB',
 *            landscape:true}
 *   cell:   null | string | number | {v, s, f}  (v: string or number; s: a style name; f: a formula without '=')
 * MSXlsx.time(seconds), MSXlsx.date('YYYY-MM-DD') turn times and dates into spreadsheet serial numbers;
 * MSXlsx.col(i) is the column letter (0 = A); MSXlsx.ref(r, c) a cell reference (0-based). */
(function(){
'use strict';
const col=i=>{ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
const ref=(r,c)=>col(c)+(r+1);
const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const time=sec=>sec/86400;
const date=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||''); return m?(Date.UTC(+m[1],+m[2]-1,+m[3])-Date.UTC(1899,11,30))/864e5:null; };
const qName=n=>`'${String(n).replace(/'/g,"''")}'`;
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main', RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const HEAD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// styles.xml from named styles: fonts, fills, borders and number formats are shared, one cellXf per style
function stylesXml(styles,dxfs){
  const fmts=[], fonts=['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'],
    fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'], borders=['<border><left/><right/><top/><bottom/><diagonal/></border>'],
    xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], idx={};
  const BUILTIN={'General':0,'0':1,'0.00':2,'#,##0':3,'0%':9,'0.0%':10};
  const pick=(L,x)=>{ let i=L.indexOf(x); if(i<0){ L.push(x); i=L.length-1; } return i; };
  const line=k=>`<${k} style="thin"><color rgb="FFB7C3D0"/></${k}>`;
  Object.entries(styles||{}).forEach(([name,o])=>{
    let fid=0; if(o.fmt){ fid=BUILTIN[o.fmt]; if(fid==null){ const j=fmts.findIndex(f=>f===o.fmt); fid=164+(j<0?fmts.push(o.fmt)-1:j); } }
    const font=`<font>${o.b?'<b/>':''}${o.i?'<i/>':''}<sz val="${o.sz||11}"/>${o.color?`<color rgb="FF${o.color}"/>`:'<color theme="1"/>'}<name val="Calibri"/><family val="2"/>${o.color?'':'<scheme val="minor"/>'}</font>`;
    const fo=pick(fonts,font), fi=o.fill?pick(fills,`<fill><patternFill patternType="solid"><fgColor rgb="FF${o.fill}"/><bgColor indexed="64"/></patternFill></fill>`):0;
    const bo=!o.border?0:pick(borders,o.border==='all'?`<border>${line('left')}${line('right')}${line('top')}${line('bottom')}<diagonal/></border>`:o.border==='top'?`<border><left/><right/>${line('top')}<bottom/><diagonal/></border>`:`<border><left/><right/><top/>${line('bottom')}<diagonal/></border>`);
    const al=o.h||o.v||o.wrap||o.indent?`<alignment${o.h?` horizontal="${o.h}"`:''}${o.v?` vertical="${o.v}"`:''}${o.wrap?' wrapText="1"':''}${o.indent?` indent="${o.indent}"`:''}/>`:'';
    xfs.push(`<xf numFmtId="${fid}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0"${fid?' applyNumberFormat="1"':''}${fo?' applyFont="1"':''}${fi?' applyFill="1"':''}${bo?' applyBorder="1"':''}${al?' applyAlignment="1">'+al+'</xf>':'/>'}`);
    idx[name]=xfs.length-1; });
  const dx=[], didx={}; Object.entries(dxfs||{}).forEach(([name,o])=>{ dx.push(`<dxf>${o.color||o.b?`<font>${o.b?'<b/>':''}${o.color?`<color rgb="FF${o.color}"/>`:''}</font>`:''}${o.fill?`<fill><patternFill patternType="solid"><bgColor rgb="FF${o.fill}"/></patternFill></fill>`:''}</dxf>`); didx[name]=dx.length-1; });
  const xml=HEAD+`<styleSheet xmlns="${NS}">`+(fmts.length?`<numFmts count="${fmts.length}">${fmts.map((f,i)=>`<numFmt numFmtId="${164+i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>`:'')
    +`<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>`
    +`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`
    +`<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${dx.length}">${dx.join('')}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  return {xml,idx,didx}; }

function sheetXml(sh,n,S,sst,first){
  const rows=sh.rows||[], maxC=Math.max(1,...rows.map(r=>(r||[]).length)), dim=`A1:${ref(Math.max(rows.length,1)-1,maxC-1)}`;
  const fr=sh.freeze||null, pane=!fr||(!fr.r&&!fr.c)?'':(()=>{ const tl=ref(fr.r||0,fr.c||0), ap=fr.r&&fr.c?'bottomRight':fr.r?'bottomLeft':'topRight';
    return `<pane${fr.c?` xSplit="${fr.c}"`:''}${fr.r?` ySplit="${fr.r}"`:''} topLeftCell="${tl}" activePane="${ap}" state="frozen"/><selection pane="${ap}" activeCell="${tl}" sqref="${tl}"/>`; })();
  const cols=(sh.cols||[]).length?`<cols>${sh.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:'';
  const body=rows.map((r,ri)=>{ const ht=(sh.heights||{})[ri]; const cells=(r||[]).map((c,ci)=>{ if(c==null||c==='') return '';
      const o=typeof c==='object'?c:{v:c}, s=o.s!=null&&S.idx[o.s]!=null?` s="${S.idx[o.s]}"`:'', R=ref(ri,ci);
      if(o.f){ const v=o.v; if(typeof v==='number'&&isFinite(v)) return `<c r="${R}"${s}><f>${esc(o.f)}</f><v>${v}</v></c>`;
        return `<c r="${R}"${s} t="str"><f>${esc(o.f)}</f><v>${esc(v==null?'':v)}</v></c>`; }
      if(o.v==null||o.v==='') return s?`<c r="${R}"${s}/>`:'';
      if(typeof o.v==='number') return isFinite(o.v)?`<c r="${R}"${s}><v>${o.v}</v></c>`:'';
      return `<c r="${R}"${s} t="s"><v>${sst(String(o.v))}</v></c>`; }).join('');
    return `<row r="${ri+1}"${ht?` ht="${ht}" customHeight="1"`:''}>${cells}</row>`; }).join('');
  let pri=1; const cf=(sh.cf||[]).map(x=>{ if(x.scale) return `<conditionalFormatting sqref="${x.ref}"><cfRule type="colorScale" priority="${pri++}"><colorScale>${x.scale.map(([t,v])=>`<cfvo type="${t}"${v!=null?` val="${v}"`:''}/>`).join('')}${x.scale.map(([,,c])=>`<color rgb="FF${c}"/>`).join('')}</colorScale></cfRule></conditionalFormatting>`;
    return `<conditionalFormatting sqref="${x.ref}"><cfRule type="expression" dxfId="${S.didx[x.dxf]}" priority="${pri++}"><formula>${esc(x.expr)}</formula></cfRule></conditionalFormatting>`; }).join('');
  const spark=(sh.spark||[]).length?`<extLst><ext uri="{05C60535-1F16-4fd2-B633-F4F36F0B64E0}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:sparklineGroups xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><x14:sparklineGroup displayEmptyCellsAs="gap" markers="1" lineWeight="1.5"><x14:colorSeries rgb="FF13294B"/><x14:colorNegative rgb="FFB8247F"/><x14:colorAxis rgb="FF000000"/><x14:colorMarkers rgb="FF4B9CD3"/><x14:colorFirst rgb="FF4B9CD3"/><x14:colorLast rgb="FF13294B"/><x14:colorHigh rgb="FF4B9CD3"/><x14:colorLow rgb="FF4B9CD3"/><x14:sparklines>${sh.spark.map(p=>`<x14:sparkline><xm:f>${esc(qName(sh.name))}!${p.src}</xm:f><xm:sqref>${p.at}</xm:sqref></x14:sparkline>`).join('')}</x14:sparklines></x14:sparklineGroup></x14:sparklineGroups></ext></extLst>`:'';
  return HEAD+`<worksheet xmlns="${NS}" xmlns:r="${RNS}"><sheetPr>${sh.tab?`<tabColor rgb="FF${sh.tab}"/>`:''}<pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="${dim}"/>`
    +`<sheetViews><sheetView${first?' tabSelected="1"':''} workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData>`
    +(sh.filter?`<autoFilter ref="${sh.filter}"/>`:'')+((sh.merges||[]).length?`<mergeCells count="${sh.merges.length}">${sh.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`:'')+cf
    +`<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="${sh.landscape===false?'portrait':'landscape'}" fitToWidth="1" fitToHeight="0"/>${spark}</worksheet>`; }

// a zip of the parts: deflated (CompressionStream 'deflate-raw') when the browser can, else stored
let CRC=null; const crc32=u=>{ if(!CRC){ CRC=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; CRC[n]=c>>>0; } }
  let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC[(c^u[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
async function deflate(u){ try{ if(typeof CompressionStream!=='function') return null; const cs=new CompressionStream('deflate-raw'), w=cs.writable.getWriter(); w.write(u); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }catch(e){ return null; } }
async function zip(files,when){ const enc=new TextEncoder(), parts=[], cd=[]; let off=0; const d=when||new Date();
  const dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const [name,text] of files){ const raw=enc.encode(text), nm=enc.encode(name), crc=crc32(raw), z=await deflate(raw), use=z&&z.length<raw.length, data=use?z:raw, m=use?8:0;
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,m,true); h.setUint16(10,dt,true); h.setUint16(12,dd,true);
    h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,raw.length,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,data);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,m,true); c.setUint16(12,dt,true); c.setUint16(14,dd,true);
    c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,raw.length,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    cd.push(new Uint8Array(c.buffer),nm); off+=30+nm.length+data.length; }
  const cdLen=cd.reduce((s,u)=>s+u.length,0), e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cdLen,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }

async function build(o){
  const S=stylesXml(o.styles,o.dxfs), strs=[], sidx=new Map(); let count=0;
  const sst=s=>{ count++; let i=sidx.get(s); if(i==null){ i=strs.length; strs.push(s); sidx.set(s,i); } return i; };
  const sheets=o.sheets.map((sh,i)=>sheetXml(sh,i,S,sst,i===0));
  const names=o.sheets.map(s=>s.name), when=o.when||new Date(), iso=when.toISOString().replace(/\.\d+Z$/,'Z');
  const defs=o.sheets.map((s,i)=>s.filter?`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(qName(s.name))}!${s.filter.split(':').map(x=>x.replace(/^([A-Z]+)(\d+)$/,'$$$1$$$2')).join(':')}</definedName>`:'').join('');
  const files=[
    ['[Content_Types].xml',HEAD+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
    ['_rels/.rels',HEAD+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
    ['docProps/core.xml',HEAD+`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(o.title||'Workbook')}</dc:title><dc:creator>Mustang Splits</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`],
    ['docProps/app.xml',HEAD+`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Mustang Splits</Application></Properties>`],
    ['xl/workbook.xml',HEAD+`<workbook xmlns="${NS}" xmlns:r="${RNS}"><workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n,i)=>`<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets>${defs?`<definedNames>${defs}</definedNames>`:''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels',HEAD+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${names.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${names.length+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
    ['xl/styles.xml',S.xml],
    ...sheets.map((x,i)=>[`xl/worksheets/sheet${i+1}.xml`,x])];
  files.push(['xl/sharedStrings.xml',HEAD+`<sst xmlns="${NS}" count="${count}" uniqueCount="${strs.length}">${strs.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`]);
  const blob=await zip(files,when); blob.parts=files.map(f=>f[0]); return blob; }
window.MSXlsx={build,time,date,col,ref,zip,crc32};
})();
