import test from 'node:test';
import assert from 'node:assert/strict';
import {tokCounterDisplay,tikTokResponse} from '../lib/tiktok.mjs';
const profile={success:true,id:'elbellocubano7',userId:'7225446099028329477'};
function source(values){const calls=[];return {calls,fetchImpl:async(url,options)=>{calls.push({url,options});const value=values.shift();if(value instanceof Error)throw value;return value instanceof Response?value:Response.json(value);}};}
test('conserva exactamente los límites y saltos de la transformación suministrada',()=>{
 for(const [raw,expected] of [[0,0],[10049,10049],[10050,10100],[45721,45771],[1049000,1049050],[1049001,1049001],[1049999,1049999],[1050000,1100000],[100499999,100549999],[100500000,100550000],[1049999999,1050049999],[1050000000,1100000000]])assert.equal(tokCounterDisplay(raw),expected);
});
test('confirma identidad y consulta estadísticas de ese identificador; entrega caché y fecha',async()=>{
 const mock=source([profile,{success:true,followerCount:'45721',cache:true}]);
 const response=await tikTokResponse({...mock,now:()=>new Date('2026-10-16T17:00:00Z')});
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.tiktok,45771);assert.equal(body.cuenta,'elbellocubano7');assert.equal(body.consulta_ok,true);assert.equal(body.fuente_cache,true);assert.equal(body.updated_at,'2026-10-16T17:00:00.000Z');
 assert.match(mock.calls[1].url,/\/user\/stats\/7225446099028329477$/);assert.equal(mock.calls[0].options.headers.Accept,'application/json');assert.match(response.headers.get('cache-control'),/s-maxage=5/);
});
test('rechaza perfiles ajenos antes de consultar estadísticas',async()=>{
 for(const bad of [{...profile,id:'otro'},{...profile,userId:'abc'},{...profile,id:null},{...profile,success:false}]){
  const mock=source([bad]);const response=await tikTokResponse(mock);assert.equal(response.status,502);assert.equal(mock.calls.length,1);assert.equal((await response.json()).tiktok,null);assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
test('no publica contadores negativos, decimales, ausentes o fuera de rango seguro',async()=>{
 for(const raw of [-1,1.5,null,undefined,'foo','9007199254740992',Number.MAX_SAFE_INTEGER]){
  const response=await tikTokResponse(source([profile,{success:true,followerCount:raw}]));assert.equal(response.status,502);const body=await response.json();assert.equal(body.consulta_ok,false);assert.equal(body.updated_at,null);assert.equal(body.tiktok,null);
 }
});
test('HTTP no satisfactorio y JSON roto no se convierten en un número de muestra',async()=>{
 for(const bad of [new Response('upstream',{status:503}),new Response('not json',{status:200}),new Error('Fallo de red')]){
  const response=await tikTokResponse(source([bad]));assert.equal(response.status,502);assert.equal((await response.json()).consulta_ok,false);
 }
});
test('el límite de tiempo cancela la consulta y devuelve una respuesta explícita',async()=>{
 const fetchImpl=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError')),{once:true}));
 const response=await tikTokResponse({fetchImpl,timeoutMs:5});assert.equal(response.status,502);assert.match((await response.json()).nota,/tardó demasiado/);
});
