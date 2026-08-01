// Custom hooks exports
export { useAuth } from './useAuth';
export { useKeyboardNavigation } from './useKeyboardNavigation';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useGenerationState } from './useGenerationState';
export { useUndoRedo } from './useUndoRedo';
export { useDiagramHistory } from './useDiagramHistory';
export type {
  GenerationStatus,
  GenerationError,
  GenerationState,
  UseGenerationStateReturn,
} from './useGenerationState';
export type { UndoRedoState } from './useUndoRedo';
export type { KeyboardShortcutHandlers } from './useKeyboardShortcuts';
export type { DiagramSnapshot, UseDiagramHistoryReturn } from './useDiagramHistory';
export { useExport, SUPPORTED_FORMATS } from './useExport';
export type {
  ExportFormat,
  ExportStatus,
  ExportState,
  UseExportReturn,
} from './useExport';
export { useTemplates } from './useTemplates';
export type {
  TemplateLoadStatus,
  UseTemplatesState,
  UseTemplatesReturn,
} from './useTemplates';
export { useAutosave } from './useAutosave';
export type {
  AutosaveStatus,
  AutosaveState,
  UseAutosaveOptions,
  UseAutosaveReturn,
} from './useAutosave';
export { useCostEstimate } from './useCostEstimate';
export type {
  CostStatus,
  CostState,
  UseCostEstimateReturn,
} from './useCostEstimate';
export { useExplanation } from './useExplanation';
export type {
  ExplanationStatus,
  ExplanationState,
  UseExplanationReturn,
} from './useExplanation';
export { useAnalysis } from './useAnalysis';
export type {
  AnalysisStatus,
  UseAnalysisState,
  UseAnalysisReturn,
} from './useAnalysis';
export { useDashboard } from './useDashboard';
export type {
  RecentDiagram,
  DashboardStats,
  UseDashboardReturn,
} from './useDashboard';
export { useVersionHistory } from './useVersionHistory';
export type {
  VersionHistoryStatus,
  RestoreStatus,
  VersionHistoryState,
  UseVersionHistoryOptions,
  UseVersionHistoryReturn,
} from './useVersionHistory';
export { useOfflineStatus } from './useOfflineStatus';
export type { OfflineStatusState } from './useOfflineStatus';
export { useComparison } from './useComparison';
export type {
  ComparisonStatus,
  ComparisonState,
  UseComparisonReturn,
} from './useComparison';
export { useVoiceInput } from './useVoiceInput';
export type {
  VoiceInputError,
  UseVoiceInputReturn,
} from './useVoiceInput';
