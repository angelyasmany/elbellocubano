import {test} from 'node:test';
import assert from 'node:assert/strict';
import {officialFacebookCount,socialCountResponse} from '../lib/social-counts.mjs';
test('Facebook lee los seguidores de la página propia desde Meta con ID confirmado',async()=>{
 const env={FACEBOOK_PAGE_ID:'1234567890',FACEBOOK_PAGE_ACCESS_TOKEN:'secret-token'};
 let called=0;
 const fetchImpl=async(url)=>{called++;const parsed=new URL(url);assert.equal(parsed.hostname,'graph.facebook.com');assert.equal(parsed.searchParams.get('fields'),'id,followers_count');assert.equal(parsed.searchParams.get('access_token'),'secret-token');return Response.json({id:'1234567890',followers_count:17234});};
 const result=await socialCountResponse('facebook',{fetchImpl,env});const data=await result.json();
 assert.equal(called,1);assert.equal(data.consulta_ok,true);assert.equal(data.count,17234);assert.equal(data.cuenta,'elbellocubano');assert.equal(data.fuente,'Meta Graph API');
 assert.ok(!JSON.stringify(data).includes('secret-token'));
});
test('Facebook rechaza ID no confirmado por Meta',async()=>{
 await assert.rejects(officialFacebookCount({fetchImpl:async()=>Response.json({id:'1234567891',followers_count:17234}),env:{FACEBOOK_PAGE_ID:'1234567890',FACEBOOK_PAGE_ACCESS_TOKEN:'secret-token'}}));
});
