import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function HorizontalScrollbar({ scrollContainerRef, onScroll }) {
  const scrollbarRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollInfoRef = useRef({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });
  const trackWidthRef = useRef(0);
  const [scrollInfo, setScrollInfo] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });
  const [trackWidth, setTrackWidth] = useState(0);
  const rafRef = useRef(null);

  // Optimized scroll update - always update immediately for responsiveness
  const updateScrollbarPosition = useCallback(() => {
    const container = scrollContainerRef?.current;
    const track = trackRef?.current;
    const thumb = scrollbarRef?.current;
    
    if (!container || !track) return;

    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const currentTrackWidth = track.clientWidth || container.clientWidth;

    scrollInfoRef.current = { scrollLeft, scrollWidth, clientWidth };
    trackWidthRef.current = currentTrackWidth;

    // Always update state immediately for responsiveness
    setScrollInfo({ scrollLeft, scrollWidth, clientWidth });
    setTrackWidth(currentTrackWidth);

    // Direct DOM update for thumb position (no React re-render during drag)
    if (thumb && !draggingRef.current) {
      const canScroll = scrollWidth > clientWidth;
      const effectiveTrackWidth = currentTrackWidth || clientWidth;
      const thumbWidth = Math.max(20, (clientWidth / scrollWidth) * effectiveTrackWidth);
      const maxThumbLeft = effectiveTrackWidth - thumbWidth;
      const thumbLeft = canScroll && maxThumbLeft > 0 && (scrollWidth - clientWidth) > 0
        ? (scrollLeft / (scrollWidth - clientWidth)) * maxThumbLeft
        : 0;

      thumb.style.transform = `translateX(${thumbLeft}px)`;
      thumb.style.width = `${thumbWidth}px`;
    }
  }, [scrollContainerRef]);

  // Update scrollbar position when container scrolls - use RAF for smooth updates
  useEffect(() => {
    const container = scrollContainerRef?.current;
    const track = trackRef?.current;
    if (!container) return;

    // Initial update
    updateScrollbarPosition();
    
    // Use RAF for scroll events to batch updates smoothly
    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateScrollbarPosition();
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen for resize to update scrollbar
    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarPosition();
    });
    resizeObserver.observe(container);
    if (track) {
      resizeObserver.observe(track);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [scrollContainerRef, updateScrollbarPosition]);

  // Calculate scrollbar dimensions
  const canScroll = scrollInfo.scrollWidth > scrollInfo.clientWidth;
  const effectiveTrackWidth = trackWidth || scrollInfo.clientWidth;
  const thumbWidth = Math.max(20, (scrollInfo.clientWidth / scrollInfo.scrollWidth) * effectiveTrackWidth);
  const maxThumbLeft = effectiveTrackWidth - thumbWidth;
  const thumbLeft = canScroll && maxThumbLeft > 0 && (scrollInfo.scrollWidth - scrollInfo.clientWidth) > 0
    ? (scrollInfo.scrollLeft / (scrollInfo.scrollWidth - scrollInfo.clientWidth)) * maxThumbLeft
    : 0;

  // Handle drag start on scrollbar
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (!scrollContainerRef?.current) return;

    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef.current.scrollLeft;

    // Capture pointer for smooth dragging
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
    }

    // Add document-level listeners for smooth dragging
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    document.documentElement.classList.add('select-none');
    document.body.style.userSelect = 'none';
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (!scrollContainerRef?.current) return;
    if (draggingRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef.current.scrollLeft;

    // Add document-level listeners for smooth dragging
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mouseleave', endDrag);

    document.documentElement.classList.add('select-none');
    document.body.style.userSelect = 'none';
  };

  // Extremely responsive drag move handler - no RAF delay
  const handleDragMove = useCallback((e) => {
    if (!draggingRef.current || !scrollContainerRef?.current || !trackRef.current) return;
    
    e.preventDefault();
    
    // Process immediately for maximum responsiveness
    const dx = e.clientX - startXRef.current;
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    const currentTrackWidth = track.clientWidth || container.clientWidth;
    const currentThumbWidth = Math.max(20, (container.clientWidth / container.scrollWidth) * currentTrackWidth);
    const maxThumbLeft = currentTrackWidth - currentThumbWidth;
    const scrollRatio = maxThumbLeft > 0 ? (container.scrollWidth - container.clientWidth) / maxThumbLeft : 1;
    const newScrollLeft = startScrollLeftRef.current + (dx * scrollRatio);
    
    // Direct scroll update (no state, no RAF delay)
    container.scrollLeft = Math.max(0, Math.min(newScrollLeft, container.scrollWidth - container.clientWidth));
    
    // Update thumb position directly (no React re-render)
    const thumb = scrollbarRef.current;
    if (thumb) {
      const newThumbLeft = maxThumbLeft > 0 && (container.scrollWidth - container.clientWidth) > 0
        ? (container.scrollLeft / (container.scrollWidth - container.clientWidth)) * maxThumbLeft
        : 0;
      thumb.style.transform = `translateX(${newThumbLeft}px)`;
    }
    
    // Update refs for state sync (but don't trigger re-render during drag)
    scrollInfoRef.current = {
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
    };
  }, [scrollContainerRef]);

  // Note: handlePointerMove and handleMouseMove are handled at document level during drag

  // Handle drag end
  const endDrag = useCallback((e) => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    setIsDragging(false);

    // Release pointer capture
    if (e && e.target && e.target.releasePointerCapture && e.pointerId !== undefined) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
    }

    // Remove document-level listeners
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', endDrag);
    document.removeEventListener('pointercancel', endDrag);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('mouseleave', endDrag);

    document.documentElement.classList.remove('select-none');
    document.body.style.userSelect = '';

    // Force update scrollbar position after drag ends
    updateScrollbarPosition();
  }, [handleDragMove, updateScrollbarPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        setIsDragging(false);
        // Remove any document-level listeners
        document.removeEventListener('pointermove', handleDragMove);
        document.removeEventListener('pointerup', endDrag);
        document.removeEventListener('pointercancel', endDrag);
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('mouseleave', endDrag);
        document.documentElement.classList.remove('select-none');
        document.body.style.userSelect = '';
      }
    };
  }, [handleDragMove, endDrag]);

  // Handle track click (jump to position)
  const handleTrackClick = (e) => {
    if (!trackRef.current || !scrollContainerRef?.current) return;
    if (e.target.closest('.scrollbar-thumb')) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const effectiveWidth = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / effectiveWidth));
    const container = scrollContainerRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    container.scrollLeft = ratio * maxScroll;
  };

  // Always render scrollbar, but hide thumb if can't scroll
  return (
    <div className="w-full px-4 mb-2 shrink-0">
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className={`relative h-4 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors ${
          !canScroll ? 'opacity-30' : ''
        }`}
        role="scrollbar"
        aria-orientation="horizontal"
        aria-valuenow={scrollInfo.scrollLeft}
        aria-valuemin={0}
        aria-valuemax={scrollInfo.scrollWidth - scrollInfo.clientWidth}
      >
        {canScroll && (
          <div
            ref={scrollbarRef}
            className={`scrollbar-thumb absolute top-0 h-full bg-gray-500 rounded-full cursor-grab ${
              isDragging ? 'cursor-grabbing bg-gray-600' : 'hover:bg-gray-600'
            }`}
            style={{
              transform: `translateX(${thumbLeft}px)`,
              width: `${thumbWidth}px`,
              transition: isDragging ? 'none' : 'background-color 0.2s ease',
              willChange: isDragging ? 'transform' : 'auto',
              pointerEvents: 'auto',
            }}
          onPointerDown={handlePointerDown}
          onMouseDown={handleMouseDown}
          role="slider"
          tabIndex={0}
          />
        )}
      </div>
    </div>
  );
}

