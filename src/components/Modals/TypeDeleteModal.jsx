import React from 'react';

export default function TypeDeleteModal({ isOpen, type, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Delete Type</h2>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to delete “{type?.name}”? This will remove the type. Any dependent UI using this type may need to be updated.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.(type)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


