/* Small MP4 file writer: one H.264 video track and one AAC (or Opus) track, index at the front. */
/* Small MP4 writer: one H.264 track and one AAC (or Opus) track, interleaved about once a second, index at the front. */
export function mp4(V,Au){
  const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
  const u32=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255],u16=n=>[n>>8&255,n&255],tx=s=>[...s].map(c=>c.charCodeAt(0)),z=n=>new Array(n).fill(0);
  const box=(t,...p)=>{const b=cat(p.map(x=>x instanceof Uint8Array?x:new Uint8Array(x)));return cat([new Uint8Array([...u32(b.length+8),...tx(t)]),b])};
  const full=(t,v,f,...p)=>box(t,[v,f>>16&255,f>>8&255,f&255],...p);
  const MX=[...u32(65536),...z(12),...u32(65536),...z(12),...u32(0x40000000)];
  const stts=d=>{const r=[];d.forEach(x=>{const l=r[r.length-1];if(l&&l[1]===x)l[0]++;else r.push([1,x])});return full('stts',0,0,u32(r.length),...r.map(([c,x])=>[...u32(c),...u32(x)]))};
  // video timing: 90 kHz clock, decode times = presentation times in order (handles reordered frames too)
  const VT=90000,pts=V.s.map(s=>Math.round(s.ts*VT/1e6)),dts=[...pts].sort((a,b)=>a-b),vd=dts.map((t,i)=>i<dts.length-1?dts[i+1]-t:3000),off=pts.map((t,i)=>t-dts[i]);
  const AT=Au.opus?48000:Au.sr,ad=Au.s.map(s=>Au.opus?Math.round((s.dur||20000)*AT/1e6):1024);
  const vDur=vd.reduce((a,b)=>a+b,0),aDur=ad.reduce((a,b)=>a+b,0),mDur=Math.max(vDur/VT,aDur/AT)*1000|0;
  // chunks: one second of video, then the audio for that second
  const ch=[];let vi=0,ai=0,at=0;
  for(let sec=1;vi<V.s.length||ai<Au.s.length;sec++){const t=sec*VT,v0=vi;while(vi<V.s.length&&dts[vi]<t)vi++;if(vi>v0)ch.push({tr:0,a:v0,b:vi});
    const a0=ai;while(ai<Au.s.length&&at<sec*AT){at+=ad[ai];ai++}if(ai>a0)ch.push({tr:1,a:a0,b:ai})}
  const samp=tr=>tr?Au.s:V.s,size=c=>{let n=0;for(let i=c.a;i<c.b;i++)n+=samp(c.tr)[i].d.length;return n};
  const build=base=>{let pos=base;const off2=[[],[]];ch.forEach(c=>{off2[c.tr].push(pos);pos+=size(c)});
    const tch=tr=>ch.filter(c=>c.tr===tr);
    const stbl=(tr,entry,extra)=>{const S=samp(tr),C=tch(tr);
      return box('stbl',full('stsd',0,0,u32(1),entry),stts(tr?ad:vd),...extra,
        full('stsc',0,0,u32(C.length),...C.map((c,i)=>[...u32(i+1),...u32(c.b-c.a),...u32(1)])),
        full('stsz',0,0,u32(0),u32(S.length),...S.map(s=>u32(s.d.length))),
        full('stco',0,0,u32(C.length),...off2[tr].map(u32)))};
    const trak=(id,hd,scale,dur,w,h,minfHead,stb)=>box('trak',
      full('tkhd',0,3,z(8),u32(id),z(4),u32(dur*1000/scale|0),z(8),z(4),u16(id===2?256:0),z(2),MX,u32(w*65536),u32(h*65536)),
      box('mdia',full('mdhd',0,0,z(8),u32(scale),u32(dur),u16(0x55c4),z(2)),
        full('hdlr',0,0,z(4),tx(hd),z(12),tx(hd==='vide'?'VideoHandler':'SoundHandler'),[0]),
        box('minf',minfHead,box('dinf',full('dref',0,0,u32(1),full('url ',0,1))),stb)));
    const keys=[];V.s.forEach((s,i)=>s.key&&keys.push(i+1));const vx=[full('stss',0,0,u32(keys.length),...keys.map(u32))];
    if(off.some(x=>x))vx.push(full('ctts',1,0,u32(off.length),...off.map(o=>[...u32(1),...u32(o)])));
    const avc1=box('avc1',z(6),u16(1),z(16),u16(V.w),u16(V.h),u32(0x480000),u32(0x480000),z(4),u16(1),z(32),u16(24),u16(65535),box('avcC',V.desc));
    let aent;
    if(Au.opus){const pre=Au.desc&&Au.desc.length>=12?Au.desc[10]|Au.desc[11]<<8:312;
      aent=box('Opus',z(6),u16(1),z(8),u16(1),u16(16),z(4),u32(48000*65536),box('dOps',[0,1],u16(pre),u32(Au.sr),z(2),[0]))}
    else{const asc=[...Au.desc],dec=[0x40,0x15,0,0,0,...u32(128000),...u32(128000),5,asc.length,...asc],es=[0,1,0,4,dec.length,...dec,6,1,2];
      aent=box('mp4a',z(6),u16(1),z(8),u16(1),u16(16),z(4),u32(Au.sr*65536),full('esds',0,0,[3,es.length,...es]))}
    return box('moov',full('mvhd',0,0,z(8),u32(1000),u32(mDur),u32(65536),u16(256),z(10),MX,z(24),u32(3)),
      trak(1,'vide',VT,vDur,V.w,V.h,full('vmhd',0,1,z(8)),stbl(0,avc1,vx)),
      trak(2,'soun',AT,aDur,0,0,full('smhd',0,0,z(4)),stbl(1,aent,[])))};
  const ftyp=box('ftyp',tx('isom'),u32(512),tx('isomiso2avc1mp41'));
  let total=0;ch.forEach(c=>total+=size(c));
  const len=build(0).length,moov=build(ftyp.length+len+8),parts=[ftyp,moov,new Uint8Array([...u32(total+8),...tx('mdat')])];
  ch.forEach(c=>{for(let i=c.a;i<c.b;i++)parts.push(samp(c.tr)[i].d)});
  return new Blob(parts,{type:'video/mp4'})}
