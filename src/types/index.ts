// Architecture types
export type {
  AWSServiceType,
  ArchitectureSpec,
  ServiceNode,
  Connection,
  ResourceGroup,
  ArchitectureMetadata,
} from './architecture';

// API types
export type {
  GenerationPreferences,
  GenerateDiagramRequest,
  GenerateDiagramResponse,
  ArchitectureExplanation,
  ServiceDescription,
  ExportOptions,
  ExportRequest,
  ExportResponse,
} from './api';

// Analysis types
export type {
  WellArchitectedPillar,
  PillarAssessment,
  WellArchitectedAssessment,
  RecommendationCategory,
  Severity,
  Recommendation,
  MissingComponent,
  ArchitectureAnalysis,
} from './analysis';

// Cost types
export type {
  UsageAssumptions,
  ServiceCost,
  CostEstimate,
} from './cost';

// Version types
export type {
  DiagramVersion,
  IaCRequest,
  IaCResponse,
} from './version';

// Template types
export type {
  TemplateCategory,
  Template,
  SaveTemplateRequest,
  TemplateListItem,
} from './template';

// Auth types
export type {
  AuthUser,
  AuthProvider,
  AuthState,
  AuthError,
  AuthErrorCode,
  SignUpInput,
  SignInInput,
  AuthContextValue,
  LockoutState,
} from './auth';

export {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  TOKEN_REFRESH_TIMEOUT_MS,
} from './auth';
