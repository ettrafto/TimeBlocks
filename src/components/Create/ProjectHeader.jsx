import React, { useState, useRef, useEffect } from 'react';
import { COLOR_OPTIONS } from '../../constants/colors';

export default function ProjectHeader({ project, onTitleChange, onColorChange, textColor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [title, setTitle] = useState(project.title || '');
  const colorPickerRef = useRef(null);

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (title.trim() && title !== project.title) {
      onTitleChange(project.id, title.trim());
    } else {
      setTitle(project.title || '');
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setTitle(project.title || '');
      setIsEditing(false);
    }
  };

  const currentColor = COLOR_OPTIONS.find(c => c.hex === project.color) || COLOR_OPTIONS[0];
  const textColorStyle = textColor || '#111111';

  return (
    <div className="flex items-center gap-3">
      {/* Editable Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        className="flex-1 bg-transparent border-none outline-none font-semibold text-base placeholder:opacity-70 focus:outline-none"
        style={{ color: textColorStyle }}
        placeholder="Project name"
      />

      {/* Color Selector */}
      <div className="relative" ref={colorPickerRef}>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-6 h-6 rounded-full border-2 border-white/50 hover:scale-110 transition-transform duration-200 cursor-pointer"
          style={{ background: currentColor.hex }}
          title="Change color"
          aria-label="Change project color"
        />

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    onColorChange(project.id, color.hex);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 ${project.color === color.hex ? 'border-gray-800' : 'border-white'} hover:scale-110 transition-transform duration-200`}
                  style={{ background: color.hex }}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

