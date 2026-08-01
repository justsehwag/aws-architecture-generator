"use client";

import * as React from "react";
import {
  parseDiagramXml,
  type DiagramNode,
  type DiagramEdge,
  type ParsedDiagram,
} from "@/lib/diagram-engine/xml-parser";

// --- State Types ---

export interface DiagramState {
  /** Raw .drawio XML string */
  xml: string;
  /** Parsed nodes from the diagram */
  nodes: DiagramNode[];
  /** Parsed edges from the diagram */
  edges: DiagramEdge[];
  /** Currently selected node ID */
  selectedNodeId: string | null;
  /** Currently selected edge ID */
  selectedEdgeId: string | null;
  /** Current zoom level */
  zoom: number;
  /** Pan offset */
  panOffset: { x: number; y: number };
  /** Layout orientation */
  layoutOrientation: "horizontal" | "vertical";
}

// --- Action Types ---

type DiagramAction =
  | { type: "SET_DIAGRAM"; xml: string }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SELECT_EDGE"; edgeId: string | null }
  | { type: "DESELECT_ALL" }
  | { type: "UPDATE_NODE_POSITION"; nodeId: string; x: number; y: number }
  | { type: "DELETE_NODE"; nodeId: string }
  | { type: "ADD_EDGE"; edge: DiagramEdge }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN_OFFSET"; x: number; y: number }
  | { type: "SET_LAYOUT_ORIENTATION"; orientation: "horizontal" | "vertical" }
  | { type: "UPDATE_NODE_LABEL"; nodeId: string; label: string }
  | { type: "RESTORE_SNAPSHOT"; nodes: DiagramNode[]; edges: DiagramEdge[] };

// --- Reducer ---

function diagramReducer(state: DiagramState, action: DiagramAction): DiagramState {
  switch (action.type) {
    case "SET_DIAGRAM": {
      const parsed: ParsedDiagram = parseDiagramXml(action.xml);
      return {
        ...state,
        xml: action.xml,
        nodes: parsed.nodes,
        edges: parsed.edges,
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    }
    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId, selectedEdgeId: null };
    case "SELECT_EDGE":
      return { ...state, selectedEdgeId: action.edgeId, selectedNodeId: null };
    case "DESELECT_ALL":
      return { ...state, selectedNodeId: null, selectedEdgeId: null };
    case "UPDATE_NODE_POSITION":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId
            ? { ...node, x: action.x, y: action.y }
            : node
        ),
      };
    case "DELETE_NODE":
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.nodeId),
        edges: state.edges.filter(
          (e) => e.sourceId !== action.nodeId && e.targetId !== action.nodeId
        ),
        selectedNodeId:
          state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      };
    case "ADD_EDGE":
      return {
        ...state,
        edges: [...state.edges, action.edge],
      };
    case "SET_ZOOM":
      return { ...state, zoom: action.zoom };
    case "SET_PAN_OFFSET":
      return { ...state, panOffset: { x: action.x, y: action.y } };
    case "SET_LAYOUT_ORIENTATION":
      return { ...state, layoutOrientation: action.orientation };
    case "UPDATE_NODE_LABEL":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId ? { ...node, label: action.label } : node
        ),
      };
    case "RESTORE_SNAPSHOT":
      return {
        ...state,
        nodes: action.nodes,
        edges: action.edges,
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    default:
      return state;
  }
}

// --- Initial State ---

const initialState: DiagramState = {
  xml: "",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  layoutOrientation: "horizontal",
};

// --- Context ---

interface DiagramContextValue {
  state: DiagramState;
  dispatch: React.Dispatch<DiagramAction>;
  setDiagram: (xml: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  deselectAll: () => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: DiagramEdge) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  setLayoutOrientation: (orientation: "horizontal" | "vertical") => void;
  restoreSnapshot: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
}

const DiagramContext = React.createContext<DiagramContextValue | null>(null);

// --- Provider ---

interface DiagramProviderProps {
  children: React.ReactNode;
  initialXml?: string;
}

export function DiagramProvider({ children, initialXml }: DiagramProviderProps) {
  const [state, dispatch] = React.useReducer(diagramReducer, {
    ...initialState,
    ...(initialXml ? { xml: initialXml, ...parseDiagramXml(initialXml) } : {}),
  });

  // Parse initial XML on mount if provided
  React.useEffect(() => {
    if (initialXml && state.xml !== initialXml) {
      dispatch({ type: "SET_DIAGRAM", xml: initialXml });
    }
  }, [initialXml, state.xml]);

  const setDiagram = React.useCallback((xml: string) => {
    dispatch({ type: "SET_DIAGRAM", xml });
  }, []);

  const selectNode = React.useCallback((nodeId: string | null) => {
    dispatch({ type: "SELECT_NODE", nodeId });
  }, []);

  const selectEdge = React.useCallback((edgeId: string | null) => {
    dispatch({ type: "SELECT_EDGE", edgeId });
  }, []);

  const deselectAll = React.useCallback(() => {
    dispatch({ type: "DESELECT_ALL" });
  }, []);

  const updateNodePosition = React.useCallback(
    (nodeId: string, x: number, y: number) => {
      dispatch({ type: "UPDATE_NODE_POSITION", nodeId, x, y });
    },
    []
  );

  const deleteNode = React.useCallback((nodeId: string) => {
    dispatch({ type: "DELETE_NODE", nodeId });
  }, []);

  const addEdge = React.useCallback((edge: DiagramEdge) => {
    dispatch({ type: "ADD_EDGE", edge });
  }, []);

  const updateNodeLabel = React.useCallback(
    (nodeId: string, label: string) => {
      dispatch({ type: "UPDATE_NODE_LABEL", nodeId, label });
    },
    []
  );

  const setLayoutOrientation = React.useCallback(
    (orientation: "horizontal" | "vertical") => {
      dispatch({ type: "SET_LAYOUT_ORIENTATION", orientation });
    },
    []
  );

  const restoreSnapshot = React.useCallback(
    (nodes: DiagramNode[], edges: DiagramEdge[]) => {
      dispatch({ type: "RESTORE_SNAPSHOT", nodes, edges });
    },
    []
  );

  const value: DiagramContextValue = React.useMemo(
    () => ({
      state,
      dispatch,
      setDiagram,
      selectNode,
      selectEdge,
      deselectAll,
      updateNodePosition,
      deleteNode,
      addEdge,
      updateNodeLabel,
      setLayoutOrientation,
      restoreSnapshot,
    }),
    [
      state,
      setDiagram,
      selectNode,
      selectEdge,
      deselectAll,
      updateNodePosition,
      deleteNode,
      addEdge,
      updateNodeLabel,
      setLayoutOrientation,
      restoreSnapshot,
    ]
  );

  return (
    <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>
  );
}

// --- Hook ---

export function useDiagram(): DiagramContextValue {
  const context = React.useContext(DiagramContext);
  if (!context) {
    throw new Error("useDiagram must be used within a DiagramProvider");
  }
  return context;
}
