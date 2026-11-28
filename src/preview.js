/* Preview and audio sharing: builds the MP3 when settings change (ready/prep), the player and its red play line, Share MP3 and Download MP3. */
import {render} from './effects.js';
import {id3,mp3} from './export/mp3.js';
import {live,raw} from './record.js';
import {RP,repNote,repShow} from './repeat/repeat.js';
import {logIt,snapAudio} from './testlog.js';
import {T,draw,drawTrim,hearStop,tDur} from './trim.js';
import {$,TEST,msg,newId,save} from './util.js';

export let out=null,blob=null,dirty=true;
export function setPrev(v){$('prev').disabled=v;$('prev2').disabled=v}
let blobInfo=null;
const aname=()=>'Soundpost'+(TEST&&blobInfo?' '+blobInfo.ID:'')+'.'+(blob.type==='audio/mpeg'?'mp3':'wav');

export function stopPlay(){if(T.src)hearStop();const p=$('player');try{p.pause();p.currentTime=0}catch(e){}$('stop').disabled=true;$('stop2').disabled=true}
function canStop(v){$('stop').disabled=!v;$('stop2').disabled=!v}
let busy=false;
const playMsg=()=>msg(blob.type==='audio/mpeg'?'Playing… Ready to share it? Scroll down to “Share Soundpost audio or video.”':'Playing… MP3 encoder didn’t load. Download a .wav file.');
$('player').addEventListener('play',async()=>{const p=$('player');canStop(true);
  if(dirty&&raw&&!busy){busy=true;p.pause();msg('Applying effects…');try{await ready();p.currentTime=0;await p.play();playMsg()}catch(e){msg('Something went wrong applying effects. Try again, or try a shorter clip.')}busy=false}});
$('player').addEventListener('ended',()=>{if(!busy)stopPlay()});
/* red line in the trim box follows Preview playback (maps output time back to the kept part of the recording) */
let pvRaf=0;
function pvLoop(){const p=$('player');if(p.paused||p.ended||!raw||live){pvEnd();return}
  const du=tDur(),a=du*$('ts').value/1000,K=du*($('te').value-$('ts').value)/1000;let t=p.currentTime;
  if($('rep').checked&&RP.plan){const P=RP.plan.P;t-=P*Math.min(+$('reps').value-1,Math.floor(t/P));T.play=a+Math.min(RP.plan.len,t)}
  else T.play=a+Math.min(K,t);drawTrim();pvRaf=requestAnimationFrame(pvLoop)}
function pvEnd(){cancelAnimationFrame(pvRaf);pvRaf=0;if(T.src)return;T.play=null;if(raw&&!live)drawTrim()}
$('player').addEventListener('playing',()=>{if(!pvRaf&&raw&&!live&&!T.src)pvRaf=requestAnimationFrame(pvLoop)});
$('player').addEventListener('pause',pvEnd);$('player').addEventListener('ended',pvEnd);
const kind=()=>blob&&blob.type!=='audio/mpeg'?'WAV':'MP3';
async function ready(){if(!raw)return false;if(blob&&!dirty&&out)return true;
  out=await render();repNote();if(!raw)draw(out.data);blob=mp3(out.data,out.sr);
  if(TEST){blobInfo={ID:newId(),...snapAudio(out.st)};blob=id3(blob,'Soundpost '+blobInfo.ID)}
  $('share').textContent='Share '+kind();$('dl').textContent='Download '+kind();
  const old=$('player').src;$('player').src=URL.createObjectURL(blob);$('player').hidden=false;if(old)URL.revokeObjectURL(old);
  dirty=false;return true}
$('prev').onclick=async()=>{stopPlay();setPrev(true);msg('Applying effects…');
  try{await ready();
    const p=$('player');p.currentTime=0;await p.play();
    canStop(true);$('share').disabled=false;$('dl').disabled=false;
    playMsg()}
  catch(e){msg('Something went wrong applying effects. Try again, or try a shorter clip.')}
  setPrev(false)};
$('prev2').onclick=()=>$('prev').click();
$('stop').onclick=stopPlay;$('stop2').onclick=stopPlay;

export async function prep(say){if(!raw){say('Record or choose a clip first.');return false}
  if(blob&&!dirty)return true;say('Getting your sound ready…');
  try{return await ready()}catch(e){say('Something went wrong applying effects. Try again, or try a shorter clip.');return false}}
$('share').onclick=async()=>{const had=blob&&!dirty;if(!await prep(msg))return;
  const f=new File([blob],aname(),{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){
    try{logIt('Share',kind(),blobInfo,blob);await navigator.share({files:[f],title:'My Soundpost recording'});return}catch(e){if(e.name==='AbortError')return;if(!had){msg('Your '+kind()+' is ready. Tap Share '+kind()+' again.');return}}}
  msg('The share sheet isn’t available here. Use Download '+kind()+' instead.')};

export function touch(){dirty=true;if(RP.note){RP.note='';repShow()}$('vshare').disabled=true;$('vdl').disabled=true}
$('dl').onclick=async()=>{if(!await prep(msg))return;logIt('Download',kind(),blobInfo,blob);save(blob,aname())};
