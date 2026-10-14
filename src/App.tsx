import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AppData,
  Project,
  ProjectTest,
  TestStatus,
  ActivityEntry,
  SearchResult,
} from './core/types';
import {
  createInitialData,
  createProject,
  addTask,
  toggleTask,
  deleteTask,
  addEvidence,
  verifyEvidence,
  deleteEvidence,
  linkEvidenceToTask,
  addTest,
  setTestStatus,
  deleteTest,
  setProjectStatus,
  incrementRevision,
  importData,
  getStats,
  evaluateQualityGate,
  gateMessage,
} from './core/projects';
import { loadData, saveData, exportData, importDataFromFile } from './core/storage';
import { formatDate, generateId } from './core/utils';
import { getRecentEntries, formatActionLabel } from './core/activity-log';
import { searchAll } from './core/search';
import { calculateComplianceMetrics } from './core/compliance';
import { downloadReport } from './core/report';

// ─── Iconos ────────────────────────────────────────────────────────

function Icon({ name, className = '' }: { name: string; className?: string }) {
  const icons: Record<string, string> = {
    search: '🔍',
    activity: '📋',
    chart: '📊',
    report: '📄',
    lock: '🔒',
    check: '✓',
    cross: '✕',
    arrow: '→',
    link: '🔗',
    unlink: '⊘',
  };
  return <span className={className}>{icons[name] || '•'}</span>;
}

// ─── Badges ────────────────────────────────────────────────────────

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

// ─── Search Bar ────────────────────────────────────────────────────

function SearchBar({
  data,
  onSelectProject,
}: {
  data: AppData;
  onSelectProject: (projectId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => searchAll(data, query), [data, query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <Icon name="search" className="text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar en proyectos, tareas, evidencias..."
          className="flex-1 text-sm bg-transparent focus:outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} className="text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {results.slice(0, 20).map((r, i) => (
            <button
              key={`${r.type}-${r.itemId}-${i}`}
              onClick={() => {
                onSelectProject(r.projectId);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium uppercase">
                  {r.type === 'project' ? '📁' : r.type === 'task' ? '📋' : r.type === 'evidence' ? '📎' : '🧪'}
                  {r.type}
                </span>
                <span className="text-sm text-gray-900 truncate">{r.title}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{r.subtitle}</p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <p className="text-sm text-gray-400 text-center">Sin resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Compliance Dashboard ──────────────────────────────────────────

function ComplianceDashboard({ data }: { data: AppData }) {
  const metrics = calculateComplianceMetrics(data);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="chart" /> Dashboard de Cumplimiento
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Cumplimiento"
          value={`${metrics.complianceRate}%`}
          color={metrics.complianceRate >= 80 ? 'green' : metrics.complianceRate >= 50 ? 'amber' : 'red'}
        />
        <MetricCard
          label="Trazabilidad"
          value={`${metrics.traceabilityRate}%`}
          color={metrics.traceabilityRate >= 80 ? 'green' : metrics.traceabilityRate >= 50 ? 'amber' : 'red'}
        />
        <MetricCard
          label="Proyectos"
          value={`${metrics.completedProjects}/${metrics.totalProjects}`}
          color="blue"
        />
        <MetricCard
          label="Bloqueados"
          value={`${metrics.blockedProjects}`}
          color={metrics.blockedProjects > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniStat label="Pruebas pasadas" value={metrics.passedTests} total={metrics.totalTests} />
        <MiniStat label="Evidencias verificadas" value={metrics.verifiedEvidence} total={metrics.totalEvidence} />
        <MiniStat label="Tareas completadas" value={metrics.completedTasks} total={metrics.totalTasks} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600 bg-green-50 border-green-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${colors[color] || colors.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-75 mt-0.5">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}/{total}</span>
      </div>
      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Activity Timeline ─────────────────────────────────────────────

function ActivityTimeline({ entries, limit }: { entries: ActivityEntry[]; limit?: number }) {
  const shown = limit ? entries.slice(0, limit) : entries;

  if (shown.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sin actividad registrada.</p>;
  }

  return (
    <div className="space-y-1">
      {shown.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-900">
                {formatActionLabel(entry.action)}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(entry.timestamp)}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">{entry.detail}</p>
            {entry.projectName && (
              <span className="text-xs text-gray-400">en {entry.projectName}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Quality Gate Panel ────────────────────────────────────────────

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
      <div
        className={`px-5 py-3 border-b ${
          gate.canApprove ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
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
              gate.canApprove ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
            }`}
          >
            {gate.canApprove ? 'APROBADO' : 'BLOQUEADO'}
          </span>
        </div>
        <p className={`text-xs mt-1 ${gate.canApprove ? 'text-green-700' : 'text-red-700'}`}>
          {gateMessage(gate)}
        </p>
      </div>

      <div className="p-4">
        {project.tests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No hay pruebas registradas.</p>
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
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    test.mandatory ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                  }`}
                  title={test.mandatory ? 'Obligatoria — bloquea entregas' : 'Informativa'}
                >
                  {test.mandatory ? 'OBL' : 'OPT'}
                </span>
                <span className="flex-1 text-sm text-gray-700 truncate">{test.name}</span>
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
                {test.lastRun && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {formatDate(test.lastRun)}
                  </span>
                )}
                <button
                  onClick={() => onDeleteTest(test.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

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

// ─── Project Card ──────────────────────────────────────────────────

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const gate = evaluateQualityGate(project);
  const completedTasks = project.tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Rev. {project.revision}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <span className={`text-sm ${gate.canApprove ? 'text-green-500' : 'text-red-500'}`}>
          {gate.canApprove ? '🟢' : '🔴'}
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{project.title}</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">{project.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-gray-500">
          <span><strong className="text-gray-700">{completedTasks}/{project.tasks.length}</strong> tareas</span>
          <span><strong className="text-gray-700">{project.evidence.length}</strong> evid.</span>
          <span><strong className="text-gray-700">{project.tests.length}</strong> tests</span>
        </div>
        <button
          onClick={onOpen}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          Abrir ↗
        </button>
      </div>
    </div>
  );
}

// ─── Project Detail ────────────────────────────────────────────────

function ProjectDetail({
  project,
  data,
  onUpdate,
  onBack,
}: {
  project: Project;
  data: AppData;
  onUpdate: (project: Project) => void;
  onBack: () => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newEvidenceTaskLink, setNewEvidenceTaskLink] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tests' | 'tasks' | 'evidence' | 'activity'>('tests');
  const [gateWarning, setGateWarning] = useState<string | null>(null);

  const gate = evaluateQualityGate(project);
  const completedTasks = project.tasks.filter((t) => t.completed).length;
  const verifiedEvidence = project.evidence.filter((e) => e.verified).length;

  const showWarning = (msg: string) => {
    setGateWarning(msg);
    setTimeout(() => setGateWarning(null), 4000);
  };

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
      linkedTaskId: newEvidenceTaskLink || null,
    };
    onUpdate({ ...project, evidence: [...project.evidence, ev] });
    setNewEvidenceDesc('');
    setNewEvidenceTaskLink('');
  };

  const handleVerifyEvidence = (evId: string) => {
    if (!gate.canApprove) {
      showWarning('⛔ BLOQUEADO: No se puede verificar. Prueba obligatoria fallando.');
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

  const handleLinkEvidence = (evId: string, taskId: string | null) => {
    const evidence = project.evidence.map((e) =>
      e.id === evId ? { ...e, linkedTaskId: taskId } : e
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
      showWarning('⛔ BLOQUEADO: No se puede completar. Prueba obligatoria fallando.');
      return;
    }
    onUpdate({ ...project, status });
  };

  const handleIncrementRevision = () => {
    onUpdate({ ...project, revision: project.revision + 1 });
  };

  // Activity log for this project
  const projectActivity = data.activityLog.entries.filter(
    (e) => e.projectId === project.id
  );

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← Volver a proyectos
      </button>

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

        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => handleSetStatus('review')}
            disabled={project.status === 'review' || project.status === 'completed'}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40"
          >
            → En revisión
          </button>
          <button
            onClick={() => handleSetStatus('completed')}
            disabled={project.status === 'completed' || !gate.canApprove}
            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-40"
            title={!gate.canApprove ? 'Bloqueado por quality gate' : ''}
          >
            ✓ Completar
          </button>
          <button
            onClick={handleIncrementRevision}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            + Revisión
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'tests', label: `🧪 Pruebas (${project.tests.length})` },
          { key: 'tasks', label: `📋 Tareas (${project.tasks.length})` },
          { key: 'evidence', label: `📎 Evidencias (${project.evidence.length})` },
          { key: 'activity', label: `📋 Actividad (${projectActivity.length})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
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
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
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
                  <span className="text-xs text-gray-400">
                    {project.evidence.filter((e) => e.linkedTaskId === task.id).length} evid.
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
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newEvidenceDesc}
              onChange={(e) => setNewEvidenceDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEvidence()}
              placeholder="Describir evidencia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newEvidenceTaskLink}
              onChange={(e) => setNewEvidenceTaskLink(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="">Sin vincular</option>
              {project.tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button
              onClick={handleAddEvidence}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Añadir
            </button>
          </div>
          {project.evidence.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay evidencias todavía.</p>
          ) : (
            <ul className="space-y-2">
              {project.evidence.map((ev) => {
                const linkedTask = ev.linkedTaskId
                  ? project.tasks.find((t) => t.id === ev.linkedTaskId)
                  : null;
                return (
                  <li
                    key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-md group ${
                      ev.blocked ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => handleVerifyEvidence(ev.id)}
                      disabled={ev.verified || ev.blocked}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs mt-0.5 shrink-0 ${
                        ev.verified
                          ? 'bg-green-500 border-green-500 text-white'
                          : ev.blocked
                          ? 'border-red-300 bg-red-100 cursor-not-allowed'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {ev.verified && '✓'}
                      {ev.blocked && !ev.verified && '⛔'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${ev.verified ? 'text-gray-500' : ev.blocked ? 'text-red-600' : 'text-gray-700'}`}>
                        {ev.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{formatDate(ev.date)}</span>
                        {ev.blocked && !ev.verified && (
                          <span className="text-xs text-red-500">— bloqueada por gate</span>
                        )}
                        {linkedTask ? (
                          <span className="text-xs text-blue-600 flex items-center gap-0.5">
                            🔗 {linkedTask.title}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">⊘ Sin vincular</span>
                        )}
                      </div>
                      {/* Link selector */}
                      <select
                        value={ev.linkedTaskId || ''}
                        onChange={(e) => handleLinkEvidence(ev.id, e.target.value || null)}
                        className="mt-1 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                      >
                        <option value="">Sin vincular</option>
                        {project.tasks.map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleDeleteEvidence(ev.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-bold text-gray-900 mb-3">Historial de actividad</h3>
          <ActivityTimeline entries={projectActivity} />
        </div>
      )}
    </div>
  );
}

// ─── New Project Modal ─────────────────────────────────────────────

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
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
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
    if (saved) {
      // Migración: si no tiene activityLog, añadir uno vacío
      if (!saved.activityLog) {
        return { ...saved, activityLog: { entries: [] } };
      }
      // Migración: si las evidencias no tienen linkedTaskId, añadirlo
      const migrated = {
        ...saved,
        projects: saved.projects.map((p) => ({
          ...p,
          evidence: p.evidence.map((e) => ({
            ...e,
            linkedTaskId: e.linkedTaskId ?? null,
          })),
        })),
      };
      return migrated;
    }
    return createInitialData();
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const selectedProject = data.projects.find((p) => p.id === selectedProjectId) || null;
  const stats = getStats(data);
  const recentActivity = getRecentEntries(data.activityLog, 10);

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

  const handleReport = () => {
    downloadReport(data);
    notify('Informe descargado.');
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
        // Migración al importar
        const migrated: AppData = {
          projects: (imported.projects || []).map((p) => ({
            ...p,
            evidence: (p.evidence || []).map((e) => ({
              ...e,
              linkedTaskId: e.linkedTaskId ?? null,
            })),
          })),
          activityLog: imported.activityLog || { entries: [] },
        };
        setData(importData(data, migrated));
        notify('Datos importados.');
      } else {
        notify('Error: archivo no válido.');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Montemolín <span className="text-gray-400 font-normal">·</span>{' '}
                <span className="text-blue-600">Open Factory</span>
              </h1>
              <p className="text-xs text-gray-400">Fase 3 · Trazabilidad y evidencia</p>
            </div>
            <div className="flex-1 max-w-md hidden sm:block">
              <SearchBar data={data} onSelectProject={setSelectedProjectId} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Actividad reciente"
              >
                📋
              </button>
              <button
                onClick={handleReport}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Descargar informe"
              >
                📄
              </button>
              <button
                onClick={handleImport}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Importar
              </button>
              <button
                onClick={handleExport}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Exportar
              </button>
            </div>
          </div>
          {/* Mobile search */}
          <div className="sm:hidden mt-2">
            <SearchBar data={data} onSelectProject={setSelectedProjectId} />
          </div>
        </div>
      </header>

      {/* Activity dropdown */}
      {showActivity && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-gray-900">Actividad reciente</h3>
              <button onClick={() => setShowActivity(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <ActivityTimeline entries={recentActivity} />
          </div>
        </div>
      )}

      {/* Storage Notice */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <span>⚠️</span>
            Datos en este navegador · Exporta una copia para conservarlos. Sin sincronización ni conexión a IA.
          </p>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            data={data}
            onUpdate={handleUpdateProject}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : (
          <>
            <div className="mb-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                De la necesidad a la evidencia
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Proyectos en construcción</h2>
              <p className="text-gray-600">
                Organiza el trabajo. Revisa cada versión. Conserva lo que demuestra el resultado.
              </p>
            </div>

            {/* Rule */}
            <div className="mb-6 bg-gray-900 text-white rounded-lg p-4 flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="text-sm font-semibold">Regla irrenunciable</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria, aunque la IA declare que funciona.
                </p>
              </div>
            </div>

            {/* Compliance Dashboard */}
            <div className="mb-6">
              <ComplianceDashboard data={data} />
            </div>

            {/* New Project */}
            <button
              onClick={() => setShowNewProject(true)}
              className="mb-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
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
                <div className="text-xs text-gray-500 mt-1">Verificadas</div>
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

            {/* Recent Activity */}
            {data.activityLog.entries.length > 0 && (
              <div className="mt-8 bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  📋 Actividad reciente
                </h3>
                <ActivityTimeline entries={recentActivity} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400">
            Montemolín Open Factory · Fase 3
          </p>
          <p className="text-xs text-gray-400">
            {data.activityLog.entries.length} acciones · {stats.totalProjects} proyectos · {stats.totalTests} pruebas
          </p>
        </div>
      </footer>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
