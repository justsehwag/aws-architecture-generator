"use client";

import { useCallback, useRef, useState } from "react";

export interface PanZoomState {
  translateX: number;
  translateY: number;
  scale: number;
}

export interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  zoomStep?: number;
}

const DEFAULT_OPTIONS: Required<UsePanZoomOptions> = {
  minScale: 0.1,
  maxScale: 5,
  zoomStep: 0.1,
};

export interface UsePanZoomReturn {
  transform: PanZoomState;
  containerRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: (contentWidth: number, contentHeight: number) => void;
  isPanning: boolean;
}

/**
 * Hook for handling pan (mouse drag) and zoom (scroll wheel) on a canvas.
 * Tracks transform state (translateX, translateY, scale).
 * Constrains zoom between configurable min/max (default 0.1x to 5x).
 */
export function usePanZoom(options?: UsePanZoomOptions): UsePanZoomReturn {
  const { minScale, maxScale, zoomStep } = { ...DEFAULT_OPTIONS, ...options };

  const [transform, setTransform] = useState<PanZoomState>({
    translateX: 0,
    translateY: 0,
    scale: 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);

  const clampScale = useCallback(
    (scale: number) => Math.min(maxScale, Math.max(minScale, scale)),
    [minScale, maxScale]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with middle mouse button or left button with space-like behavior
    if (e.button === 1 || (e.button === 0 && !e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !lastMousePos.current) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      setTransform((prev) => ({
        ...prev,
        translateX: prev.translateX + dx,
        translateY: prev.translateY + dy,
      }));

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    lastMousePos.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;

      setTransform((prev) => {
        const newScale = clampScale(prev.scale + delta);

        // Zoom toward mouse position
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const scaleFactor = newScale / prev.scale;
          const newTranslateX =
            mouseX - (mouseX - prev.translateX) * scaleFactor;
          const newTranslateY =
            mouseY - (mouseY - prev.translateY) * scaleFactor;

          return {
            translateX: newTranslateX,
            translateY: newTranslateY,
            scale: newScale,
          };
        }

        return { ...prev, scale: newScale };
      });
    },
    [clampScale, zoomStep]
  );

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: clampScale(prev.scale + zoomStep),
    }));
  }, [clampScale, zoomStep]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: clampScale(prev.scale - zoomStep),
    }));
  }, [clampScale, zoomStep]);

  const resetZoom = useCallback(() => {
    setTransform({ translateX: 0, translateY: 0, scale: 1 });
  }, []);

  const fitToScreen = useCallback(
    (contentWidth: number, contentHeight: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const padding = 40;

      const scaleX = (rect.width - padding * 2) / contentWidth;
      const scaleY = (rect.height - padding * 2) / contentHeight;
      const newScale = clampScale(Math.min(scaleX, scaleY));

      const translateX =
        (rect.width - contentWidth * newScale) / 2;
      const translateY =
        (rect.height - contentHeight * newScale) / 2;

      setTransform({ translateX, translateY, scale: newScale });
    },
    [clampScale]
  );

  return {
    transform,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    isPanning,
  };
}
