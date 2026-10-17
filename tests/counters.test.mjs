import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../counters.js',import.meta.url),'utf8');
const settled=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
const configs=[['tt-followers','/api/followers','elbellocubano7','tiktok',45771],['ig-followers','/api/instagram','elbellocubano','count',4692],['fb-followers','/api/facebook','elbellocubano','count',17758],['yt-subscribers','/api/youtube','UCVvsVVbc0W8KIL1kRkIqWxQ','count',38]];
function good(config,count=config[4],extra={}){return Response.json({consulta_ok:true,cuenta:config[2],[config[3]]:count,fuente:'Fuente de prueba',updated_at:'2026-10-16T17:00:00Z',...extra});}
function harness({reduced=true,hidden=false,protocol='https:',ready=true}={}){
 const queues=new Map(configs.map(c=>[c[1],[]])),calls=[],intervals=[],timeouts=new Map(),frames=new Map(),events={},windowEvents={},nodes={};let serial=0;
 for(const c of configs)nodes[c[0]]={textContent:'…',title:'',dataset:{state:'loading'}};
 const attrs={},poster={dataset:{ready:ready?'true':'false'}};
 const document={hidden,getElementById:id=>id==='poster'?poster:nodes[id],querySelector:selector=>({setAttribute(k,v){(attrs[selector]??={})[k]=v}}),addEventListener:(name,fn)=>events[name]=fn};
 const window={matchMedia:()=>({matches:reduced}),addEventListener:(name,fn)=>windowEvents[name]=fn};
 const fetch=async(url,options)=>{calls.push({url,options});const value=queues.get(url).shift();if(typeof value==='function')return value(options);if(value instanceof Error)throw value;return value??good(configs.find(c=>c[1]===url))};
 const context={document,window,location:{protocol},fetch,Intl,Date,Number,Math,AbortController,performance:{now:()=>0},setInterval:(fn,ms)=>intervals.push({fn,ms}),setTimeout:(fn,ms)=>{const id=++serial;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
 return {nodes,attrs,poster,document,calls,intervals,timeouts,frames,queues,events,windowEvents,start:()=>vm.runInNewContext(code,context),frame(time){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))}};
}
test('consulta las cuatro cuentas correctas y YouTube se anuncia como suscriptores',async()=>{
 const h=harness();h.start();await settled();assert.deepEqual(h.calls.map(x=>x.url),configs.map(x=>x[1]));assert.equal(h.nodes['tt-followers'].textContent,'45,771');assert.equal(h.nodes['ig-followers'].textContent,'4,692');assert.equal(h.nodes['fb-followers'].textContent,'17,758');assert.equal(h.nodes['yt-subscribers'].textContent,'38');assert.equal(h.intervals[0].ms,5000);assert.match(h.attrs['[data-social="YouTube"]']['aria-label'],/38 suscriptores/);assert.equal(h.timeouts.size,0);
});
test('los cuatro números animan desde cero, llegan al dato y animan cambios posteriores',async()=>{
 const h=harness({reduced:false});h.start();await settled();assert.equal(h.frames.size,4);for(const c of configs)assert.equal(h.nodes[c[0]].textContent,'0');h.frame(1100);for(const c of configs){const n=Number(h.nodes[c[0]].textContent.replaceAll(',',''));assert.ok(n>0&&n<c[4]);}h.frame(2200);for(const c of configs)assert.equal(h.nodes[c[0]].textContent,new Intl.NumberFormat('en-US').format(c[4]));
 h.queues.get('/api/followers').push(good(configs[0],46000));h.intervals[0].fn();await settled();assert.equal(h.frames.size,1);h.frame(700);assert.equal(h.nodes['tt-followers'].textContent,'46,000');
});
test('un primer fallo no impide los otros contadores y se recupera sin datos inventados',async()=>{
 const h=harness();h.queues.get('/api/instagram').push(new Error('offline'));h.start();await settled();assert.equal(h.nodes['ig-followers'].textContent,'—');assert.equal(h.nodes['tt-followers'].textContent,'45,771');h.intervals[0].fn();await settled();assert.equal(h.nodes['ig-followers'].textContent,'4,692');
});
test('conserva el último dato ante fallos y rechaza respuestas de otra cuenta',async()=>{
 const h=harness();h.start();await settled();h.queues.get('/api/facebook').push(new Response('error',{status:502}));h.queues.get('/api/youtube').push(good(configs[3],999,{cuenta:'otro'}));h.intervals[0].fn();await settled();assert.equal(h.nodes['fb-followers'].textContent,'17,758');assert.equal(h.nodes['fb-followers'].dataset.state,'stale');assert.equal(h.nodes['yt-subscribers'].textContent,'38');assert.equal(h.nodes['yt-subscribers'].dataset.state,'stale');
});
test('pausa consultas y animaciones cuando la página no está visible',async()=>{
 const h=harness({reduced:false});h.start();await settled();h.document.hidden=true;h.events.visibilitychange();assert.equal(h.frames.size,0);h.intervals[0].fn();await settled();assert.equal(h.calls.length,4);h.document.hidden=false;h.events.visibilitychange();await settled();assert.equal(h.calls.length,8);
});
test('espera a las imágenes; el evento listo no duplica intervalos ni consultas',async()=>{
 const h=harness({ready:false});h.start();await settled();assert.equal(h.calls.length,0);h.poster.dataset.ready='true';h.events['poster-ready']();h.events['poster-ready']();await settled();assert.equal(h.calls.length,4);assert.equal(h.intervals.length,1);
});
test('evita consultas simultáneas al mismo contador',async()=>{
 const h=harness();let resolve;h.queues.get('/api/followers').push(()=>new Promise(r=>resolve=r));h.start();h.intervals[0].fn();assert.equal(h.calls.filter(x=>x.url==='/api/followers').length,1);resolve(good(configs[0]));await settled();
});
test('un archivo local muestra raya y no consulta una API inexistente',async()=>{
 const h=harness({protocol:'file:'});h.start();await settled();assert.equal(h.calls.length,0);for(const c of configs)assert.equal(h.nodes[c[0]].textContent,'—');
});
