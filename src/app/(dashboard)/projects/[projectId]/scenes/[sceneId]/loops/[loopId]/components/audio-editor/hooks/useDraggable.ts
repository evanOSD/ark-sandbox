"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseDraggableReturn {
  handleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  resetPosition: () => void;
}

/**
 * useDraggable — makes a fixed-position centered element draggable by a handle.
 *
 * Usage:
 *   const { handleMouseDown } = useDraggable(isOpen);
 *
 *   On the drag handle:  onMouseDown={handleMouseDown}
 */
export function useDraggable(isOpen: boolean): UseDraggableReturn {
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLElement | null>(null);

  // Reset offset and style when dialog closes
  useEffect(() => {
    if (!isOpen) {
      dragOffset.current = { x: 0, y: 0 };
      if (panelRef.current) {
        panelRef.current.style.transform = "";
      }
    }
  }, [isOpen]);

  // Clean up refs on unmount
  useEffect(() => {
    return () => {
      panelRef.current = null;
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;

    // Get the panel element (DialogContent) — traverse up from the drag handle
    const handle = e.currentTarget;
    const panel = handle.closest<HTMLElement>("[data-slot='dialog-content']") ?? handle.parentElement;
    if (!panel) return;
    panelRef.current = panel;

    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialOffsetX = dragOffset.current.x;
    const initialOffsetY = dragOffset.current.y;

    // Prevent text selection and show grabbing cursor during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    let currentX = initialOffsetX;
    let currentY = initialOffsetY;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      currentX = initialOffsetX + dx;
      currentY = initialOffsetY + dy;

      // Directly update the transform style of the DOM node for buttery smooth dragging
      panel.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
    };

    const onMouseUp = () => {
      dragOffset.current = { x: currentX, y: currentY };
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const resetPosition = useCallback(() => {
    dragOffset.current = { x: 0, y: 0 };
    if (panelRef.current) {
      panelRef.current.style.transform = "";
    }
  }, []);

  return { handleMouseDown, resetPosition };
}
