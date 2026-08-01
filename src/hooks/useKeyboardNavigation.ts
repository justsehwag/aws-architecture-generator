"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Options for the keyboard navigation hook.
 */
interface UseKeyboardNavigationOptions {
  /** Selector for focusable items within the container */
  itemSelector?: string;
  /** Whether navigation wraps around at the ends */
  wrap?: boolean;
  /** Orientation for arrow key navigation */
  orientation?: "horizontal" | "vertical" | "both";
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Callback when Enter is pressed on an item */
  onSelect?: (element: HTMLElement) => void;
  /** Whether the keyboard navigation is active */
  enabled?: boolean;
}

/**
 * Hook for managing keyboard navigation patterns within a container.
 *
 * Supports:
 * - Arrow keys (Up/Down for vertical, Left/Right for horizontal) to move focus between items
 * - Home/End to jump to first/last item
 * - Enter to select/activate the focused item
 * - Escape to close/dismiss (calls onEscape callback)
 * - Tab/Shift+Tab continue to work for standard flow navigation
 *
 * @example
 * ```tsx
 * function SidebarNav() {
 *   const containerRef = useKeyboardNavigation({
 *     orientation: 'vertical',
 *     wrap: true,
 *     onEscape: () => closeSidebar(),
 *     onSelect: (el) => el.click(),
 *   });
 *
 *   return (
 *     <nav ref={containerRef} role="navigation">
 *       <a href="/dashboard">Dashboard</a>
 *       <a href="/create">Create</a>
 *     </nav>
 *   );
 * }
 * ```
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>({
  itemSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  wrap = true,
  orientation = "vertical",
  onEscape,
  onSelect,
  enabled = true,
}: UseKeyboardNavigationOptions = {}) {
  const containerRef = useRef<T>(null);

  const getFocusableItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(itemSelector));
  }, [itemSelector]);

  const focusItem = useCallback((items: HTMLElement[], index: number) => {
    if (index >= 0 && index < items.length) {
      items[index].focus();
    }
  }, []);

  const getCurrentIndex = useCallback(
    (items: HTMLElement[]): number => {
      const activeElement = document.activeElement as HTMLElement;
      return items.indexOf(activeElement);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const items = getFocusableItems();
      if (items.length === 0) return;

      const currentIndex = getCurrentIndex(items);
      let nextIndex = currentIndex;
      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          if (orientation === "vertical" || orientation === "both") {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = wrap ? 0 : items.length - 1;
            }
            handled = true;
          }
          break;
        }
        case "ArrowUp": {
          if (orientation === "vertical" || orientation === "both") {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? items.length - 1 : 0;
            }
            handled = true;
          }
          break;
        }
        case "ArrowRight": {
          if (orientation === "horizontal" || orientation === "both") {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = wrap ? 0 : items.length - 1;
            }
            handled = true;
          }
          break;
        }
        case "ArrowLeft": {
          if (orientation === "horizontal" || orientation === "both") {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? items.length - 1 : 0;
            }
            handled = true;
          }
          break;
        }
        case "Home": {
          nextIndex = 0;
          handled = true;
          break;
        }
        case "End": {
          nextIndex = items.length - 1;
          handled = true;
          break;
        }
        case "Enter":
        case " ": {
          if (currentIndex >= 0 && onSelect) {
            onSelect(items[currentIndex]);
            handled = true;
          }
          break;
        }
        case "Escape": {
          if (onEscape) {
            onEscape();
            handled = true;
          }
          break;
        }
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
        if (nextIndex !== currentIndex) {
          focusItem(items, nextIndex);
        }
      }
    },
    [enabled, getFocusableItems, getCurrentIndex, focusItem, wrap, orientation, onEscape, onSelect]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return containerRef;
}
