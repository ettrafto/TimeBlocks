import React, { useState, useRef, useEffect } from 'react';
import { COLOR_OPTIONS } from '../../constants/colors';

// Plus icon
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// Use shared calendar palette site-wide

export default function AddProjectCard({ onCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);
  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
        setTitle('');
        setSelectedColor(COLOR_OPTIONS[0].hex);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus title input when modal opens
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleModalKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setTitle('');
      setSelectedColor(COLOR_OPTIONS[0].hex);
    }
  };

  const handleCreate = () => {
    if (title.trim()) {
      const colorOption = COLOR_OPTIONS.find(c => c.hex === selectedColor) || COLOR_OPTIONS[0];
      onCreate({
        title: title.trim(),
        color: colorOption.hex,
      });
      setIsOpen(false);
      setTitle('');
      setSelectedColor(COLOR_OPTIONS[0].hex);
    }
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <>
      <div className="w-full flex flex-col justify-start">
        <button
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-[56px] rounded-2xl border border-dashed border-neutral-600/70 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-300 hover:bg-neutral-900/35 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500"
          aria-label="Create a new project"
        >
          + New Project
        </button>
      </div>

      {/* Modal for creating project */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              setTitle('');
              setSelectedColor(COLOR_OPTIONS[0].hex);
            }
          }}
          onKeyDown={handleModalKeyDown}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
          >
            <h2 id="create-project-title" className="text-lg font-semibold text-gray-900">
              Create Project
            </h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Title</span>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Project name"
                  autoFocus
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-700">Color</span>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.hex)}
                      className={`
                        w-10 h-10 rounded-full
                        border-2 ${selectedColor === color.hex ? 'border-gray-800' : 'border-white'}
                        hover:scale-110 transition-transform duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      `}
                      style={{ background: color.hex }}
                      title={color.name}
                      aria-label={`Select ${color.name} color`}
                    />
                  ))}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setTitle('');
                  setSelectedColor(COLOR_OPTIONS[0].hex);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

