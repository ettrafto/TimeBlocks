import React, { useRef, useEffect } from 'react';
import ProjectColumn from './ProjectColumn';
import AddProjectCard from './AddProjectCard';
import HorizontalScrollbar from './HorizontalScrollbar';

export default function ProjectsView({ projects, onAddProject, onTitleChange, onColorChange, onAddTask, onTaskTitleChange, onSubTaskClick, onToggleSubtasks, onAddSubtask, onUpdateSubtaskTitle, onRemoveSubtask, onCalendarClick, onClockClick, onRemoveTask, onProjectChange }) {
  const rowRef = useRef(null);
  const prevProjectsLengthRef = useRef(projects.length);

  // Scroll to end when a new project is created
  useEffect(() => {
    if (projects.length > prevProjectsLengthRef.current) {
      // New project was added, scroll to the end
      requestAnimationFrame(() => {
        if (rowRef.current) {
          const lastChild = rowRef.current.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView({
              behavior: 'smooth',
              inline: 'end',
              block: 'nearest',
            });
          }
        }
      });
    }
    prevProjectsLengthRef.current = projects.length;
  }, [projects.length]);


  // Convert vertical wheel to horizontal scroll
  const handleWheel = (e) => {
    if (!rowRef.current) return;
    
    // If the container can scroll horizontally, convert vertical scroll to horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      rowRef.current.scrollLeft += e.deltaY;
    }
  };


  const handleCreateProject = (data) => {
    onAddProject(data);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Horizontal Scrollbar */}
      <HorizontalScrollbar scrollContainerRef={rowRef} />
      
      {/* Projects Row */}
      <div className="flex-1 px-4 py-6 overflow-hidden">
        <div
          id="projects-scroll-row"
          ref={rowRef}
          onWheel={handleWheel}
          className="flex gap-6 overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth pb-2 h-full py-4 bg-transparent no-scrollbar"
          aria-label="Projects Row"
        >
        {/* Project Columns */}
        {projects.map((project) => (
          <div key={project.id} className="snap-start shrink-0 w-1/4 min-w-[280px]">
            <ProjectColumn
              project={project}
              onTitleChange={onTitleChange}
              onColorChange={onColorChange}
              onAddTask={onAddTask}
              onTaskTitleChange={onTaskTitleChange}
              onSubTaskClick={onSubTaskClick}
              onToggleSubtasks={onToggleSubtasks}
              onAddSubtask={onAddSubtask}
              onUpdateSubtaskTitle={onUpdateSubtaskTitle}
              onRemoveSubtask={onRemoveSubtask}
              onCalendarClick={onCalendarClick}
              onClockClick={onClockClick}
              onRemoveTask={onRemoveTask}
              onProjectChange={onProjectChange}
            />
          </div>
        ))}

          {/* Add Project Card - Always last */}
          <div className="snap-start shrink-0 w-1/4 min-w-[280px]">
            <AddProjectCard onCreate={handleCreateProject} />
          </div>
        </div>
      </div>
    </div>
  );
}

