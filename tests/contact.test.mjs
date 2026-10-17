import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../contact.js',import.meta.url),'utf8');
function run(number){
 let clicked,opened=0;
 const link={dataset:{whatsappMessage:'Quiero la Promo Estandar S/180'},removeAttribute(key){delete this[key]},addEventListener(name,fn){clicked=fn}};
 const dialog={showModal(){opened++},addEventListener(){}};
 vm.runInNewContext(code,{window:{BELLO_CONFIG:{whatsappNumber:number}},document:{querySelectorAll:()=>[link],getElementById:()=>dialog},String,encodeURIComponent});
 return {link,click(){let prevented=false;clicked({preventDefault(){prevented=true}});return {prevented,opened}}};
}
test('el número real activa WhatsApp y conserva mensaje y precio',()=>{
 const {link}=run('51912345678');assert.equal(link.href,'https://wa.me/51912345678?text=Quiero%20la%20Promo%20Estandar%20S%2F180');assert.equal(link.rel,'noopener noreferrer');
});
test('sin número válido muestra el aviso en vez de enviar a un enlace roto',()=>{
 for(const value of ['', 'elbellocubano','+51 123']){const h=run(value);assert.equal(h.link.href,undefined);assert.deepEqual(h.click(),{prevented:true,opened:1});}
});
