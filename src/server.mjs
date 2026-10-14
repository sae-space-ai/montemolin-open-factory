import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFactory } from './engine.mjs';

const app = createFactory({filePath:process.env.FACTORY_DATA || 'data/factory.json'});
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || '5679');
const token = process.env.FACTORY_TOKEN || '';
if (host !== '127.0.0.1' && host !== 'localhost' && !token) {
  throw new Error('FACTORY_TOKEN obligatorio al exponer la aplicación en red');
}
const home = new URL('../public/index.html',import.meta.url);
const respond=(res,status,data,contentType='application/json')=>{
  res.writeHead(status,{'content-type':contentType+'; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'x-frame-options':'DENY','referrer-policy':'no-referrer',
    'content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});
  res.end(contentType==='application/json'?JSON.stringify(data):data);
};
async function body(req){
  let text='';
  for await(const part of req){
    text+=part.toString('utf8');
    if(Buffer.byteLength(text)>8388608) throw new Error('Petición demasiado grande');
  }
  return JSON.parse(text||'{}');
}
function authorized(req) {
  return !token || req.headers.authorization === 'Bearer '+token;
}
const routes={
  '/api/projects': b=>app.createProject(b),
  '/api/requirements': b=>app.addRequirement(b),
  '/api/tasks': b=>app.addTask(b),
  '/api/tasks/complete': b=>app.completeTask(b),
  '/api/artifacts': b=>app.addArtifact(b),
  '/api/evaluate': b=>app.evaluate(b),
  '/api/approve': b=>app.approve(b),
  '/api/deliver': b=>app.deliver(b),
  '/api/import': b=>app.importJSON(b.json)
};
const server=http.createServer(async (req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/' && req.method==='GET'){
      return respond(res,200,fs.readFileSync(fileURLToPath(home),'utf8'),'text/html');
    }
    if(pathname==='/app.js' && req.method==='GET') { const source=fs.readFileSync(fileURLToPath(new URL('../public/app.js',import.meta.url)),'utf8'); return respond(res,200,source,'text/javascript'); }
    if(!pathname.startsWith('/api/')) return respond(res,404,{error:'No encontrado'});
    if(!authorized(req)) return respond(res,401,{error:'Token de acceso incorrecto'});
    if(pathname==='/api/state' && req.method==='GET')return respond(res,200,app.getState());
    if(pathname==='/api/export' && req.method==='GET')
      return respond(res,200,app.getState(),'application/json');
    if(req.method==='POST' && routes[pathname]){
      return respond(res,200,routes[pathname](await body(req)));
    }
    return respond(res,404,{error:'Ruta no disponible'});
  } catch(error) {
    const gated=/BLOQUEADA|BLOQUEADO/.test(error.message);
    respond(res,gated?409:400,{error:error.message});
  }
});
server.listen(port,host,()=>console.log('Open Factory local: http://'+host+':'+port));
