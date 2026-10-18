import {readFile,access} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
test('el index utiliza la portada original con tipografía HTML y las tarjetas sin flechas impresas', async()=>{
 const html=await readFile(new URL('index.html',base),'utf8');
 for(const name of ['portada-fondo-limpio.webp','tarjeta-1-limpia.webp','tarjeta-2-limpia.webp','tarjeta-3-limpia.webp']){
  assert.ok(html.includes('assets/'+name),name);await access(new URL('assets/'+name,base));
 }
 assert.match(html,/data-service="0"/);assert.match(html,/data-service="1"/);assert.match(html,/data-service="2"/);
 assert.match(html,/id="prev"/);assert.match(html,/id="next"/);
 assert.match(html,/<header class="hero-copy">/);
 assert.match(html,/<h1><span>¡Asere,<\/span> qué bola!<\/h1>/);
 assert.match(html,/Deseo que estos servicios de calidad te sean de ayuda/);
 assert.match(html,/<strong>Dios te bendiga\.<\/strong>/);
 assert.match(html,/class="cart-hotspot"/);
 assert.match(html,/<nav class="social-row"/);
 assert.doesNotMatch(html,/>Seguidores<|>Suscriptores</);

});
test('el index conserva los cuatro perfiles, la API y la comunidad de suscriptores',async()=>{
 const html=await readFile(new URL('index.html',base),'utf8');
 const counter=await readFile(new URL('counters.js',base),'utf8');
 for(const id of ['tt-followers','fb-followers','ig-followers','yt-subscribers'])assert.ok(html.includes('id="'+id+'"'));
 for(const dest of ['tiktok.com/@elbellocubano7','facebook.com/elbellocubano','instagram.com/elbellocubano','youtube.com/@elbellocubano','tiktok.me/group/ZSgYJE5BA/'])assert.ok(html.includes(dest),dest);
 for(const api of ['/api/followers','/api/facebook','/api/instagram','/api/youtube'])assert.ok(counter.includes(api),api);
 assert.match(html,/promociones\.html/);
});

test('promociones sitúa Los Causeres VIP arriba sin duplicar la comunidad ni Escríbeme',async()=>{
 const html=await readFile(new URL('promociones.html',base),'utf8');
 assert.ok(html.includes('https://tiktok.me/group/ZSgYJE5BA/'));
 assert.equal((html.match(/Los Causeres VIP/g)||[]).length,2); // texto y aria-label
 assert.doesNotMatch(html,/>Escríbeme</);
 assert.match(html,/Quiero la Promo Estandar S\/180/);
});
