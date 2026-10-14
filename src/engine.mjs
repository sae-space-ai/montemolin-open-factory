import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256, projectDigest, verifySnapshot } from './verify.mjs';

const fresh = () => ({
  schemaVersion: 1, projects: [], requirements: [], tasks: [],
  artifacts: [], runs: [], approvals: [], deliveries: [], events: []
});
const now = () => new Date().toISOString();
const newId = () => randomUUID();
const required = (s, field) => {
  if (typeof s !== 'string' || !s.trim()) throw new Error(field + ' es obligatorio');
  return s.trim();
};
const found = (rows, id, what) => {
  const row = rows.find(x => x.id === id);
  if (!row) throw new Error(what + ' no encontrado');
  return row;
};
const deepCopy = x => structuredClone(x);
const log = (s, type, entityId, detail = '') => {
  s.events.push({ id: newId(), at: now(), type, entityId, detail });
};

export function createFactory({ filePath = 'data/factory.json' } = {}) {
  let state = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fresh();
  if (state.schemaVersion !== 1) throw new Error('Versión de datos incompatible');

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = filePath + '.' + process.pid + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(temp, filePath);
  }
  function mutate(fn) {
    const previous = state;
    state = deepCopy(state);
    try { const result = fn(state); persist(); return result; }
    catch (error) { state = previous; throw error; }
  }
  function snapshot(s, projectId) {
    const project = found(s.projects, projectId, 'Proyecto');
    const requirements = s.requirements.filter(r => r.projectId === projectId);
    const reqIds = new Set(requirements.map(r => r.id));
    const tasks = s.tasks.filter(t => reqIds.has(t.requirementId));
    const taskIds = new Set(tasks.map(t => t.id));
    const artifacts = s.artifacts.filter(a => taskIds.has(a.taskId));
    return { project, requirements, tasks, artifacts };
  }

  return {
    getState: () => deepCopy(state),
    createProject({ name, license = 'MIT' }) {
      return mutate(s => {
        const project = { id: newId(), name: required(name,'Nombre'),
          license: required(license,'Licencia'), createdAt: now() };
        s.projects.push(project); log(s,'PROJECT_CREATED',project.id);
        return project;
      });
    },
    addRequirement({ projectId, title }) {
      return mutate(s => {
        found(s.projects,projectId,'Proyecto');
        const r = { id:newId(), projectId,title:required(title,'Requisito'),createdAt:now() };
        s.requirements.push(r);log(s,'REQUIREMENT_CREATED',r.id);return r;
      });
    },
    addTask({ requirementId, title }) {
      return mutate(s => {
        found(s.requirements,requirementId,'Requisito');
        const t = { id:newId(),requirementId,title:required(title,'Tarea'),
          status:'open',createdAt:now() };
        s.tasks.push(t);log(s,'TASK_CREATED',t.id);return t;
      });
    },
    completeTask({ taskId }) {
      return mutate(s => {
        const t=found(s.tasks,taskId,'Tarea');t.status='done';t.updatedAt=now();
        log(s,'TASK_COMPLETED',t.id);return t;
      });
    },
    addArtifact({ taskId, content, source }) {
      return mutate(s => {
        found(s.tasks,taskId,'Tarea');
        if (typeof content !== 'string' || !content.trim() || Buffer.byteLength(content)>65536)
          throw new Error('Contenido de artefacto requerido, máximo 64 KiB');
        const a={ id:newId(),taskId,content,sha256:sha256(content),
          source:required(source,'Procedencia'),createdAt:now() };
        s.artifacts.push(a);log(s,'ARTIFACT_ATTACHED',a.id,a.sha256);return a;
      });
    },
    evaluate({ projectId }) {
      return mutate(s => {
        const result=verifySnapshot(snapshot(s,projectId));
        const run={ ...result,id:newId(),projectId,at:now(),engine:'deterministic-v1' };
        s.runs.push(run);log(s,'VERIFICATION',run.id,run.passed?'PASS':'FAIL');
        return run;
      });
    },
    approve({ projectId, reviewer }) {
      return mutate(s => {
        const snap=snapshot(s,projectId);const digest=projectDigest(snap);
        const run=[...s.runs].reverse().find(x=>x.projectId===projectId);
        if (!run || !run.passed || run.digest!==digest)
          throw new Error('APROBACIÓN BLOQUEADA: verificación PASS de la versión actual obligatoria');
        const approval={id:newId(),projectId,digest,runId:run.id,
          reviewer:required(reviewer,'Revisor humano'),at:now()};
        s.approvals.push(approval);log(s,'HUMAN_APPROVAL',approval.id,digest);
        return approval;
      });
    },
    deliver({ projectId }) {
      return mutate(s => {
        const snap=snapshot(s,projectId);const digest=projectDigest(snap);
        const run=[...s.runs].reverse().find(x=>x.projectId===projectId);
        const approval=[...s.approvals].reverse().find(x=>x.projectId===projectId);
        if (!run?.passed || run.digest!==digest ||
            !approval || approval.digest!==digest || approval.runId!==run.id)
          throw new Error('ENTREGA BLOQUEADA: FAIL, cambio de versión o aprobación ausente');
        const delivery={id:newId(),projectId,digest,approvalId:approval.id,at:now()};
        s.deliveries.push(delivery);log(s,'DELIVERED',delivery.id,digest);
        return delivery;
      });
    },
    exportJSON() { return JSON.stringify(state,null,2); },
    importJSON(text) {
      return mutate(s => {
        const incoming=JSON.parse(text);
        if (incoming.schemaVersion!==1 ||
          !['projects','requirements','tasks','artifacts'].every(k=>Array.isArray(incoming[k])))
          throw new Error('Formato de exportación incompatible');
        for(const a of incoming.artifacts) {
          if(typeof a.content!=='string' || a.sha256!==sha256(a.content))
            throw new Error('Importación rechazada: artefacto alterado');
        }
        // No transferir supuestas aprobaciones/verificaciones como certificaciones fiables.
        const copy=fresh();
        for(const k of ['projects','requirements','tasks','artifacts']) copy[k]=incoming[k];
        copy.events=[{id:newId(),at:now(),type:'IMPORTED_UNVERIFIED',entityId:'all',
          detail:'Debe repetirse verificación y aprobación en este entorno'}];
        Object.assign(s,copy);
        return {projects:s.projects.length,artifacts:s.artifacts.length,trust:'UNVERIFIED'};
      });
    }
  };
}
