import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export default function AttachDateModal({ isOpen, initialDate, onCancel, onSave }) {
  const [selected, setSelected] = React.useState(initialDate || new Date());
  React.useEffect(() => {
    if (isOpen) {
      setSelected(initialDate || new Date());
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-5 w-full max-w-md mx-4 z-10">
        <h3 className="text-lg font-semibold mb-3">Select a date</h3>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => d && setSelected(d)}
          weekStartsOn={1}
          showOutsideDays
          fixedWeeks
          captionLayout="dropdown-buttons"
        />
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
            onClick={() => onSave?.(selected)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}






