import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKeyDown(options: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", {
    ...options,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("calls onUndo when Ctrl+Z is pressed", () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }));

    fireKeyDown({ key: "z", ctrlKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("calls onRedo when Ctrl+Y is pressed", () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRedo }));

    fireKeyDown({ key: "y", ctrlKey: true });

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("calls onRedo when Ctrl+Shift+Z is pressed", () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRedo }));

    fireKeyDown({ key: "Z", ctrlKey: true, shiftKey: true });

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("does not fire when enabled is false", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo, enabled: false }));

    fireKeyDown({ key: "z", ctrlKey: true });
    fireKeyDown({ key: "y", ctrlKey: true });

    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("does not fire without Ctrl/Meta modifier", () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }));

    fireKeyDown({ key: "z" });

    expect(onUndo).not.toHaveBeenCalled();
  });

  it("works with Meta key (Cmd on Mac)", () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }));

    fireKeyDown({ key: "z", metaKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("cleans up event listener on unmount", () => {
    const onUndo = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onUndo }));

    unmount();

    fireKeyDown({ key: "z", ctrlKey: true });

    expect(onUndo).not.toHaveBeenCalled();
  });
});
