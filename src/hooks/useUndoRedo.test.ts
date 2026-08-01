import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoRedo } from "./useUndoRedo";

describe("useUndoRedo", () => {
  it("initializes with the given state and no undo/redo available", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    expect(result.current.present).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("pushes a new state and enables undo", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });

    expect(result.current.present).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("undoes to previous state and enables redo", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("redoes to the next state", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.present).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("clears future on new push after undo", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toBe(1);
    expect(result.current.canRedo).toBe(true);

    // Push a new state — future should be cleared
    act(() => {
      result.current.push(3);
    });

    expect(result.current.present).toBe(3);
    expect(result.current.canRedo).toBe(false);
  });

  it("handles multiple sequential undo/redo operations", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.push(3);
    });

    // Undo 3 -> 2
    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(2);

    // Undo 2 -> 1
    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(1);

    // Redo 1 -> 2
    act(() => {
      result.current.redo();
    });
    expect(result.current.present).toBe(2);

    // Redo 2 -> 3
    act(() => {
      result.current.redo();
    });
    expect(result.current.present).toBe(3);
  });

  it("limits past stack to 50 entries, dropping oldest", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    // Push 55 states (0 is initial, then 1..55)
    for (let i = 1; i <= 55; i++) {
      act(() => {
        result.current.push(i);
      });
    }

    expect(result.current.present).toBe(55);

    // Undo all the way back — should only go back 50 steps
    let undoCount = 0;
    while (result.current.canUndo) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
    }

    expect(undoCount).toBe(50);
    // Oldest reachable state should be state 5 (we pushed 55 total, kept 50)
    expect(result.current.present).toBe(5);
  });

  it("does nothing on undo when there is no past", () => {
    const { result } = renderHook(() => useUndoRedo<number>(42));

    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toBe(42);
  });

  it("does nothing on redo when there is no future", () => {
    const { result } = renderHook(() => useUndoRedo<number>(42));

    act(() => {
      result.current.redo();
    });

    expect(result.current.present).toBe(42);
  });

  it("reset clears all history and sets new present", () => {
    const { result } = renderHook(() => useUndoRedo<number>(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.reset(99);
    });

    expect(result.current.present).toBe(99);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("works with complex object state", () => {
    interface Snapshot {
      nodes: string[];
      edges: string[];
    }

    const initial: Snapshot = { nodes: ["A"], edges: [] };
    const { result } = renderHook(() => useUndoRedo<Snapshot>(initial));

    const state2: Snapshot = { nodes: ["A", "B"], edges: ["A->B"] };
    act(() => {
      result.current.push(state2);
    });

    expect(result.current.present).toEqual(state2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toEqual(initial);
  });
});
