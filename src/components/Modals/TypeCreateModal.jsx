import React from 'react';

// Reuse the same UI/behavior as TypeEditorModal, but present as a dedicated create modal
export default function TypeCreateModal({ isOpen, onSave, onCancel }) {
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState('#6b7280');

  const COLOR_HEX_OPTIONS = [
    '#3b82f6', '#a855f7', '#22c55e', '#f97316', '#ef4444',
    '#eab308', '#ec4899', '#6366f1', '#14b8a6', '#06b6d4',
  ];

  React.useEffect(() => {
    if (!isOpen) {
      setName('');
      setColor('#6b7280');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Create Type</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave?.({ name: name.trim(), color });
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="grid grid-cols-5 gap-3">
              {COLOR_HEX_OPTIONS.map((hex) => {
                const selected = color === hex;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${selected ? 'ring-2 ring-blue-500 border-white scale-105' : 'border-white/80 hover:scale-105'}`}
                    style={{ background: hex }}
                    title={hex}
                    aria-label={`Pick ${hex}`}
                  />
                );
              })}
            </div>
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


