import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../api/contadores.js';
const ok=network=>Response.json({consulta_ok:true,platform:network,count:38},{headers:{'Cache-Control':'public, s-maxage=5'}});
async function call(handler,url,method='GET'){
 const res={headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=JSON.parse(body)}};
 await handler({url,method},res);return res;
}
test('el adaptador conserva códigos y cabeceras de cada red y rechaza rutas desconocidas',async()=>{
 const handler=createHandler({tiktok:()=>ok('tiktok'),social:network=>ok(network)});
 for(const network of ['tiktok','instagram','facebook','youtube']){
  const r=await call(handler,'/api/contadores?network='+network);assert.equal(r.statusCode,200);assert.equal(r.body.platform,network);assert.match(r.headers['cache-control'],/s-maxage=5/);
 }
 assert.equal((await call(handler,'/api/contadores?network=otra')).statusCode,404);
 assert.equal((await call(handler,'/api/contadores','POST')).statusCode,405);
});
test('una fuente fallida no oculta los datos disponibles de las otras tres',async()=>{
 const handler=createHandler({tiktok:()=>ok('tiktok'),social:network=>network==='instagram'?Promise.reject(new Error('offline')):ok(network)});
 const r=await call(handler,'/api/contadores');assert.equal(r.statusCode,200);assert.equal(r.body.consulta_ok,false);assert.equal(r.body.redes.instagram.count,null);assert.equal(r.body.redes.youtube.count,38);assert.equal(r.headers['cache-control'],'no-store');
});
