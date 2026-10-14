import { useState, useEffect, useCallback } from 'react';

// Types
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface Evidence {
  id: string;
  description: string;
  date: string;
  verified: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  revision: number;
  status: 'construction' | 'review' | 'completed';
  tasks: Task[];
  evidence: Evidence[];
  createdAt: string;
}

interface AppData {
  projects: Project[];
}

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 11);

const STORAGE_KEY = 'montemolin-open-factory';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    projects: [
      {
        id: generateId(),
        title: 'Gestor de proyectos y evidencias',
        description: 'Primer encargo interno: registrar solicitudes, organizar tareas, revisar versiones y conservar las pruebas de cada entrega.',
        revision: 1,
        status: 'construction' as const,
        tasks: [],
        evidence: [],
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

// Components
function StatusBadge({ status }: { status: Project['status'] }) {
  const config = {
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

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
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
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{project.title}</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{project.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-500">
          <span>
            <strong className="text-gray-700">{completedTasks}/{totalTasks}</strong> tareas
          </span>
          <span>
            <strong className="text-gray-700">{evidenceCount}</strong> evidencias
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'evidence'>('tasks');

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: generateId(),
      title: newTaskTitle.trim(),
      completed: false,
    };
    onUpdate({ ...project, tasks: [...project.tasks, task] });
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    const tasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...project, tasks });
  };

  const deleteTask = (taskId: string) => {
    onUpdate({ ...project, tasks: project.tasks.filter((t) => t.id !== taskId) });
  };

  const addEvidence = () => {
    if (!newEvidenceDesc.trim()) return;
    const ev: Evidence = {
      id: generateId(),
      description: newEvidenceDesc.trim(),
      date: new Date().toISOString(),
      verified: false,
    };
    onUpdate({ ...project, evidence: [...project.evidence, ev] });
    setNewEvidenceDesc('');
  };

  const toggleVerified = (evId: string) => {
    const evidence = project.evidence.map((e) =>
      e.id === evId ? { ...e, verified: !e.verified } : e
    );
    onUpdate({ ...project, evidence });
  };

  const deleteEvidence = (evId: string) => {
    onUpdate({ ...project, evidence: project.evidence.filter((e) => e.id !== evId) });
  };

  const completedTasks = project.tasks.filter((t) => t.completed).length;
  const verifiedEvidence = project.evidence.filter((e) => e.verified).length;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1 transition-colors"
      >
        <span aria-hidden="true">←</span> Volver a proyectos
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Revisión {project.revision}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h2>
        <p className="text-gray-600 mb-4">{project.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{project.tasks.length}</div>
            <div className="text-xs text-gray-500">Tareas totales</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-xs text-gray-500">Completadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{project.evidence.length}</div>
            <div className="text-xs text-gray-500">Evidencias</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{verifiedEvidence}</div>
            <div className="text-xs text-gray-500">Verificadas</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tareas ({project.tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'evidence'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Evidencias ({project.evidence.length})
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Nueva tarea..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTask}
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
                <li
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md group"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm"
                    title="Eliminar tarea"
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
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newEvidenceDesc}
              onChange={(e) => setNewEvidenceDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEvidence()}
              placeholder="Describir evidencia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addEvidence}
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
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md group"
                >
                  <button
                    onClick={() => toggleVerified(ev.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                      ev.verified
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    title={ev.verified ? 'Verificado por ejecutor' : 'Marcar como verificado'}
                  >
                    {ev.verified && '✓'}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${ev.verified ? 'text-gray-500' : 'text-gray-700'}`}>
                      {ev.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(ev.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEvidence(ev.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm"
                    title="Eliminar evidencia"
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

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), description.trim());
  };

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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve del proyecto"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const selectedProject = data.projects.find((p) => p.id === selectedProjectId) || null;

  const totalTasks = data.projects.reduce((sum, p) => sum + p.tasks.filter((t) => !t.completed).length, 0);
  const totalEvidence = data.projects.reduce((sum, p) => sum + p.evidence.length, 0);
  const totalVerified = data.projects.reduce((sum, p) => sum + p.evidence.filter((e) => e.verified).length, 0);

  const createProject = (title: string, description: string) => {
    const newProject: Project = {
      id: generateId(),
      title,
      description: description || 'Sin descripción.',
      revision: 1,
      status: 'construction',
      tasks: [],
      evidence: [],
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, projects: [...data.projects, newProject] });
    setShowNewProject(false);
    showNotification('Proyecto creado correctamente.');
  };

  const updateProject = (updated: Project) => {
    setData({
      ...data,
      projects: data.projects.map((p) => (p.id === updated.id ? updated : p)),
    });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `montemolin-open-factory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Datos exportados correctamente.');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as AppData;
          if (imported.projects && Array.isArray(imported.projects)) {
            setData(imported);
            showNotification('Datos importados correctamente.');
          } else {
            showNotification('Error: formato de archivo no válido.');
          }
        } catch {
          showNotification('Error: no se pudo leer el archivo.');
        }
      };
      reader.readAsText(file);
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
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Importar copia
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Exportar todo
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            onUpdate={updateProject}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : (
          <>
            {/* Hero Section */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                De la necesidad a la evidencia
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Proyectos en construcción</h2>
              <p className="text-gray-600">
                Organiza el trabajo. Revisa cada versión. Conserva lo que demuestra el resultado.
              </p>
            </div>

            {/* New Project Button */}
            <button
              onClick={() => setShowNewProject(true)}
              className="mb-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Nuevo proyecto
            </button>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-gray-900">{data.projects.length}</div>
                <div className="text-xs text-gray-500 mt-1">Proyectos registrados</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{totalTasks}</div>
                <div className="text-xs text-gray-500 mt-1">Tareas abiertas</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{totalEvidence}</div>
                <div className="text-xs text-gray-500 mt-1">Evidencias aportadas</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{totalVerified}</div>
                <div className="text-xs text-gray-500 mt-1">Entregas verificadas</div>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-gray-400 text-center">
            Montemolín Open Factory · Gestión local de proyectos y evidencias
          </p>
        </div>
      </footer>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
}
