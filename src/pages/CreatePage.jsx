import React, { useEffect, useMemo, useState } from 'react';
import { COLOR_OPTIONS } from '../constants/colors';
import SubNav from '../components/Create/SubNav';
import ProjectsView from '../components/Create/ProjectsView';
import RecurringSchedulesView from '../components/Create/RecurringSchedulesView';
import { useCreatePageStore } from '../store/createPageStore';
import { useTypesStore } from '../state/typesStore';

// Helper functions for generating IDs
const generateProjectId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState('projects');
  const { types, tasksByType, subtasksByTask, loading, init, addType, updateType, removeType, addTask, updateTask, removeTask, loadSubtasks, addSubtask, updateSubtask, removeSubtask } = useCreatePageStore();
  const [openTasks, setOpenTasks] = useState({});
  const [openedOnce, setOpenedOnce] = useState(false);
  const typesGlobal = useTypesStore((s) => s.items);

  useEffect(() => {
    console.log('[CreatePage] mount -> init()');
    init();
  }, [init]);

  // Auto-open subtasks for all tasks on initial load, and lazy-load their subtasks
  useEffect(() => {
    if (openedOnce) return;
    if (!types || types.length === 0) return;
    const allTasks = Object.values(tasksByType || {}).flat();
    if (allTasks.length === 0) return;

    const map = {};
    for (const t of allTasks) {
      if (!t || t.id == null) continue;
      map[t.id] = true;
      // Trigger lazy-load for each task's subtasks (store guards against duplicates)
      try { loadSubtasks?.(t.id, { force: false }); } catch {}
    }
    setOpenTasks(map);
    setOpenedOnce(true);
  }, [types, tasksByType, loadSubtasks, openedOnce]);

  // Map backend types/tasks/subtasks to ProjectsView model
  const projects = useMemo(() => {
    console.log('[CreatePage] types changed, mapping projects', types);
    return (types || []).map((t) => {
      const tasks = (tasksByType[t.id] || []).map((task) => ({
        id: task.id,
        title: task.title,
        duration: Number.isFinite(Number(task.duration)) ? Number(task.duration) : 30,
        isSubtasksOpen: !!openTasks[task.id],
        subtasks: (subtasksByTask[task.id] || []).map((s) => ({ id: s.id, title: s.title }))
      }));
      return {
        id: t.id,
        title: t.name,
        color: t.color || COLOR_OPTIONS[0].hex,
        tasks
      };
    });
  }, [types, tasksByType, subtasksByTask, openTasks]);

  // Sync Create store types with global types store (calendar) when CreatePage is mounted
  useEffect(() => {
    if (!Array.isArray(typesGlobal) || typesGlobal.length === 0) return;
    // Merge name/color from global into create store when they differ
    useCreatePageStore.setState((s) => {
      if (!Array.isArray(s.types) || s.types.length === 0) return s;
      const map = new Map(typesGlobal.map(t => [String(t.id), t]));
      let changed = false;
      const nextTypes = s.types.map(loc => {
        const g = map.get(String(loc.id));
        if (!g) return loc;
        const newColor = g.color ?? loc.color;
        const newName = g.name ?? loc.name;
        if (newColor !== loc.color || newName !== loc.name) {
          changed = true;
          return { ...loc, name: newName, color: newColor };
        }
        return loc;
      });
      if (changed) {
        console.log('[CreatePage] Synced types from global store → create store');
        return { ...s, types: nextTypes };
      }
      return s;
    });
  }, [typesGlobal]);

  // Project handlers
  const handleAddProject = async ({ title, color }) => {
    await addType({ name: title || 'Untitled', color });
    // Refresh types store for calendar without full reload
    try { await useTypesStore.getState().loadAll({ force: true }); } catch {}
  };

  const handleTitleChange = async (projectId, newTitle) => {
    await updateType(projectId, { name: newTitle });
    try { await useTypesStore.getState().update(projectId, { name: newTitle }); } catch {}
  };

  const handleColorChange = async (projectId, newColor) => {
    await updateType(projectId, { color: newColor });
    try { await useTypesStore.getState().update(projectId, { color: newColor }); } catch {}
  };

  // Task handlers
  const handleAddTask = async (projectId) => {
    await addTask({ type_id: projectId, title: 'New Task' });
  };

  const handleTaskTitleChange = async (_projectId, taskId, newTitle) => {
    await updateTask(taskId, { title: newTitle });
  };

  const handleRemoveTask = async (_projectId, taskId) => {
    await removeTask(taskId);
  };

  // Subtask handlers
  const handleToggleSubtasks = async (_projectId, taskId) => {
    setOpenTasks((m) => ({ ...m, [taskId]: !m[taskId] }));
    // Lazy-load subtasks when opening
    if (!openTasks[taskId]) {
      await loadSubtasks(taskId);
    }
  };

  const handleAddSubtask = async (_projectId, taskId) => {
    await addSubtask(taskId, 'New subtask');
    setOpenTasks((m) => ({ ...m, [taskId]: true }));
  };

  const handleUpdateSubtaskTitle = async (_projectId, _taskId, subtaskId, newTitle) => {
    await updateSubtask(subtaskId, { title: newTitle });
  };

  const handleRemoveSubtask = async (_projectId, _taskId, subtaskId) => {
    await removeSubtask(subtaskId);
  };

  const handleSubTaskClick = (projectId, taskId) => {
    handleToggleSubtasks(projectId, taskId);
  };

  // Link-to-date removed

  const handleClockClick = (projectId, taskId) => {
    // Placeholder for future time assignment
    console.log('Clock clicked for project:', projectId, 'task:', taskId);
  };

  const handleProjectChange = async (_updatedProject) => {};

  return (
    <div data-testid="create-page-root" className="flex flex-col h-full bg-gray-50 pt-[57px]">
      {/* Sub Navigation */}
      <SubNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'projects' && (
          <div className="h-full">
            <ProjectsView
              projects={projects}
              onAddProject={handleAddProject}
              onTitleChange={handleTitleChange}
              onColorChange={handleColorChange}
              onAddTask={handleAddTask}
              onTaskTitleChange={handleTaskTitleChange}
              onSubTaskClick={handleSubTaskClick}
              onToggleSubtasks={handleToggleSubtasks}
              onAddSubtask={handleAddSubtask}
              onUpdateSubtaskTitle={handleUpdateSubtaskTitle}
              onRemoveSubtask={handleRemoveSubtask}
              onClockClick={handleClockClick}
              onRemoveTask={handleRemoveTask}
              onProjectChange={handleProjectChange}
            />
          </div>
        )}
        {activeTab === 'recurring' && <RecurringSchedulesView />}
      </div>
    </div>
  );
}

// Also export a named version for environments that fail default detection
export { CreatePage };

