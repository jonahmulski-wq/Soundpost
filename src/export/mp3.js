/* Audio files: MP3 encoding with lamejs (WAV if it fails) and the ID3 title tag. */
export function id3(b,title){if(b.type!=='audio/mpeg')return b;const t=[...title].map(c=>c.charCodeAt(0)&255),fs=t.length+1,ts=10+fs,h=new Uint8Array(10+ts);
  h.set([73,68,51,3,0,0,(ts>>21)&127,(ts>>14)&127,(ts>>7)&127,ts&127]);h.set([84,73,84,50,(fs>>>24)&255,(fs>>16)&255,(fs>>8)&255,fs&255,0,0,0],10);h.set(t,21);
  return new Blob([h,b],{type:b.type})}
function wav(y,sr){const b=new ArrayBuffer(44+y.length*2),v=new DataView(b),s=(o,t)=>[...t].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  s(0,'RIFF');v.setUint32(4,36+y.length*2,true);s(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,y.length*2,true);
  for(let i=0;i<y.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,y[i]))*32767,true);return new Blob([b],{type:'audio/wav'})}
export function mp3(y,sr){if(!window.lamejs)return wav(y,sr);
  try{const enc=new lamejs.Mp3Encoder(1,sr,128),p=new Int16Array(y.length),parts=[];
    for(let i=0;i<y.length;i++)p[i]=Math.max(-1,Math.min(1,y[i]))*32767;
    for(let i=0;i<p.length;i+=1152){const c=enc.encodeBuffer(p.subarray(i,i+1152));if(c.length)parts.push(c)}
    const e=enc.flush();if(e.length)parts.push(e);return new Blob(parts,{type:'audio/mpeg'})}catch(e){return wav(y,sr)}}
