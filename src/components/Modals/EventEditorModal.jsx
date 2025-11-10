import React from 'react';
import { COLOR_OPTIONS } from '../../constants/colors';

// ========================================
// COMPONENT: EventEditorModal (create/edit event templates)
// ========================================

export default function EventEditorModal({ isOpen, editingEvent, onSave, onCancel, types }) {
  const [name, setName] = React.useState('');
  const [duration, setDuration] = React.useState(30);
  const [color, setColor] = React.useState('bg-blue-500');
  const [typeId, setTypeId] = React.useState('');

  // Populate form when editing
  React.useEffect(() => {
    // Initialize form values when opening or when the editing target changes
    if (!isOpen) return;
    if (editingEvent) {
      setName(editingEvent.name || '');
      setDuration(editingEvent.duration || 30);
      setColor(editingEvent.color || 'bg-blue-500');
      setTypeId(editingEvent.typeId || '');
    } else {
      // Reset form for new event
      setName('');
      setDuration(30);
      setColor('bg-blue-500');
      setTypeId('');
    }
  }, [isOpen, editingEvent?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an event name');
      return;
    }
    
    onSave({
      id: editingEvent?.id || `template-${Date.now()}`,
      name: name.trim(),
      duration,
      color,
      typeId: typeId || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingEvent ? 'Edit Event' : 'Create New Event'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team Meeting"
              required
            />
          </div>

          {/* Duration Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={75}>75 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={105}>105 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`${colorOption.value} h-10 rounded border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-gray-800 ring-2 ring-gray-400'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type (optional)
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Type</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {types.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No types available. Click "Types" button to create one.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              {editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

