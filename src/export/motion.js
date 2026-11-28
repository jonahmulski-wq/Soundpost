/* Video motion: zoom and pan amounts (motionPlan), the ease in/out curve (moveAt), and the WebGL drawer for smooth sub-pixel motion (glMover). */
import {pic} from '../pictures.js';

/* ---- Video motion (test V7.4): the zoom/pan is drawn with WebGL so the picture can move by fractions of a pixel.
   iPhone's 2D canvas snaps it to whole pixels, so slow motion moved in visible 1-pixel steps. Returns null if WebGL isn't available. ---- */
/* Motion timing: speed up over the first RAMP part of the clip, hold a steady speed, slow down over the last RAMP part. p and the result run 0 to 1. */
export const RAMP=.25;
/* Motion amounts. Zoom: ZOOM_RATE per second of clip, never past ZOOM_MAX. Pan: side to side over the whole clip, using the photo's hidden sides;
   zoom only as much as needed (at most PAN_ZOOM) to make room, and never faster than one screen width (or height) per PAN_SECS seconds. */
const ZOOM_RATE=.02,ZOOM_MAX=1.5,PAN_ZOOM=1.25,PAN_SECS=7;
/* Returns the end zoom, the pan zoom, and the size of the picture to prepare (bw, bh in frames; s = detail scale). */
export function motionPlan(mo,dur,W,H){const m={z:1,t:0,bw:1,bh:1};
  if(mo==='zin'||mo==='zout')m.z=Math.min(ZOOM_MAX,1+ZOOM_RATE*dur);
  else if(mo!=='still'){const x=mo==='pl'||mo==='pr',a=pic.img?(pic.img.naturalWidth||pic.img.width)/(pic.img.naturalHeight||pic.img.height):W/H,r=Math.max(1,x?a/(W/H):(W/H)/a);
    m.z=Math.max(1,PAN_ZOOM/r);m.t=Math.min(r*m.z-1,dur*(1-RAMP)/PAN_SECS);m[x?'bw':'bh']=(1+m.t)/m.z}
  m.s=Math.min(m.z,4096/Math.max(W*m.bw,H*m.bh));return m}
export const moveAt=p=>{const v=1/(1-RAMP);return p<RAMP?v*p*p/(2*RAMP):p>1-RAMP?1-v*(1-p)*(1-p)/(2*RAMP):v*(p-RAMP/2)};
export function glMover(src,W,H,bw,bh){
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const gl=c.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)return null;
  const sh=(t,code)=>{const x=gl.createShader(t);gl.shaderSource(x,code);gl.compileShader(x);return x},pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 v;uniform sampler2D t;uniform vec4 r;void main(){gl_FragColor=texture2D(t,r.xy+v*r.zw);}'));
  gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(([k,v])=>gl.texParameteri(gl.TEXTURE_2D,k,v));
  const r=gl.getUniformLocation(pr,'r');gl.viewport(0,0,W,H);if(gl.getError())return null;
  return{canvas:c,
    draw(z,fx,fy){const sx=1/(z*bw),sy=1/(z*bh);gl.uniform4f(r,(1-sx)*fx,(1-sy)*fy,sx,sy);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)},  // shows the part of the picture the zoom/pan points at
    free(){const x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext()}}}  // phones allow only a few WebGL canvases, so give it back
