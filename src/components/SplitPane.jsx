// src/components/SplitPane.jsx
import React, { useEffect, useRef } from 'react';
import { layoutStore } from '../state/layoutStore';

function useLayout() {
  const [, force] = React.useReducer(x => x + 1, 0);
  useEffect(() => layoutStore.subscribe(force), []);
  return layoutStore.get();
}

/**
 * SplitPane
 * Props:
 *   left: ReactNode
 *   right: ReactNode
 *   collapseThresholdPx = 40   // auto-close if narrower on release
 *   minPx = 160                // soft minimum while dragging (still can close)
 */
export default function SplitPane({
  left,
  right,
  collapseThresholdPx = 40,
  minPx = 160,
}) {
  const containerRef = useRef(null);
  const handleRef = useRef(null);
  const { sidebarOpen, sidebarWidthPx, containerWidthPx } = useLayout();

  // Measure container via ResizeObserver and push into store
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      layoutStore.setContainerWidthPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pointer capture based drag
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const onPointerDown = (e) => {
      // Left click or primary touch
      handle.setPointerCapture(e.pointerId);
      layoutStore.setResizing(true);
      const startX = e.clientX;
      const startPx = layoutStore.get().sidebarWidthPx;
      const cw = layoutStore.get().containerWidthPx || containerRef.current?.clientWidth || 0;
      const maxPx = Math.round(cw * 0.5);

      const onPointerMove = (ev) => {
        if (!handle.hasPointerCapture(ev.pointerId)) return;
        const dx = ev.clientX - startX;
        let next = startPx + dx;
        // allow sliding from closed to open
        if (!layoutStore.get().sidebarOpen && next > 0) {
          layoutStore.setOpen(true);
        }
        // soft min (minPx) but allow going below to hit "close"
        next = Math.max(0, next);
        layoutStore.setWidthPx(Math.min(next, maxPx || next));
      };

      const onPointerUp = (ev) => {
        if (handle.hasPointerCapture(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
        layoutStore.setResizing(false);
        const px = layoutStore.get().sidebarWidthPx;
        if (px < collapseThresholdPx) {
          layoutStore.setOpen(false);
          layoutStore.setWidthPx(minPx); // keep a sensible width for next open
        } else {
          layoutStore.setOpen(true);
        }
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', onPointerUp);
        handle.removeEventListener('pointercancel', onPointerUp);
      };

      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerUp);
    };

    handle.addEventListener('pointerdown', onPointerDown);
    return () => handle.removeEventListener('pointerdown', onPointerDown);
  }, [collapseThresholdPx, minPx]);

  // Compute styles: flex-basis in px (no width/flex conflicts)
  const leftStyle = sidebarOpen
    ? { flex: `0 0 ${sidebarWidthPx}px` }
    : { flex: '0 0 0px' };

  return (
    <div ref={containerRef} className="relative flex w-full h-full overflow-hidden">
      {/* LEFT */}
      <div
        className={`h-full transition-[flex-basis] duration-150 ease-out`}
        style={leftStyle}
      >
        <div className={`h-full ${sidebarOpen ? '' : '-translate-x-full'} transition-transform duration-150`}>
          {left}
        </div>
      </div>

      {/* DIVIDER / RESIZER */}
      <div
        ref={handleRef}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize menu"
        tabIndex={0}
        className="
          z-30 h-full w-3 shrink-0 cursor-col-resize
          bg-transparent hover:bg-neutral-800/40 active:bg-neutral-800/60
          touch-none select-none
        "
        onKeyDown={(e) => {
          const step = 24; // px step with keyboard
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            layoutStore.setWidthPx(layoutStore.get().sidebarWidthPx - step);
            if (layoutStore.get().sidebarWidthPx <= 0) layoutStore.setOpen(false);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (!layoutStore.get().sidebarOpen) layoutStore.setOpen(true);
            layoutStore.setWidthPx(layoutStore.get().sidebarWidthPx + step);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            layoutStore.setOpen(!layoutStore.get().sidebarOpen);
          } else if (e.key.toLowerCase() === 'escape') {
            e.preventDefault();
            layoutStore.setOpen(false);
          }
        }}
      />

      {/* RIGHT (fills remaining space) */}
      <div className="h-full flex-1 min-w-0">
        {right}
      </div>
    </div>
  );
}
