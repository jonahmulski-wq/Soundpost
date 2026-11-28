/* Make Video: WebCodecs encoding into MP4 (wcMake) with an audio check, the older real-time recorder as fallback (recMake), Share and Download Video. */
import {media} from '../catalog.js';
import {RAMP,glMover,motionPlan,moveAt} from './motion.js';
import {mp4} from './mp4-writer.js';
import {paint,pic,vname} from '../pictures.js';
import {out,prep,stopPlay} from '../preview.js';
import {logIt,snapAudio} from '../testlog.js';
import {$,AC,TEST,newId,r1,save,vm} from '../util.js';

export let vinfo=null;
export let vblob=null,vext='mp4';
/* ---- Video, WebCodecs way (test V7.2): every frame is drawn at its exact time and encoded,
   faster than real time, then packed into an MP4 here. If anything is missing or fails,
   the old way (captureStream + MediaRecorder, below) makes the video instead. ---- */
const u8=b=>b instanceof ArrayBuffer?new Uint8Array(b.slice(0)):new Uint8Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
async function wcPick(W,H,sr){
  if(!window.VideoEncoder||!window.AudioEncoder||!window.VideoFrame||!window.AudioData)return{why:'No WebCodecs'};
  let v=null,a=null;
  for(const codec of ['avc1.42E01F','avc1.42001F','avc1.4D401F','avc1.640028']){const c={codec,width:W,height:H,bitrate:2500000,framerate:30,avc:{format:'avc'}};
    try{if((await VideoEncoder.isConfigSupported(c)).supported){v=c;break}}catch(e){}}
  if(!v)return{why:'No H.264 encoder'};
  const acs=['mp4a.40.2'];if(TEST&&/[?&]opus\b/.test(location.search))acs.push('opus');  // ?opus is only for checking the code in a browser without AAC
  for(const codec of acs){const c={codec,sampleRate:sr,numberOfChannels:1,bitrate:128000};
    try{if((await AudioEncoder.isConfigSupported(c)).supported){a=c;break}}catch(e){}}
  if(!a)return{why:'No AAC encoder'};return{v,a}}
let wcDiag=null;
async function wcMake(cfg,cv,view,bar,dur,say){
  wcDiag=null;
  const sr=out.sr,N=Math.max(1,Math.ceil(dur*30)),vs=[],as=[];let vdesc=null,adesc=null,err=null,tEnc=performance.now();
  const ve=new VideoEncoder({output:(c,md)=>{if(md&&md.decoderConfig&&md.decoderConfig.description)vdesc=u8(md.decoderConfig.description);const d=new Uint8Array(c.byteLength);c.copyTo(d);vs.push({d,ts:c.timestamp,key:c.type==='key'})},error:e=>err=e});
  let adts=0;const ae=new AudioEncoder({output:(c,md)=>{if(md&&md.decoderConfig&&md.decoderConfig.description)adesc=u8(md.decoderConfig.description);let d=new Uint8Array(c.byteLength);c.copyTo(d);
    if(d.length>7&&d[0]===255&&(d[1]&246)===240){const h=d[1]&1?7:9;d=d.slice(h);adts++}as.push({d,ts:c.timestamp,dur:c.duration})},error:e=>err=e});
  try{ve.configure(cfg.v);ae.configure(cfg.a);
    const A=out.data;for(let i=0;i<A.length;i+=sr){const n=Math.min(sr,A.length-i);
      const ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:1,timestamp:Math.round(i*1e6/sr),data:A.slice(i,i+n)});ae.encode(ad);ad.close()}
    const flushA=ae.flush();
    for(let i=0;i<N;i++){if(err)throw err;const p=Math.min(1,i/30/dur);view(p);bar(p);
      const f=new VideoFrame(cv,{timestamp:Math.round(i*1e6/30),duration:Math.round(1e6/30)});ve.encode(f,{keyFrame:i%60===0});f.close();
      while(ve.encodeQueueSize>4&&!err)await new Promise(r=>setTimeout(r,2));
      if(i%15===0){say('Making your video… '+Math.round(i/N*100)+'%. Keep this screen open.');await new Promise(r=>setTimeout(r,0))}}
    await ve.flush();await flushA;if(err)throw err}
  finally{try{ve.close()}catch(e){}try{ae.close()}catch(e){}}
  if(!vdesc)throw new Error('no H.264 setup data');if(!vs.length||!as.length)throw new Error('encoder gave no data');
  const opus=cfg.a.codec==='opus';
  const hex=b=>b?[...b.slice(0,12)].map(x=>x.toString(16).padStart(2,'0')).join(' ')+(b.length>12?' …('+b.length+')':''):'none';
  const aInfo=wcDiag={'AAC Setup':opus?'':hex(adesc)+(adts?' | ADTS stripped':''),'Audio Chunks':as.length};
  let asc=adesc;
  if(!opus){// AAC-LC mono: write the 2-byte setup ourselves (some encoders hand back other data here)
    const fi=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000].indexOf(sr);if(fi<0)throw new Error('odd sample rate');asc=new Uint8Array([16|fi>>1,(fi&1)<<7|8])}
  const aDur=as.length*(opus?0.02:1024/sr);if(aDur<dur*0.9)throw new Error('audio too short ('+r1(aDur)+' of '+r1(dur)+' s)');
  if(!opus)await audioCheck(as,sr,asc);aInfo['Audio Check']='OK';
  const blob=mp4({w:cv.width,h:cv.height,desc:vdesc,s:vs},{sr,opus,desc:asc,s:as});
  return{blob,method:'WebCodecs',fmt:'video/mp4;codecs='+cfg.v.codec+','+cfg.a.codec,nf:N,late:'',gap:'',enc:r1((performance.now()-tEnc)/1000),aInfo}}
/* Decode the first second of AAC with the exact setup going into the file; if it won't decode, use the old way instead of making a silent video. */
async function audioCheck(as,sr,asc){
  if(!window.AudioDecoder)return;const cfg={codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:1,description:asc};
  try{if(!(await AudioDecoder.isConfigSupported(cfg)).supported)return}catch(e){return}
  let got=0,bad=null;const dec=new AudioDecoder({output:a=>{got+=a.numberOfFrames;a.close()},error:e=>bad=e});
  try{dec.configure(cfg);let t=0;for(const c of as.slice(0,45)){dec.decode(new EncodedAudioChunk({type:'key',timestamp:Math.round(t*1e6/sr),data:c.d}));t+=1024}await dec.flush()}
  catch(e){bad=bad||e}finally{try{dec.close()}catch(e){}}
  if(bad||!got)throw new Error('audio check failed: '+(bad?(bad.message||bad.name):'no sound decoded'))}
/* ---- Video, old way (fallback): the canvas is filmed in real time while the sound plays. ---- */
async function recMake(cv,g,view,bar,W,H,dur){
  const c=AC(),dest=c.createMediaStreamDestination(),b=c.createBuffer(1,out.data.length,out.sr);b.copyToChannel(out.data,0);
  const src=c.createBufferSource();src.buffer=b;src.connect(dest);view(0);
  const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'],mt=types.find(t=>MediaRecorder.isTypeSupported(t))||'';
  const ms=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]),
    mr=new MediaRecorder(ms,mt?{mimeType:mt,videoBitsPerSecond:2500000,audioBitsPerSecond:128000}:{}),parts=[];
  mr.ondataavailable=e=>e.data.size&&parts.push(e.data);
  const done=new Promise(r=>{mr.onstop=r}),t0=performance.now();let run=true,nf=0,late=0,gap=0,lt=0;
  const fr=()=>{if(!run)return;const now=performance.now();if(lt){const dt=now-lt;if(dt>50)late++;if(dt>gap)gap=dt}lt=now;nf++;const p=Math.min(1,(performance.now()-t0)/1000/dur);view(p);bar(p);
    vm('Making your video… '+Math.round(p*100)+'%. Keep this screen open.');requestAnimationFrame(fr)};
  mr.start(250);src.start();fr();src.onended=()=>setTimeout(()=>{run=false;mr.stop()},300);
  await done;
  const type=(mr.mimeType||mt||'video/webm').split(';')[0];
  return{blob:new Blob(parts,{type}),method:'Recorder',fmt:mr.mimeType||mt||type,nf,late,gap:Math.round(gap),enc:''}}
$('vmake').onclick=async()=>{
  const tMake=performance.now();if(!await prep(vm))return;
  const recOK=!!(window.MediaRecorder&&HTMLCanvasElement.prototype.captureStream);
  if(!window.VideoEncoder&&!recOK){vm('This browser can’t make video here.');return}
  stopPlay();$('vmake').disabled=true;$('vshare').disabled=true;$('vdl').disabled=true;vblob=null;vinfo=null;
  const vid=newId(),tx=id=>$(id).selectedOptions[0].text;
  const vset={...snapAudio(out.st),'Picture':pic.img?'Uploaded photo':media(pic.kind).name,'Photo Pixels':pic.img?pic.px:'','Photo KB':pic.img?pic.kb:'','Shape':tx('vshape'),'Motion':tx('vmotion'),'Motion Speed':'Auto','Motion Ramp %':RAMP*100};
  $('vmsg').hidden=false;$('vmsg').scrollIntoView({behavior:'smooth',block:'center'});
  let mv=null;
  try{const tall=$('vshape').value==='tall',W=tall?540:720,H=tall?960:720,cv=document.createElement('canvas'),bg=document.createElement('canvas');
    const mo=$('vmotion').value,dur=out.data.length/out.sr,m=motionPlan(mo,dur,W,H),Z=m.z,BW=Math.round(W*m.bw*m.s),BH=Math.round(H*m.bh*m.s);
    cv.width=W;cv.height=H;bg.width=BW;bg.height=BH;const g=cv.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';paint(bg.getContext('2d'),BW,BH);
    try{mv=glMover(bg,W,H,m.bw,m.bh)}catch(e){mv=null}
    const view=p=>{const e=moveAt(p);let z=1,fx=.5,fy=.5;
      if(mo==='zin')z=1+(Z-1)*e;else if(mo==='zout')z=Z-(Z-1)*e;else if(mo!=='still'){z=Z;if(mo==='pr')fx=e;else if(mo==='pl')fx=1-e;else if(mo==='pd')fy=e;else fy=1-e}
      if(mv){mv.draw(z,fx,fy);g.drawImage(mv.canvas,0,0)}else{const dw=W*z*m.bw,dh=H*z*m.bh;g.drawImage(bg,-(dw-W)*fx,-(dh-H)*fy,dw,dh)}
      if(TEST){g.save();g.font='600 '+Math.round(W/40)+'px system-ui,sans-serif';g.textAlign='right';g.textBaseline='top';g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.45)';g.fillStyle='rgba(255,255,255,.8)';g.strokeText(vid,W-12,12);g.fillText(vid,W-12,12);g.restore()}};
    const bar=p=>{g.fillStyle='rgba(255,255,255,.85)';g.fillRect(0,H-8,W*p,8)};
    let res=null,why='';
    try{const cfg=await wcPick(W,H,out.sr);if(cfg.why)why=cfg.why;else res=await wcMake(cfg,cv,view,bar,dur,vm)}
    catch(e){why='WebCodecs error: '+(e.message||e.name||'unknown');res=null}
    const aInfo=res&&res.aInfo||wcDiag||{};
    if(!res){if(!recOK)throw new Error(why);res=await recMake(cv,g,view,bar,W,H,dur)}
    vext=res.blob.type.includes('mp4')?'mp4':'webm';vblob=res.blob;
    vinfo={ID:vid,...vset,'Video Method':res.method,'Fallback Reason':why,'Video Format':res.fmt,'Make Video s':r1((performance.now()-tMake)/1000),'Encode s':res.enc,'Motion Draw':mv?'WebGL':'Canvas','Motion Zoom':Math.round(Z*100)/100,'Pan Travel %':m.t?Math.round(m.t*100):'',...aInfo,
      'Frames Planned':Math.round(dur*30),'Frames Drawn':res.nf,'Late Frames':res.late,'Longest Pause ms':res.gap};
    const old=$('vplayer').src;$('vplayer').src=URL.createObjectURL(vblob);$('vplayer').hidden=false;if(old)URL.revokeObjectURL(old);
    $('vshare').disabled=false;$('vdl').disabled=false;
    setTimeout(()=>$('vplayer').scrollIntoView({behavior:'smooth',block:'center'}),100);
    vm(vext==='mp4'?'Your video is ready. Tap Share Video.':'Your video is ready, but this browser made a WebM file. Instagram usually needs MP4, so try Chrome on a newer phone or Safari on iPhone.')}
  catch(e){vm('Couldn’t make the video ('+(e.message||e.name||'error')+').')}
  if(mv)mv.free();
  $('vmake').disabled=false};
$('vshare').onclick=async()=>{if(!vblob)return;const f=new File([vblob],vname(),{type:vblob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{logIt('Share','Video',vinfo,vblob);await navigator.share({files:[f],title:'My Soundpost recording'});return}catch(e){if(e.name==='AbortError')return}}
  vm('The share sheet isn’t available here. Use Download Video instead.')};

$('vdl').onclick=()=>{if(vblob){logIt('Download','Video',vinfo,vblob);save(vblob,vname())}};
