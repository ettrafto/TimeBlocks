import React from 'react';
import { useCreatePageStore } from '../../store/createPageStore.js';

export default function TaskEditorModal({ isOpen, task, types = [], onSave, onCancel }) {
  const [title, setTitle] = React.useState('');
  const [typeId, setTypeId] = React.useState('');
  const cps = useCreatePageStore();
  const subtasks = (task?.id && cps.subtasksByTask?.[Number(task.id)]) || [];
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');

  React.useEffect(() => {
    // Initialize fields when the modal opens or when the editing target changes meaningfully
    if (!isOpen) return;
    if (task) {
      setTitle(task.title || task.name || '');
      const tId = task.type_id != null ? String(task.type_id) : (task.typeId != null ? String(task.typeId) : '');
      setTypeId(tId);
      if (task.id && (!Array.isArray(subtasks) || subtasks.length === 0)) {
        try { cps.loadSubtasks?.(Number(task.id)); } catch {}
      }
    } else {
      setTitle('');
      setTypeId(types[0] ? String(types[0].id) : '');
    }
    setNewSubtaskTitle('');
  }, [isOpen, task?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {task ? 'Edit Task' : 'Create Task'}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSave?.({
              id: task?.id,
              title: title.trim(),
              type_id: typeId ? Number(typeId) : undefined,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {/* Subtasks Editor */}
          {task?.id != null && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtasks</label>
              <div className="space-y-2">
                {(subtasks || []).length === 0 && (
                  <div className="text-xs text-gray-500">No subtasks yet.</div>
                )}
                {(subtasks || []).map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={st.title}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== st.title) {
                          cps.updateSubtask?.(st.id, { title: v });
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => cps.removeSubtask?.(st.id)}
                      className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      title="Delete subtask"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-10.5 0V6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 15.75 6v1.5M6.75 7.5l.75 10.5a2.25 2.25 0 0 0 2.25 2.25h4.5a2.25 2.25 0 0 0 2.25-2.25l.75-10.5" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="New subtask title"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const v = newSubtaskTitle.trim();
                      if (!v) return;
                      await cps.addSubtask?.(Number(task.id), v);
                      setNewSubtaskTitle('');
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
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
              {task ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


