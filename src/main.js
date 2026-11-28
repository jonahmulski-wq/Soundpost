/* Entry point: loads the styles, fonts and every part of the app, then wires the shared page controls. */
import './styles.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import './testlog.js';
import './record.js';
import './trim.js';
import './repeat/repeat.js';
import './preview.js';
import './pictures.js';
import './export/video.js';
import {mediaOf} from './catalog.js';
import {touch} from './preview.js';
import {live,raw} from './record.js';
import {draw,drawTrim} from './trim.js';
import {$,msg} from './util.js';

$('wsel').replaceChildren(...mediaOf('sound').map(m=>new Option(m.name,m.id)));  // Background sounds list comes from the catalog
$('vol').addEventListener('input',()=>{const v=+$('vol').value;$('vollab').textContent='Volume: '+(v>0?'+':'')+v+' dB'});
document.querySelectorAll('.fx input,.fx select').forEach(el=>el.addEventListener('input',touch));
document.querySelectorAll('.fxr.acc').forEach(r=>{const c=r.querySelector('input[type=checkbox]'),f=()=>r.classList.toggle('open',c.checked);c.addEventListener('change',f);f()});
function fitBig(){const e=document.querySelector('.sec.big');let f=24;e.style.fontSize=f+'px';while(e.scrollWidth>e.clientWidth&&f>10){f-=.25;e.style.fontSize=f+'px'}}
fitBig();if(document.fonts)document.fonts.ready.then(fitBig);
addEventListener('resize',()=>{fitBig();if(raw&&!live)drawTrim();else draw(null)});
addEventListener('error',e=>msg('Error: '+e.message));
draw(null);
