import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const reservePort=()=>new Promise((resolve,reject)=>{
  const server=net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const port=server.address().port;
    server.close(()=>resolve(port));
  });
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('H01 Servidor HTTP: interfaz, acceso y bloqueo de entrega',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'open-factory-http-'));
  const port=await reservePort();
  const child=spawn(process.execPath,['src/server.mjs'],{
    cwd:process.cwd(),stdio:'ignore',
    env:{...process.env,PORT:String(port),HOST:'127.0.0.1',
      FACTORY_TOKEN:'token-de-prueba',FACTORY_DATA:path.join(dir,'state.json')}
  });
  t.after(()=>{child.kill();fs.rmSync(dir,{recursive:true,force:true});});
  const origin='http://127.0.0.1:'+port;
  let reachable=false;
  for(let i=0;i<40;i++){
    try{const r=await fetch(origin);if(r.ok){reachable=true;break;}}
    catch{await delay(100);}
  }
  assert.equal(reachable,true,'El servidor debe arrancar');
  const html=await (await fetch(origin)).text();
  assert.match(html,/MONTEMOLÍN/);
  const script=await fetch(origin+'/app.js');
  assert.equal(script.status,200);
  assert.match(await script.text(),/reload\(\)/);
  const denied=await fetch(origin+'/api/state');
  assert.equal(denied.status,401);
  const headers={'content-type':'application/json','authorization':'Bearer token-de-prueba'};
  const pRes=await fetch(origin+'/api/projects',{method:'POST',headers,body:JSON.stringify({name:'Prueba API'})});
  assert.equal(pRes.status,200);
  const project=await pRes.json();
  const vRes=await fetch(origin+'/api/evaluate',{method:'POST',headers,body:JSON.stringify({projectId:project.id})});
  assert.equal(vRes.status,200);
  assert.equal((await vRes.json()).passed,false);
  const dRes=await fetch(origin+'/api/deliver',{method:'POST',headers,body:JSON.stringify({projectId:project.id})});
  assert.equal(dRes.status,409);
  const state=await (await fetch(origin+'/api/state',{headers})).json();
  assert.equal(state.projects.length,1);
});
