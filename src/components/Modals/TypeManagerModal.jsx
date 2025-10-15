import React from 'react';
import { COLOR_OPTIONS } from '../../constants/colors';

// ========================================
// COMPONENT: TypeManagerModal (manage event types)
// ========================================

export default function TypeManagerModal({ isOpen, types, onSave, onDelete, onClose, eventTemplates }) {
  const [editingType, setEditingType] = React.useState(null);
  const [typeName, setTypeName] = React.useState('');
  const [typeColor, setTypeColor] = React.useState('bg-gray-500');

  const handleStartEdit = (type) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeColor(type.color || 'bg-gray-500');
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setTypeName('');
    setTypeColor('bg-gray-500');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      alert('Please enter a type name');
      return;
    }

    // Check for duplicate names
    const duplicate = types.find(
      t => t.name.toLowerCase() === typeName.trim().toLowerCase() && t.id !== editingType?.id
    );
    
    if (duplicate) {
      alert(`A type named "${typeName.trim()}" already exists. Please choose a different name.`);
      return;
    }

    onSave({
      id: editingType?.id || `type-${Date.now()}`,
      name: typeName.trim(),
      color: typeColor,
    });

    handleCancelEdit();
  };

  const handleDelete = (type) => {
    // Count how many events reference this type
    const affectedEvents = eventTemplates.filter(e => e.typeId === type.id);
    
    const confirmMessage = affectedEvents.length > 0
      ? `Deleting "${type.name}" will affect ${affectedEvents.length} event(s). They will be set to "No Type". Continue?`
      : `Delete type "${type.name}"?`;
    
    if (window.confirm(confirmMessage)) {
      onDelete(type.id, affectedEvents.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 z-10 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Types</h2>
        
        {/* Type Creation/Edit Form */}
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {editingType ? 'Edit Type' : 'Add New Type'}
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Name</label>
              <input
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Work, Personal"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color (optional)</label>
              <select
                value={typeColor}
                onChange={(e) => setTypeColor(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {COLOR_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {editingType ? 'Save' : 'Add'}
            </button>
            {editingType && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Types List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing Types ({types.length})</h3>
          {types.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No types yet. Add one above!</p>
          ) : (
            types.map(type => {
              const eventsUsingType = eventTemplates.filter(e => e.typeId === type.id).length;
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${type.color || 'bg-gray-400'}`}></div>
                    <span className="font-medium text-gray-800">{type.name}</span>
                    <span className="text-xs text-gray-500">
                      ({eventsUsingType} event{eventsUsingType !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(type)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="Edit type"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Delete type"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

