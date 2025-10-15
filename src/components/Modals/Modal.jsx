// ========================================
// COMPONENT: Modal (reusable confirmation dialog)
// ========================================

export default function Modal({ isOpen, title, children, onConfirm, onCancel }) {
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="text-gray-600 mb-6">{children}</div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}

