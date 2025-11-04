import React, { useState } from 'react';
import SubNav from './SubNav';
import ProjectsView from './ProjectsView';
import RecurringSchedulesView from './RecurringSchedulesView';

const COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-500', light: 'bg-blue-50' },
  { name: 'Purple', value: 'bg-purple-500', light: 'bg-purple-50' },
  { name: 'Green', value: 'bg-green-500', light: 'bg-green-50' },
  { name: 'Orange', value: 'bg-orange-500', light: 'bg-orange-50' },
  { name: 'Red', value: 'bg-red-500', light: 'bg-red-50' },
  { name: 'Yellow', value: 'bg-yellow-500', light: 'bg-yellow-50' },
  { name: 'Pink', value: 'bg-pink-500', light: 'bg-pink-50' },
  { name: 'Indigo', value: 'bg-indigo-500', light: 'bg-indigo-50' },
  { name: 'Teal', value: 'bg-teal-500', light: 'bg-teal-50' },
  { name: 'Cyan', value: 'bg-cyan-500', light: 'bg-cyan-50' },
];

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);

  // Generate unique IDs
  const generateId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Project handlers
  const handleAddProject = (data) => {
    const newProject = {
      id: generateId(),
      title: data.title || 'New Project',
      color: data.color || COLOR_OPTIONS[0].value,
      tasks: [],
    };
    setProjects([...projects, newProject]);
  };

  const handleTitleChange = (projectId, newTitle) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, title: newTitle } : p
    ));
  };

  const handleColorChange = (projectId, newColor) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, color: newColor } : p
    ));
  };

  // Task handlers
  const handleAddTask = (projectId) => {
    const newTask = {
      id: generateTaskId(),
      title: 'New Task',
    };
    setProjects(projects.map(p => 
      p.id === projectId 
        ? { ...p, tasks: [...(p.tasks || []), newTask] }
        : p
    ));
  };

  const handleTaskTitleChange = (projectId, taskId, newTitle) => {
    setProjects(projects.map(p => 
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t => 
              t.id === taskId ? { ...t, title: newTitle } : t
            )
          }
        : p
    ));
  };

  const handleToggleSubtasks = (projectId, taskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? {
                    ...t,
                    isSubtasksOpen: !t.isSubtasksOpen,
                    subtasks: t.subtasks ?? []
                  }
                : t
            )
          }
        : p
    ));
  };

  const handleAddSubtask = (projectId, taskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: [...(t.subtasks ?? []), { id: generateSubtaskId(), title: 'New subtask' }],
                    isSubtasksOpen: true
                  }
                : t
            )
          }
        : p
    ));
  };

  const handleUpdateSubtaskTitle = (projectId, taskId, subtaskId, newTitle) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: (t.subtasks ?? []).map(s =>
                      s.id === subtaskId ? { ...s, title: newTitle } : s
                    )
                  }
                : t
            )
          }
        : p
    ));
  };

  const handleRemoveSubtask = (projectId, taskId, subtaskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: (t.subtasks ?? []).filter(s => s.id !== subtaskId)
                  }
                : t
            )
          }
        : p
    ));
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

  const handleRemoveTask = (projectId, taskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }
        : p
    ));
  };

  const handleProjectChange = (updatedProject) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sub Navigation */}
      <SubNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content View */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-hidden">
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

