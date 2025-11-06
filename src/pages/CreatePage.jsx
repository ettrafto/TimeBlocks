import React, { useEffect, useMemo, useState } from 'react';
import SubNav from '../components/Create/SubNav';
import ProjectsView from '../components/Create/ProjectsView';
import RecurringSchedulesView from '../components/Create/RecurringSchedulesView';
import { useCreatePageStore } from '../store/createPageStore';

// Helper functions for generating IDs
const generateProjectId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState('projects');
  const { types, tasksByType, subtasksByTask, loading, init, addType, updateType, removeType, addTask, updateTask, removeTask, loadSubtasks, addSubtask, updateSubtask, removeSubtask } = useCreatePageStore();
  const [openTasks, setOpenTasks] = useState({});

  useEffect(() => {
    init();
  }, [init]);

  // Map backend types/tasks/subtasks to ProjectsView model
  const projects = useMemo(() => {
    return (types || []).map((t) => {
      const tasks = (tasksByType[t.id] || []).map((task) => ({
        id: task.id,
        title: task.title,
        isSubtasksOpen: !!openTasks[task.id],
        subtasks: (subtasksByTask[task.id] || []).map((s) => ({ id: s.id, title: s.title }))
      }));
      return {
        id: t.id,
        title: t.name,
        color: t.color || '#7c3aed',
        tasks
      };
    });
  }, [types, tasksByType, subtasksByTask, openTasks]);

  // Project handlers
  const handleAddProject = async ({ title, color }) => {
    await addType({ name: title || 'Untitled', color });
  };

  const handleTitleChange = async (projectId, newTitle) => {
    await updateType(projectId, { name: newTitle });
  };

  const handleColorChange = async (projectId, newColor) => {
    await updateType(projectId, { color: newColor });
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

  const handleCalendarClick = (projectId, taskId) => {
    // Placeholder for future calendar linking
    console.log('Calendar clicked for project:', projectId, 'task:', taskId);
  };

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
              onCalendarClick={handleCalendarClick}
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

