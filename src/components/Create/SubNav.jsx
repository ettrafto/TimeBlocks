import React from 'react';

export default function SubNav({ activeTab, onTabChange }) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center gap-1 px-6 py-3">
        <button
          onClick={() => onTabChange('projects')}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${activeTab === 'projects'
              ? 'bg-neutral-800 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }
          `}
        >
          Projects
        </button>
        <button
          onClick={() => onTabChange('recurring')}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${activeTab === 'recurring'
              ? 'bg-neutral-800 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }
          `}
        >
          Recurring Schedules
        </button>
      </div>
    </div>
  );
}

