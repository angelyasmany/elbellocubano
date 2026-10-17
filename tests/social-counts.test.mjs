import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProfileCount,publicCounterReading,youtubeCount,socialCountResponse,createSocialCountReader,YOUTUBE_CHANNEL} from '../lib/social-counts.mjs';
const counterPage=(network,count='17,758')=>network==='facebook'?`<meta property="og:url" content="https://livecounts.nl/facebook-realtime/?u=elbellocubano"><meta name="description" content="elBelloCubano has ${count} Facebook followers (exact count from Facebook, 16 Oct 2026, 16:55 UTC).">`:`<meta property="og:url" content="https://mixerno.space/instagram-user-counter/elbellocubano"><div id="followers">4,694</div>`;
const profile=(network,count='4,692',account='elbellocubano')=>`<meta property="og:url" content="https://www.${network}.com/${account}/"><meta property="og:description" content="el Bello Cubano. ${count} Followers &#xb7; Perfil público">`;
test('extrae totales públicos completos y confirma la cuenta sin usar API privadas',()=>{
 assert.equal(publicProfileCount(profile('instagram'),'instagram'),4692);assert.equal(publicProfileCount(profile('facebook','17,758'),'facebook'),17758);assert.equal(publicProfileCount(profile('instagram','0'),'instagram'),0);
 assert.throws(()=>publicProfileCount(profile('instagram','4.6K'),'instagram'));assert.throws(()=>publicProfileCount(profile('facebook','99','otro'),'facebook'));assert.throws(()=>publicProfileCount('<title>Login</title>','instagram'));
});
test('YouTube usa subscribers y no confunde suscriptores con vistas u otras métricas',()=>{
 assert.equal(youtubeCount({counts:[{value:'views',count:999},{value:'subscribers',count:38}]}),38);
 assert.throws(()=>youtubeCount({counts:[{value:'views',count:999}]}));assert.throws(()=>youtubeCount({counts:[{value:'subscribers',count:-1}]}));
});
test('respuestas válidas señalan origen, identidad y fecha de consulta',async()=>{
 const calls=[];const response=await socialCountResponse('facebook',{fetchImpl:async(url)=>{calls.push(url);return new Response(counterPage('facebook','17,758'))},now:()=>new Date('2026-10-16T17:00:00Z')});const body=await response.json();assert.equal(response.status,200);assert.equal(body.count,17758);assert.equal(body.cuenta,'elbellocubano');assert.match(body.fuente,/Livecounts/);assert.equal(calls[0],'https://livecounts.nl/facebook-realtime/?u=elbellocubano');assert.match(response.headers.get('cache-control'),/s-maxage=60/);
});
test('la fuente de YouTube conserva antigüedad y el identificador suministrado',async()=>{
 const response=await socialCountResponse('youtube',{fetchImpl:async()=>Response.json({counts:[{value:'subscribers',count:38}],updatedAt:1792166400000,isStale:true}),now:()=>new Date('2026-10-16T17:00:00Z')});const body=await response.json();assert.equal(body.cuenta,YOUTUBE_CHANNEL);assert.equal(body.count,38);assert.equal(body.source_stale,true);
});
test('fallos de fuente, formato o plataforma no se convierten en números',async()=>{
 for(const fetchImpl of [async()=>new Response('denied',{status:403}),async()=>new Response('<title>Login</title>')]){const response=await socialCountResponse('instagram',{fetchImpl});assert.equal(response.status,502);assert.equal((await response.json()).count,null);assert.equal(response.headers.get('cache-control'),'no-store');}
 assert.equal((await socialCountResponse('unknown')).status,404);
});
test('cachea cada perfil un minuto y reutiliza lecturas simultáneas',async()=>{
 let calls=0,time=0;const reader=createSocialCountReader({fetchImpl:async()=>{calls++;return new Response(counterPage('instagram'))},now:()=>new Date(time)});
 const responses=await Promise.all([reader('instagram'),reader('instagram')]);assert.equal(calls,1);for(const response of responses)assert.equal((await response.json()).count,4694);await reader('instagram');assert.equal(calls,1);time=60001;await reader('instagram');assert.equal(calls,2);
});

test('lee únicamente los datos visibles de páginas públicas y conserva fecha o antigüedad desconocida',()=>{
 const fb=publicCounterReading(counterPage('facebook'),'facebook');assert.equal(fb.count,17758);assert.equal(fb.updatedAt,'2026-10-16T16:55:00.000Z');
 const ig=publicCounterReading(counterPage('instagram'),'instagram');assert.equal(ig.count,4694);assert.equal(ig.stale,true);assert.equal(ig.updatedAt,null);
 assert.throws(()=>publicCounterReading(counterPage('instagram').replace('/elbellocubano','/otro'),'instagram'));
});
