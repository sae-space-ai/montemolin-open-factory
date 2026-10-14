import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFactory } from '../src/engine.mjs';
import { sha256 } from '../src/verify.mjs';

function factory(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'open-factory-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const filePath=path.join(dir,'state.json');
  return { app:createFactory({filePath}),filePath };
}
function complete(app) {
  const p=app.createProject({name:'Primer encargo interno'});
  const r=app.addRequirement({projectId:p.id,title:'Gestionar evidencias'});
  const task=app.addTask({requirementId:r.id,title:'Construir control de integridad'});
  app.addArtifact({taskId:task.id,content:'const ok = true;',source:'Commit local reproducible'});
  app.completeTask({taskId:task.id});
  return {p,r,task};
}

test('A01 Persistencia: los proyectos sobreviven a reinicio',t=>{
  const {app,filePath}=factory(t);
  const p=app.createProject({name:'Persistencia'});
  assert.equal(createFactory({filePath}).getState().projects[0].id,p.id);
});

test('A02 Trazabilidad: requisito y tarea enlazados',t=>{
  const {app}=factory(t);const {p,r,task}=complete(app);
  assert.equal(app.getState().requirements.find(x=>x.id===r.id).projectId,p.id);
  assert.equal(app.getState().tasks.find(x=>x.id===task.id).requirementId,r.id);
});

test('A03 Integridad: checksum calculado y adulteración rechazada',t=>{
  const {app}=factory(t);complete(app);
  const art=app.getState().artifacts[0];
  assert.equal(art.sha256,sha256(art.content));
  const data=JSON.parse(app.exportJSON());
  data.artifacts[0].content='modificación oculta';
  assert.throws(()=>app.importJSON(JSON.stringify(data)),/artefacto alterado/);
});

test('A04 La aprobación humana exige PASS de los siete controles',t=>{
  const {app}=factory(t);const {p}=complete(app);
  assert.throws(()=>app.approve({projectId:p.id,reviewer:'Revisor'}),/BLOQUEADA/);
  const run=app.evaluate({projectId:p.id});
  assert.equal(run.checks.length,7);
  assert.ok(run.checks.every(c=>c.status==='PASS'));
  assert.equal(app.approve({projectId:p.id,reviewer:'Revisor'}).digest,run.digest);
});

test('A05 Cualquier cambio material invalida la aprobación previa',t=>{
  const {app}=factory(t);const {p,r}=complete(app);
  app.evaluate({projectId:p.id});app.approve({projectId:p.id,reviewer:'Humano'});
  app.addTask({requirementId:r.id,title:'Nueva versión'});
  assert.throws(()=>app.deliver({projectId:p.id}),/BLOQUEADA/);
});

test('A06 Exportar e importar conserva datos, no hereda certificaciones',t=>{
  const {app}=factory(t);const {p}=complete(app);
  app.evaluate({projectId:p.id});app.approve({projectId:p.id,reviewer:'Revisor'});
  const {app:imported}=factory(t);
  const result=imported.importJSON(app.exportJSON());
  assert.equal(result.trust,'UNVERIFIED');
  assert.equal(imported.getState().artifacts.length,1);
  assert.equal(imported.getState().approvals.length,0);
  assert.throws(()=>imported.deliver({projectId:p.id}),/BLOQUEADA/);
});

test('A07 Una comprobación FAIL bloquea absolutamente la entrega',t=>{
  const {app}=factory(t);
  const p=app.createProject({name:'Pendiente'});
  const run=app.evaluate({projectId:p.id});
  assert.equal(run.passed,false);
  assert.ok(run.checks.some(c=>c.status==='FAIL'));
  assert.throws(()=>app.approve({projectId:p.id,reviewer:'Humano'}),/BLOQUEADA/);
  assert.throws(()=>app.deliver({projectId:p.id}),/BLOQUEADA/);
});
