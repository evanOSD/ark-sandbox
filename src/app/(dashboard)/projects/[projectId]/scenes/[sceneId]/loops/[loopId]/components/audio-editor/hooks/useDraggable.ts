"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableReturn {
  position: Position | null;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  resetPosition: () => void;
}

/**
 * useDraggable — makes a fixed-position element draggable by a handle.
 *
 * Usage:
 *   const { position, isDragging, handleMouseDown } = useDraggable();
 *
 *   On the drag handle:  onMouseDown={handleMouseDown}
 *   On the panel:        style={position ? { left: position.x, top: position.y, transform: 'none' } : {}}
 */
export function useDraggable(isOpen: boolean): UseDraggableReturn {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track drag origin — use refs so listeners don't close over stale state
  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });
  const panelRef = useRef<HTMLElement | null>(null);

  // Reset position when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();

    // Get the panel element (DialogContent) — traverse up from the drag handle
    const handle = e.currentTarget;
    const panel = handle.closest<HTMLElement>("[data-slot='dialog-content']") ?? handle.parentElement;
    panelRef.current = panel;

    // Resolve current panel rect — either from recorded position or computed rect
    let panelX: number;
    let panelY: number;

    if (position) {
      panelX = position.x;
      panelY = position.y;
    } else if (panel) {
      const rect = panel.getBoundingClientRect();
      panelX = rect.left;
      panelY = rect.top;
    } else {
      panelX = window.innerWidth / 2 - 400;
      panelY = window.innerHeight / 2 - 200;
    }

    dragOrigin.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX,
      panelY,
    };

    setIsDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragOrigin.current.mouseX;
      const dy = ev.clientY - dragOrigin.current.mouseY;
      setPosition({
        x: dragOrigin.current.panelX + dx,
        y: dragOrigin.current.panelY + dy,
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [position]);

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return { position, isDragging, handleMouseDown, resetPosition };
}
