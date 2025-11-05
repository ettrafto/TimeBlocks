import React, { useState } from 'react';
import SubNav from '../components/Create/SubNav';
import ProjectsView from '../components/Create/ProjectsView';
import RecurringSchedulesView from '../components/Create/RecurringSchedulesView';

// Helper functions for generating IDs
const generateProjectId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);

  // Project handlers
  const handleAddProject = ({ title, color }) => {
    const newProject = {
      id: generateProjectId(),
      title: title || 'Untitled Project',
      color: color || '#7c3aed',
      tasks: []
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
      subtasks: [],
      isSubtasksOpen: false
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

  const handleRemoveTask = (projectId, taskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }
        : p
    ));
  };

  // Subtask handlers
  const handleToggleSubtasks = (projectId, taskId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? { ...t, isSubtasksOpen: !t.isSubtasksOpen, subtasks: t.subtasks || [] }
                : t
            )
          }
        : p
    ));
  };

  const handleAddSubtask = (projectId, taskId) => {
    const newSubtask = {
      id: generateSubtaskId(),
      title: 'New subtask'
    };
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            tasks: (p.tasks || []).map(t =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: [...(t.subtasks || []), newSubtask],
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
                    subtasks: (t.subtasks || []).map(s =>
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
                    subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId)
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

  const handleProjectChange = (updatedProject) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

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

