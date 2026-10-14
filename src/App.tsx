import { useState, useEffect, useCallback } from 'react';
import type {
  AppData,
  Project,
  ProjectTest,
  TestStatus,
} from './core/types';
import {
  createInitialData,
  createProject,
  getStats,
  evaluateQualityGate,
  gateMessage,
} from './core/projects';
import { loadData, saveData, exportData, importDataFromFile } from './core/storage';
import { formatDate, generateId } from './core/utils';

// ─── Subcomponentes ────────────────────────────────────────────────

function StatusBadge({ status }: { status: Project['status'] }) {
  const config: Record<Project['status'], { label: string; color: string }> = {
    construction: { label: 'EN CONSTRUCCIÓN', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    review: { label: 'EN REVISIÓN', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    completed: { label: 'COMPLETADO', color: 'bg-green-100 text-green-800 border-green-300' },
  };
  const { label, color } = config[status];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

function TestStatusBadge({ status }: { status: TestStatus }) {
  const config: Record<TestStatus, { label: string; color: string; icon: string }> = {
    pass: { label: 'PASS', color: 'bg-green-100 text-green-700 border-green-300', icon: '✓' },
    fail: { label: 'FAIL', color: 'bg-red-100 text-red-700 border-red-300', icon: '✕' },
    pending: { label: 'PENDING', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '○' },
  };
  const { label, color, icon } = config[status];
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {icon} {label}
    </span>
  );
}

function QualityGatePanel({
  project,
  onSetTestStatus,
  onAddTest,
  onDeleteTest,
}: {
  project: Project;
  onSetTestStatus: (testId: string, status: TestStatus) => void;
  onAddTest: (name: string, mandatory: boolean) => void;
  onDeleteTest: (testId: string) => void;
}) {
  const [newTestName, setNewTestName] = useState('');
  const [newTestMandatory, setNewTestMandatory] = useState(true);
  const gate = evaluateQualityGate(project);

  const handleAddTest = () => {
    if (!newTestName.trim()) return;
    onAddTest(newTestName.trim(), newTestMandatory);
    setNewTestName('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Gate Header */}
      <div
        className={`px-5 py-3 border-b ${
          gate.canApprove
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${gate.canApprove ? 'text-green-600' : 'text-red-600'}`}>
              {gate.canApprove ? '🟢' : '🔴'}
            </span>
            <h3 className="font-bold text-sm text-gray-900">Quality Gate</h3>
          </div>
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${
              gate.canApprove
                ? 'bg-green-200 text-green-800'
                : 'bg-red-200 text-red-800'
            }`}
          >
            {gate.canApprove ? 'APROBADO' : 'BLOQUEADO'}
          </span>
        </div>
        <p className={`text-xs mt-1 ${gate.canApprove ? 'text-green-700' : 'text-red-700'}`}>
          {gateMessage(gate)}
        </p>
      </div>

      {/* Test List */}
      <div className="p-4">
        {project.tests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No hay pruebas registradas.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {project.tests.map((test) => (
              <li
                key={test.id}
                className={`flex items-center gap-3 p-2.5 rounded-md border ${
                  test.status === 'fail' && test.mandatory
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                {/* Mandatory indicator */}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    test.mandatory
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  title={test.mandatory ? 'Obligatoria — bloquea entregas' : 'Informativa'}
                >
                  {test.mandatory ? 'OBL' : 'OPT'}
                </span>

                {/* Test name */}
                <span className="flex-1 text-sm text-gray-700 truncate">{test.name}</span>

                {/* Status selector */}
                <select
                  value={test.status}
                  onChange={(e) => onSetTestStatus(test.id, e.target.value as TestStatus)}
                  className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>

                <TestStatusBadge status={test.status} />

                {/* Last run */}
                {test.lastRun && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {formatDate(test.lastRun)}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => onDeleteTest(test.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                  title="Eliminar prueba"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add test */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTest()}
              placeholder="Nombre de la prueba..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={newTestMandatory}
              onChange={(e) => setNewTestMandatory(e.target.checked)}
              className="rounded"
            />
            Obligatoria
          </label>
          <button
            onClick={handleAddTest}
            disabled={!newTestName.trim()}
            className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            + Prueba
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const gate = evaluateQualityGate(project);
  const completedTasks = project.tasks.filter((t) => t.completed).length;
  const totalTasks = project.tasks.length;
  const evidenceCount = project.evidence.length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Revisión {project.revision}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <span className={`text-sm ${gate.canApprove ? 'text-green-500' : 'text-red-500'}`}>
          {gate.canApprove ? '🟢' : '🔴'}
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{project.title}</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{project.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-gray-500">
          <span>
            <strong className="text-gray-700">{completedTasks}/{totalTasks}</strong> tareas
          </span>
          <span>
            <strong className="text-gray-700">{evidenceCount}</strong> evidencias
          </span>
          <span>
            <strong className="text-gray-700">{project.tests.length}</strong> pruebas
          </span>
        </div>
        <button
          onClick={onOpen}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          Abrir proyecto <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
  onUpdate,
  onBack,
}: {
  project: Project;
  onUpdate: (project: Project) => void;
  onBack: () => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'evidence' | 'tests'>('tests');
  const [gateWarning, setGateWarning] = useState<string | null>(null);

  const gate = evaluateQualityGate(project);
  const completedTasks = project.tasks.filter((t) => t.completed).length;
  const verifiedEvidence = project.evidence.filter((e) => e.verified).length;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task = { id: generateId(), title: newTaskTitle.trim(), completed: false };
    onUpdate({ ...project, tasks: [...project.tasks, task] });
    setNewTaskTitle('');
  };

  const handleToggleTask = (taskId: string) => {
    const tasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...project, tasks });
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdate({ ...project, tasks: project.tasks.filter((t) => t.id !== taskId) });
  };

  const handleAddEvidence = () => {
    if (!newEvidenceDesc.trim()) return;
    const ev = {
      id: generateId(),
      description: newEvidenceDesc.trim(),
      date: new Date().toISOString(),
      verified: false,
      blocked: !gate.canApprove,
    };
    onUpdate({ ...project, evidence: [...project.evidence, ev] });
    setNewEvidenceDesc('');
  };

  const handleVerifyEvidence = (evId: string) => {
    if (!gate.canApprove) {
      setGateWarning('⛔ BLOQUEADO: No se puede verificar. Una prueba obligatoria está fallando.');
      setTimeout(() => setGateWarning(null), 4000);
      // Marcar como bloqueada
      const evidence = project.evidence.map((e) =>
        e.id === evId ? { ...e, blocked: true } : e
      );
      onUpdate({ ...project, evidence });
      return;
    }
    const evidence = project.evidence.map((e) =>
      e.id === evId ? { ...e, verified: true, blocked: false } : e
    );
    onUpdate({ ...project, evidence });
  };

  const handleDeleteEvidence = (evId: string) => {
    onUpdate({ ...project, evidence: project.evidence.filter((e) => e.id !== evId) });
  };

  const handleSetTestStatus = (testId: string, status: TestStatus) => {
    const tests = project.tests.map((t) =>
      t.id === testId ? { ...t, status, lastRun: new Date().toISOString() } : t
    );
    const updated = { ...project, tests };
    // Re-aplicar gate a evidencias
    const newGate = evaluateQualityGate(updated);
    const evidence = updated.evidence.map((e) =>
      e.verified ? e : { ...e, blocked: !newGate.canApprove }
    );
    onUpdate({ ...updated, evidence });
  };

  const handleAddTest = (name: string, mandatory: boolean) => {
    const test: ProjectTest = {
      id: generateId(),
      name,
      mandatory,
      status: 'pending',
      lastRun: null,
    };
    onUpdate({ ...project, tests: [...project.tests, test] });
  };

  const handleDeleteTest = (testId: string) => {
    onUpdate({ ...project, tests: project.tests.filter((t) => t.id !== testId) });
  };

  const handleSetStatus = (status: Project['status']) => {
    if (status === 'completed' && !gate.canApprove) {
      setGateWarning('⛔ BLOQUEADO: No se puede completar. Una prueba obligatoria está fallando.');
      setTimeout(() => setGateWarning(null), 4000);
      return;
    }
    onUpdate({ ...project, status });
  };

  const handleIncrementRevision = () => {
    onUpdate({ ...project, revision: project.revision + 1 });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1 transition-colors"
      >
        <span aria-hidden="true">←</span> Volver a proyectos
      </button>

      {/* Gate Warning */}
      {gateWarning && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{gateWarning}</span>
          <button onClick={() => setGateWarning(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Revisión {project.revision}
          </span>
          <StatusBadge status={project.status} />
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            gate.canApprove ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            Gate: {gate.canApprove ? 'APROBADO' : 'BLOQUEADO'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h2>
        <p className="text-gray-600 mb-4">{project.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{project.tasks.length}</div>
            <div className="text-xs text-gray-500">Tareas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-xs text-gray-500">Completadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{verifiedEvidence}</div>
            <div className="text-xs text-gray-500">Verificadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{project.tests.length}</div>
            <div className="text-xs text-gray-500">Pruebas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${gate.canApprove ? 'text-green-600' : 'text-red-600'}`}>
              {gate.totalFailed}
            </div>
            <div className="text-xs text-gray-500">Fallos</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => handleSetStatus('review')}
            disabled={project.status === 'review' || project.status === 'completed'}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40 transition-colors"
          >
            → En revisión
          </button>
          <button
            onClick={() => handleSetStatus('completed')}
            disabled={project.status === 'completed' || !gate.canApprove}
            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-40 transition-colors"
            title={!gate.canApprove ? 'Bloqueado por quality gate' : ''}
          >
            ✓ Completar
          </button>
          <button
            onClick={handleIncrementRevision}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            + Revisión
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['tests', 'tasks', 'evidence'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'tests' && `🧪 Pruebas (${project.tests.length})`}
            {tab === 'tasks' && `📋 Tareas (${project.tasks.length})`}
            {tab === 'evidence' && `📎 Evidencias (${project.evidence.length})`}
          </button>
        ))}
      </div>

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <QualityGatePanel
          project={project}
          onSetTestStatus={handleSetTestStatus}
          onAddTest={handleAddTest}
          onDeleteTest={handleDeleteTest}
        />
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Nueva tarea..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTask}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Añadir
            </button>
          </div>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay tareas todavía.</p>
          ) : (
            <ul className="space-y-2">
              {project.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md group">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === 'evidence' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          {!gate.canApprove && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-md">
              ⛔ Quality gate bloqueado. Las evidencias no pueden verificarse hasta que todas las pruebas obligatorias pasen.
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newEvidenceDesc}
              onChange={(e) => setNewEvidenceDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEvidence()}
              placeholder="Describir evidencia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddEvidence}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Añadir
            </button>
          </div>
          {project.evidence.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay evidencias todavía.</p>
          ) : (
            <ul className="space-y-2">
              {project.evidence.map((ev) => (
                <li
                  key={ev.id}
                  className={`flex items-center gap-3 p-3 rounded-md group ${
                    ev.blocked ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => handleVerifyEvidence(ev.id)}
                    disabled={ev.verified || ev.blocked}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                      ev.verified
                        ? 'bg-green-500 border-green-500 text-white'
                        : ev.blocked
                        ? 'border-red-300 bg-red-100 cursor-not-allowed'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    title={
                      ev.verified
                        ? 'Verificado'
                        : ev.blocked
                        ? 'Bloqueado por quality gate'
                        : 'Marcar como verificado'
                    }
                  >
                    {ev.verified && '✓'}
                    {ev.blocked && !ev.verified && '⛔'}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${ev.verified ? 'text-gray-500' : ev.blocked ? 'text-red-600' : 'text-gray-700'}`}>
                      {ev.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(ev.date)}
                      {ev.blocked && !ev.verified && (
                        <span className="text-red-500 ml-2">— bloqueada por gate</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvidence(ev.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo proyecto</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del proyecto"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={() => onCreate(title.trim(), description.trim())}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App principal ─────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = loadData();
    return saved ?? createInitialData();
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const selectedProject = data.projects.find((p) => p.id === selectedProjectId) || null;
  const stats = getStats(data);

  const handleCreateProject = (title: string, description: string) => {
    setData(createProject(data, title, description));
    setShowNewProject(false);
    notify('Proyecto creado.');
  };

  const handleUpdateProject = (updated: Project) => {
    setData({
      ...data,
      projects: data.projects.map((p) => (p.id === updated.id ? updated : p)),
    });
  };

  const handleExport = () => {
    exportData(data);
    notify('Datos exportados.');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const imported = await importDataFromFile(file);
      if (imported) {
        setData(imported);
        notify('Datos importados.');
      } else {
        notify('Error: archivo no válido.');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Montemolín <span className="text-gray-400 font-normal">·</span>{' '}
                <span className="text-blue-600">Open Factory</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Fase 2 · Código versionado + Quality Gate</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Importar
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Storage Notice */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <span>⚠️</span>
            Datos en este navegador · Exporta una copia para conservarlos. Sin sincronización de equipo ni conexión a IA.
          </p>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            onUpdate={handleUpdateProject}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : (
          <>
            {/* Hero */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                De la necesidad a la evidencia
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Proyectos en construcción</h2>
              <p className="text-gray-600">
                Organiza el trabajo. Revisa cada versión. Conserva lo que demuestra el resultado.
              </p>
            </div>

            {/* Quality Gate Rule */}
            <div className="mb-6 bg-gray-900 text-white rounded-lg p-4 flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="text-sm font-semibold">Regla irrenunciable</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria, aunque la IA declare que funciona.
                </p>
              </div>
            </div>

            {/* New Project */}
            <button
              onClick={() => setShowNewProject(true)}
              className="mb-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Nuevo proyecto
            </button>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
                <div className="text-xs text-gray-500 mt-1">Proyectos</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.openTasks}</div>
                <div className="text-xs text-gray-500 mt-1">Tareas abiertas</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.verifiedEvidence}</div>
                <div className="text-xs text-gray-500 mt-1">Entregas verificadas</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className={`text-3xl font-bold ${stats.failedMandatory > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.failedMandatory}
                </div>
                <div className="text-xs text-gray-500 mt-1">Gates bloqueados</div>
              </div>
            </div>

            {/* Project List */}
            {data.projects.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-400 text-lg mb-2">No hay proyectos todavía</p>
                <p className="text-gray-400 text-sm">Crea tu primer proyecto para empezar.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => setSelectedProjectId(project.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Montemolín Open Factory · Fase 2
          </p>
          <p className="text-xs text-gray-400">
            {stats.totalTests} pruebas registradas · {stats.totalProjects} proyectos
          </p>
        </div>
      </footer>

      {/* Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
