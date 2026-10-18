import {readFile,access} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
test('el index utiliza la portada definitiva y las tres tarjetas recortadas de la imagen suministrada', async()=>{
 const html=await readFile(new URL('index.html',base),'utf8');
 for(const name of ['portada-definitiva.webp','tarjeta-1.webp','tarjeta-2.webp','tarjeta-3.webp']){
  assert.ok(html.includes('assets/'+name),name);await access(new URL('assets/'+name,base));
 }
 assert.match(html,/data-service="0"/);assert.match(html,/data-service="1"/);assert.match(html,/data-service="2"/);
 assert.match(html,/id="prev"/);assert.match(html,/id="next"/);
});
test('el index conserva los cuatro perfiles, la API y la comunidad de suscriptores',async()=>{
 const html=await readFile(new URL('index.html',base),'utf8');
 const counter=await readFile(new URL('counters.js',base),'utf8');
 for(const id of ['tt-followers','fb-followers','ig-followers','yt-subscribers'])assert.ok(html.includes('id="'+id+'"'));
 for(const dest of ['tiktok.com/@elbellocubano7','facebook.com/elbellocubano','instagram.com/elbellocubano','youtube.com/@elbellocubano','tiktok.me/group/ZSgYJE5BA/'])assert.ok(html.includes(dest),dest);
 for(const api of ['/api/followers','/api/facebook','/api/instagram','/api/youtube'])assert.ok(counter.includes(api),api);
 assert.match(html,/promociones\.html/);
});
