import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../page-ready.js',import.meta.url),'utf8');
const settled=async()=>{for(let i=0;i<3;i++)await new Promise(setImmediate);};
function image(complete=false){return {complete,naturalWidth:complete?1024:0,listeners:{},addEventListener(name,fn){this.listeners[name]=fn},decode:async()=>{}};}
function harness(images){
 const classes=new Set(['is-loading']),events=[],timers=new Map();let serial=0,reloads=0;
 const poster={dataset:{},querySelectorAll:()=>images},loader={hidden:false},message={textContent:''},retry={hidden:true,addEventListener(_name,fn){this.click=fn}};
 const nodes={poster,'page-loader':loader,'loading-message':message,'retry-page':retry};
 const document={getElementById:id=>nodes[id],documentElement:{classList:{remove:x=>classes.delete(x)}},dispatchEvent:event=>events.push(event.type)};
 const context={document,location:{reload:()=>reloads++},CustomEvent:class{constructor(type){this.type=type}},setTimeout:(fn)=>{const id=++serial;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
 return {poster,loader,message,retry,classes,events,timers,get reloads(){return reloads},start:()=>vm.runInNewContext(code,context)};
}
test('revela portada y tarjetas solo cuando todas las imágenes están cargadas y decodificadas',async()=>{
 const first=image(true),last=image(false);let decoded;last.decode=()=>new Promise(resolve=>decoded=resolve);
 const h=harness([first,last]);h.start();await settled();assert.ok(h.classes.has('is-loading'));assert.equal(h.events.length,0);
 last.naturalWidth=1024;last.listeners.load();await settled();assert.equal(h.events.length,0);decoded();await settled();assert.equal(h.poster.dataset.ready,'true');assert.equal(h.classes.has('is-loading'),false);assert.equal(h.loader.hidden,true);assert.deepEqual(h.events,['poster-ready']);assert.equal(h.timers.size,0);
});
test('si una imagen falla, muestra reintento sin revelar tarjetas a medias',async()=>{
 const img=image(false),h=harness([image(true),img]);h.start();img.listeners.error();await settled();assert.equal(h.retry.hidden,false);assert.ok(h.classes.has('is-loading'));assert.equal(h.events.length,0);h.retry.click();assert.equal(h.reloads,1);
});
test('la espera prolongada ofrece reintento, pero no fuerza una revelación incompleta',async()=>{
 const img=image(false),h=harness([img]);h.start();for(const fn of h.timers.values())fn();assert.equal(h.retry.hidden,false);assert.ok(h.classes.has('is-loading'));img.naturalWidth=1024;img.listeners.load();await settled();assert.equal(h.poster.dataset.ready,'true');
});
