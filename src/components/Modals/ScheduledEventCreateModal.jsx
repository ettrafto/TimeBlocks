import React from 'react';

export default function ScheduledEventCreateModal({ isOpen, eventDraft, types = [], onSave, onCancel }) {
  const [title, setTitle] = React.useState('');
  const [typeId, setTypeId] = React.useState('');

  React.useEffect(() => {
    // Initialize fields when opening or when the draft context changes meaningfully
    if (!isOpen) return;
    if (eventDraft) {
      setTitle(eventDraft.label || eventDraft.name || '');
      setTypeId(eventDraft.typeId != null ? String(eventDraft.typeId) : '');
    } else {
      setTitle('');
      setTypeId(types[0] ? String(types[0].id) : '');
    }
  }, [isOpen, eventDraft?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Create Event</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSave?.({ title: title.trim(), typeId: typeId || null });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


