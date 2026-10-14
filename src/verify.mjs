import { createHash } from 'node:crypto';

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function projectDigest(snapshot) {
  const clean = {
    project: snapshot.project,
    requirements: [...snapshot.requirements].sort((a,b) => a.id.localeCompare(b.id)),
    tasks: [...snapshot.tasks].sort((a,b) => a.id.localeCompare(b.id)),
    artifacts: [...snapshot.artifacts].sort((a,b) => a.id.localeCompare(b.id))
  };
  return sha256(JSON.stringify(clean));
}

// Motor determinista; ninguna salida de un LLM se considera evidencia de test.
export function verifySnapshot(snapshot) {
  const { project, requirements, tasks, artifacts } = snapshot;
  const checks = [
    ['V01', 'Proyecto identificado', Boolean(project?.id && project?.name?.trim())],
    ['V02', 'Requisitos registrados', requirements.length > 0],
    ['V03', 'Cada requisito tiene una tarea', requirements.length > 0 &&
      requirements.every(r => tasks.some(t => t.requirementId === r.id))],
    ['V04', 'Tareas terminadas', tasks.length > 0 &&
      tasks.every(t => t.status === 'done')],
    ['V05', 'Cada tarea tiene un artefacto', tasks.length > 0 &&
      tasks.every(t => artifacts.some(a => a.taskId === t.id))],
    ['V06', 'Integridad SHA-256 comprobada', artifacts.length > 0 &&
      artifacts.every(a => typeof a.content === 'string' &&
        a.sha256 === sha256(a.content))],
    ['V07', 'Procedencia de evidencias identificada', artifacts.length > 0 &&
      artifacts.every(a => typeof a.source === 'string' &&
        a.source.trim().length > 0 && typeof a.createdAt === 'string')]
  ];
  return {
    digest: projectDigest(snapshot),
    passed: checks.every(([, , pass]) => pass),
    checks: checks.map(([id, label, pass]) => ({ id, label, status: pass ? 'PASS' : 'FAIL' }))
  };
}
