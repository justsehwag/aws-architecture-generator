export { docClient, TABLE_NAMES, GSI_NAMES } from './client';
export {
  DatabaseError,
  NotFoundError,
  ConditionalCheckFailedError,
  LimitExceededError,
  ValidationError,
} from './errors';
export {
  createDiagram,
  getDiagram,
  updateDiagram,
  deleteDiagram,
  listUserDiagrams,
} from './diagrams';
export type {
  DiagramRecord,
  DiagramStatus,
  CreateDiagramInput,
  UpdateDiagramInput,
  PaginatedDiagrams,
} from './diagrams';
export {
  createVersion,
  listVersions,
  getVersion,
  countVersions,
  deleteOldestAutosave,
  MAX_VERSIONS_PER_DIAGRAM,
} from './versions';
export type {
  VersionRecord,
  CreateVersionInput,
} from './versions';
export {
  createTemplate,
  getTemplate,
  listBuiltInTemplates,
  listUserTemplates,
  deleteTemplate,
  countUserTemplates,
  createUserTemplate,
  MAX_CUSTOM_TEMPLATES_PER_USER,
} from './templates';
export type {
  TemplateRecord,
  CreateTemplateInput,
} from './templates';
