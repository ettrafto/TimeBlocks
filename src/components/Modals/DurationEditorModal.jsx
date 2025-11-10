import React from 'react';

export default function DurationEditorModal({ isOpen, current = 30, onCancel, onSave }) {
  const [value, setValue] = React.useState(current || 30);
  React.useEffect(() => {
    setValue(current || 30);
  }, [current, isOpen]);

  // Build 15-minute interval options up to 8 hours
  const options = React.useMemo(() => {
    const arr = [];
    for (let m = 15; m <= 480; m += 15) {
      arr.push(m);
    }
    // Ensure current is available if it's an odd value
    if (current && !arr.includes(current)) arr.unshift(current);
    return arr;
  }, [current]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-5 w-full max-w-sm mx-4 z-10">
        <h3 className="text-lg font-semibold mb-3">Edit Duration</h3>
        <label className="block text-sm text-gray-700 mb-1">Duration (minutes)</label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        >
          {options.map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            onClick={() => onSave?.(value)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}


