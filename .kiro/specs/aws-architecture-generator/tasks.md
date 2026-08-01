# Implementation Plan: AWS Architecture Generator

## Overview

This implementation plan breaks down the AWS Architecture Generator into incremental coding tasks. The application is a Next.js full-stack web application (React + TypeScript + TailwindCSS + shadcn/ui) that converts natural language descriptions into professional AWS architecture diagrams via the Draw.io MCP Server, backed by a serverless AWS infrastructure (CloudFront, S3, API Gateway, Lambda, Cognito, DynamoDB).

Tasks are organized to build foundational infrastructure first, then core generation pipeline, editing capabilities, and finally advanced features. Each task builds on previous work with no orphaned code.

## Tasks

- [x] 1. Set up project structure, tooling, and core interfaces
  - [x] 1.1 Initialize Next.js project with TypeScript, TailwindCSS, shadcn/ui, and configure ESLint, Prettier, Vitest, fast-check, and Playwright
    - Create Next.js App Router project with `create-next-app`
    - Configure `tsconfig.json` with strict mode
    - Install and configure TailwindCSS with custom theme (light/dark)
    - Install shadcn/ui and initialize with default components
    - Configure Vitest for unit/integration tests, fast-check for property tests
    - Configure Playwright for E2E tests
    - Set up path aliases (`@/components`, `@/lib`, `@/types`, etc.)
    - _Requirements: 12.1, 12.2, 12.5_

  - [x] 1.2 Define core TypeScript interfaces and type definitions
    - Create `types/architecture.ts` with `ArchitectureSpec`, `ServiceNode`, `Connection`, `ResourceGroup`, `ArchitectureMetadata`
    - Create `types/api.ts` with `GenerateDiagramRequest`, `GenerateDiagramResponse`, `ExportRequest`, `ExportResponse`
    - Create `types/analysis.ts` with `ArchitectureAnalysis`, `WellArchitectedAssessment`, `PillarAssessment`, `Recommendation`
    - Create `types/cost.ts` with `CostEstimate`, `ServiceCost`, `UsageAssumptions`
    - Create `types/version.ts` with `DiagramVersion`, `IaCRequest`, `IaCResponse`
    - Create `types/template.ts` with template interfaces
    - _Requirements: 1.2, 2.1, 4.6, 6.2, 7.1_

  - [x] 1.3 Create AWS service registry and icon mapping
    - Create `lib/aws-service-registry.ts` with ~80 supported AWS service types
    - Map each service type to its official Draw.io AWS icon style identifier
    - Export lookup functions: `getServiceIcon(type)`, `isKnownService(type)`, `getServiceCategory(type)`
    - Include fallback generic node style for unrecognized services
    - _Requirements: 2.2, 2.5_

  - [x]* 1.4 Write property tests for prompt validation logic
    - **Property 1: Valid Prompt Routing**
    - **Validates: Requirements 1.1, 1.7, 1.8**

- [x] 2. Implement authentication and authorization layer
  - [x] 2.1 Set up AWS Cognito integration with AuthProvider
    - Create `providers/AuthProvider.tsx` using AWS Amplify Auth
    - Implement sign-up, sign-in, sign-out, token refresh flows
    - Support email/password and social login (Google, GitHub)
    - Handle silent token refresh on expiry within 5 seconds
    - Implement account lockout after 5 failed attempts (15 min lockout)
    - Create `hooks/useAuth.ts` for consuming auth state
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

  - [x] 2.2 Implement route protection and auth middleware
    - Create `middleware.ts` for protecting routes (Create Diagram, Diagram Viewer, Templates)
    - Redirect unauthenticated users to login page
    - Implement API route auth validation using Cognito tokens
    - Associate diagram operations with authenticated user ID
    - _Requirements: 9.2, 9.3_

  - [x]* 2.3 Write property test for account lockout behavior
    - **Property 20: Account Lockout After Failed Attempts**
    - **Validates: Requirements 9.6**

- [x] 3. Implement application shell, navigation, and layout
  - [x] 3.1 Create AppLayout with navigation bar and theme toggle
    - Create `components/layout/AppLayout.tsx` with persistent navigation bar
    - Implement links to Dashboard, Create Diagram, Templates, Settings
    - Highlight active page in navigation
    - Implement theme toggle (light/dark) with user preference persistence
    - Ensure navigation transitions happen within 1 second without full reload
    - Use Next.js App Router layout pattern
    - _Requirements: 11.6, 11.7, 12.2_

  - [x] 3.2 Implement responsive design and accessibility foundations
    - Configure TailwindCSS responsive breakpoints (375px to 2560px)
    - Implement keyboard navigation (Tab, Shift+Tab, Enter, Escape, Arrow keys)
    - Add visible focus indicators with 3:1 contrast ratio
    - Ensure 4.5:1 color contrast for normal text, 3:1 for large text in both themes
    - Add ARIA labels and roles to all interactive elements
    - _Requirements: 12.1, 12.3, 12.4, 12.6_

- [x] 4. Checkpoint - Ensure project scaffolding is solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement prompt input and generation pipeline (frontend)
  - [x] 5.1 Create PromptInput component with validation
    - Create `components/create/PromptInput.tsx` with text area
    - Implement validation: min 10 chars, max 5000 chars, with character count display
    - Use React Hook Form + zod for validation schema
    - Show validation error messages for out-of-range inputs
    - Add generate button and clear/reset button
    - _Requirements: 1.1, 1.7, 1.8, 11.2_

  - [x] 5.2 Create generation loading state and streaming UI
    - Implement loading indicator during LLM processing
    - Create progress state machine: `idle` → `generating` → `ready` | `error`
    - Display contextual messages during generation ("Interpreting prompt...", "Generating diagram...")
    - _Requirements: 1.3_

  - [x] 5.3 Implement generation error handling UI
    - Display non-technical error messages for parse failures
    - Show up to 3 alternative prompt phrasings on LLM interpretation failure
    - Implement timeout error display with retry button
    - Handle API 4xx/5xx errors with descriptive messages
    - _Requirements: 1.4, 1.5, 1.6, 13.1_

  - [x]* 5.4 Write property tests for LLM response validation and retry behavior
    - **Property 2: LLM Response Validation and Routing**
    - **Property 3: Retry Behavior on Timeout**
    - **Validates: Requirements 1.2, 1.4, 1.6**

- [x] 6. Implement backend generation API (Lambda handlers)
  - [x] 6.1 Create Generation Lambda handler
    - Create `api/diagrams/generate/route.ts` (Next.js API route or Lambda handler)
    - Implement LLM prompt construction with system prompt for ArchitectureSpec JSON output
    - Validate LLM response against ArchitectureSpec JSON schema using zod
    - Implement 30-second timeout with up to 2 retries
    - Handle LLM parse failures and forward valid specs to Diagram Engine
    - Store diagram metadata in DynamoDB with status tracking
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

  - [x] 6.2 Create Diagram Engine Lambda handler (Draw.io MCP integration)
    - Create `api/diagrams/render/route.ts` for Draw.io MCP interaction
    - Convert ArchitectureSpec JSON → Draw.io XML using MCP server
    - Apply official AWS icons from service registry
    - Group resources into containers (VPC, subnet, AZ, Region)
    - Apply layout algorithms to minimize edge crossings (<10% overlap target)
    - Store generated .drawio file in S3
    - Complete processing within 10 seconds for up to 50 services
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 6.3 Implement DynamoDB data access layer
    - Create `lib/db/diagrams.ts` with CRUD operations for Diagrams table
    - Create `lib/db/versions.ts` with version management operations
    - Create `lib/db/templates.ts` with template CRUD operations
    - Implement GSI queries for user diagrams and templates
    - Use DynamoDB DocumentClient with proper error handling
    - _Requirements: 16.3_

  - [x] 6.4 Implement S3 file operations layer
    - Create `lib/storage/s3.ts` with upload, download, presigned URL generation
    - Implement file structure: `diagrams/{userId}/{diagramId}/diagram.drawio`
    - Handle exports subfolder and versions subfolder
    - Enforce 50 MB max file size
    - _Requirements: 16.4_

  - [x]* 6.5 Write property tests for Diagram Engine
    - **Property 4: Diagram Engine Produces Well-Formed Output**
    - **Property 5: Service Rendering Correctness**
    - **Property 6: Container Grouping Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.7**

- [x] 7. Implement Diagram Viewer and interactive editing
  - [x] 7.1 Create DiagramCanvas component with pan/zoom
    - Create `components/diagram/DiagramCanvas.tsx` with Draw.io embed or Canvas renderer
    - Implement pan and zoom controls
    - Render .drawio XML content within 3 seconds for up to 200 nodes
    - Handle diagram state management with React context
    - _Requirements: 3.1_

  - [x] 7.2 Implement node editing operations
    - Implement drag-to-reposition nodes while maintaining edge connections
    - Implement node deletion (with confirmation dialog) removing node and all connected edges
    - Implement inline label editing on double-click (Enter to confirm, Escape to cancel)
    - Implement regeneration from modified prompt (with confirmation dialog)
    - _Requirements: 3.2, 3.3, 3.4, 3.8, 3.9_

  - [x] 7.3 Implement edge operations and layout reflow
    - Implement draw-edge-between-nodes for creating connections
    - Implement layout reflow (horizontal/vertical) preserving all nodes and edges
    - _Requirements: 3.5, 3.6_

  - [x] 7.4 Implement undo/redo system
    - Create `hooks/useUndoRedo.ts` with action stack (up to 50 actions)
    - Support Ctrl+Z for undo, Ctrl+Y for redo
    - Track all edit operations (move, delete, add, rename, layout change)
    - _Requirements: 3.7_

  - [x]* 7.5 Write property tests for editor state operations
    - **Property 7: Node Deletion Integrity**
    - **Property 8: Edge Addition Correctness**
    - **Property 9: Layout Reflow Preserves Graph Structure**
    - **Property 10: Undo Restores Previous State**
    - **Validates: Requirements 3.3, 3.5, 3.6, 3.7**

- [x] 8. Checkpoint - Ensure core generation and editing pipeline works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement multi-format export service
  - [x] 9.1 Create Export Lambda handler and API routes
    - Create `api/diagrams/[id]/export/route.ts`
    - Implement export to .drawio (native XML)
    - Implement export to PNG (300 DPI minimum)
    - Implement export to SVG (preserving vectors)
    - Implement export to PDF (configurable page size: A4, Letter, A3)
    - Implement export to JSON (architecture specification)
    - Implement export to Markdown (architecture summary)
    - Complete export within 5 seconds for up to 50 components
    - Return pre-signed S3 URL for download
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 9.2 Create ExportDialog frontend component
    - Create `components/export/ExportDialog.tsx` using shadcn/ui Dialog
    - Show format selection with format-specific options (DPI, page size)
    - Handle download trigger via presigned URL
    - Display error for unsupported formats listing valid options
    - Handle export failures without producing partial files
    - _Requirements: 4.8, 4.9_

  - [x]* 9.3 Write property test for export format validation
    - **Property 11: Export Format Validation**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

- [x] 10. Implement architecture templates system
  - [x] 10.1 Create template data and Template Lambda handler
    - Create 8 built-in templates: 3-Tier Web Application, Serverless API, Microservices, AI Chatbot, SAP on AWS, Data Lake, ML Pipeline, Event-Driven Architecture
    - Store templates in S3 with metadata in DynamoDB
    - Implement API routes for listing, fetching, and saving templates
    - Enforce 25 custom template limit per user
    - _Requirements: 5.1, 5.4_

  - [x] 10.2 Create TemplateGallery frontend component
    - Create `components/templates/TemplateGallery.tsx`
    - Display browsable list with name, description summary, and category
    - Implement search by name/description and filter by category
    - Load selected template into Diagram Viewer within 3 seconds
    - Show template description (50-500 chars) and at least 2 use cases
    - Handle template load failures preserving current diagram state
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [x]* 10.3 Write property tests for template system
    - **Property 12: Template Metadata Completeness**
    - **Property 13: Custom Template Limit Enforcement**
    - **Validates: Requirements 5.3, 5.4**

- [x] 11. Implement smart architecture analysis
  - [x] 11.1 Create Analysis Lambda handler
    - Create `api/diagrams/[id]/analysis/route.ts`
    - Implement missing component detection against reference checklist
    - Evaluate architecture against 6 Well-Architected Framework pillars
    - Generate up to 10 recommendations per category (security, HA, cost)
    - Assign severity levels (Critical, Recommended, Optional)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 11.2 Create AnalysisPanel frontend component
    - Create `components/analysis/AnalysisPanel.tsx` as side panel
    - Display recommendations grouped by category
    - Sort by severity from Critical to Optional
    - Show "no issues found" message when category has no gaps
    - _Requirements: 6.6, 6.7_

  - [x]* 11.3 Write property tests for architecture analysis
    - **Property 14: Well-Architected Assessment Completeness**
    - **Property 15: Recommendation Bounds and Ordering**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6**

- [x] 12. Implement cost estimation service
  - [x] 12.1 Create Cost Lambda handler
    - Create `api/diagrams/[id]/cost/route.ts`
    - Calculate estimated monthly cost using default assumptions (730 hrs, 1M requests, 100GB transfer, 50GB storage)
    - Provide per-service cost breakdown in USD (2 decimal places)
    - Recalculate within 3 seconds on service changes
    - Handle unavailable pricing gracefully (mark as "estimate unavailable", exclude from total)
    - Show $0.00 for architectures with no AWS services
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

  - [x] 12.2 Create CostPanel frontend component
    - Create `components/cost/CostPanel.tsx` with per-service breakdown table
    - Add parameter adjustment sliders (requests: 1-10B, data: 0-100TB, storage: 0-1PB)
    - Validate parameter ranges and reject out-of-range values
    - Display total monthly cost prominently
    - _Requirements: 7.2, 7.4_

  - [x]* 12.3 Write property tests for cost estimation
    - **Property 16: Cost Estimate Summation Invariant**
    - **Property 17: Cost Parameter Range Validation**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [x] 13. Implement architecture explanation generation
  - [x] 13.1 Create explanation generation within Generation Lambda
    - Generate plain-language explanation with no undefined acronyms
    - Produce summary table with service name, purpose, and connections columns
    - Generate up to 10 best practice recommendations per Well-Architected Framework
    - Update explanation within 5 seconds when diagram is modified
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 13.2 Create explanation display panel
    - Create `components/explanation/ExplanationPanel.tsx`
    - Display explanation text, summary table, and recommendations
    - Position as dedicated panel adjacent to diagram
    - _Requirements: 8.5_

  - [x]* 13.3 Write property test for architecture summary table
    - **Property 18: Architecture Summary Table Completeness**
    - **Validates: Requirements 8.2**

- [x] 14. Checkpoint - Ensure analysis, cost, and export features work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement version history and autosave
  - [x] 15.1 Create version management backend
    - Implement autosave every 30 seconds storing full diagram state
    - Implement explicit save with user-provided name (up to 100 chars)
    - Enforce 50 version limit per diagram with eviction policy (oldest autosaves first, never evict named versions before autosaves)
    - Implement version restore (autosave current state first, then restore)
    - Handle autosave failures with retry in 30 seconds and warning indicator
    - Handle restore failures preserving current state
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7_

  - [x] 15.2 Create VersionHistory frontend component
    - Create `components/version/VersionHistory.tsx`
    - Display chronological list with version name/"Autosave", timestamp, user
    - Implement restore button with autosave-before-restore behavior
    - _Requirements: 10.4, 10.5_

  - [x]* 15.3 Write property tests for version management
    - **Property 21: Version Save Creates Correct Metadata**
    - **Property 22: Version Limit and Eviction Policy**
    - **Property 23: Version History Chronological Order**
    - **Property 24: Restore Autosaves Current State First**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

- [x] 16. Implement error handling and offline resilience
  - [x] 16.1 Create error boundary hierarchy and retry logic
    - Implement `AppErrorBoundary`, `PageErrorBoundary`, `ComponentErrorBoundary`
    - Implement exponential backoff retry (1s, 2s, 4s, max 3 attempts)
    - Display non-technical error messages with retry buttons
    - Preserve all unsaved edits during error states
    - Retain structured JSON for user-initiated retry on diagram engine failures
    - _Requirements: 13.1, 13.3, 13.4, 13.5_

  - [x] 16.2 Create OfflineQueueManager for network resilience
    - Create `lib/offline/OfflineQueueManager.ts`
    - Queue up to 20 changes in localStorage when offline (FIFO order)
    - Sync queued changes on reconnection within 5 minutes
    - Display offline indicator and "Changes saved locally" message
    - _Requirements: 13.2_

  - [x]* 16.3 Write property tests for resilience
    - **Property 25: API Error Handling with Retry**
    - **Property 26: Offline Queue Capacity**
    - **Property 27: Error State Preserves Edits**
    - **Validates: Requirements 13.1, 13.2, 13.4, 13.5**

- [x] 17. Implement Infrastructure as Code generation
  - [x] 17.1 Create IaC Lambda handler
    - Create `api/diagrams/[id]/iac/route.ts`
    - Generate Terraform code with one resource block per diagram node
    - Generate CDK TypeScript code with one construct per diagram node
    - Generate CloudFormation YAML with one resource per diagram node
    - Include inter-resource references reflecting diagram connections
    - Parameterize configurable properties with defaults from diagram
    - Add comments for services not representable in selected format
    - Reject architectures with more than 50 resource nodes with error message
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x]* 17.2 Write property tests for IaC generation
    - **Property 28: IaC Output Resource Count Correctness**
    - **Property 29: IaC Parameterization**
    - **Property 30: IaC Unsupported Service Comments**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

- [x] 18. Implement diagram import functionality
  - [x] 18.1 Create Import Lambda handler and frontend
    - Create `api/diagrams/import/route.ts`
    - Validate uploaded file: well-formed XML → .drawio schema conformance
    - Reject non-XML files with XML parsing error
    - Reject valid XML that doesn't conform to .drawio schema with schema error
    - Support files up to 10 MB, reject larger with size error message
    - Parse and render valid .drawio file within 10 seconds
    - Trigger architecture analysis within 30 seconds of import
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x]* 18.2 Write property test for import validation
    - **Property 31: Import File Validation**
    - **Validates: Requirements 15.3**

- [x] 19. Checkpoint - Ensure all core features work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Implement application pages and dashboard
  - [x] 20.1 Create Dashboard page
    - Create `app/dashboard/page.tsx`
    - Display up to 10 most-recently-modified diagrams
    - Show quick-start templates
    - Display usage statistics (total diagrams, total generations)
    - Redirect from Diagram Viewer to Dashboard when no diagram is selected
    - _Requirements: 11.1, 11.8_

  - [x] 20.2 Create Create Diagram page
    - Create `app/create/page.tsx`
    - Integrate PromptInput component with template selector
    - Wire generate button to generation API
    - Navigate to Diagram Viewer on successful generation
    - _Requirements: 11.2_

  - [x] 20.3 Create Diagram Viewer page
    - Create `app/diagram/[id]/page.tsx`
    - Integrate DiagramCanvas, AnalysisPanel, CostPanel, ExplanationPanel, ExportDialog
    - Wire all controls and side panels
    - _Requirements: 11.3_

  - [x] 20.4 Create Templates page and Settings page
    - Create `app/templates/page.tsx` with TemplateGallery integration
    - Create `app/settings/page.tsx` with theme selection, default region, model selection, shortcut customization
    - _Requirements: 11.4, 11.5_

- [x] 21. Implement advanced features
  - [x] 21.1 Implement architecture comparison (side-by-side diff)
    - Create `components/comparison/ComparisonView.tsx`
    - Display two diagrams side-by-side
    - Highlight added, removed, and modified components with distinct visual indicators
    - Disable comparison when fewer than 2 versions available
    - _Requirements: 17.1, 17.7_

  - [x] 21.2 Implement voice input integration
    - Create `hooks/useVoiceInput.ts` using browser Speech Recognition API
    - Transcribe spoken description and populate prompt field within 5 seconds
    - Handle unsupported browsers or failed transcription with error and fallback to manual input
    - _Requirements: 17.2, 17.3_

  - [x] 21.3 Implement internationalization (i18n)
    - Set up next-intl or similar i18n library
    - Create translation files for English, German, French, Spanish, Japanese
    - Localize all UI labels, buttons, navigation, tooltips, and system messages
    - _Requirements: 17.4_

  - [x] 21.4 Implement document generation (ADR and pre-sales)
    - Create ADR generation: title, status, context, decision, consequences sections
    - Create pre-sales doc generation: solution overview, architecture diagram, AWS services with roles, key design decisions
    - _Requirements: 17.5, 17.6_

  - [x]* 21.5 Write property tests for advanced features
    - **Property 32: Architecture Comparison Diff Correctness**
    - **Property 33: Localization Completeness**
    - **Property 34: Document Generation Section Completeness**
    - **Validates: Requirements 17.1, 17.4, 17.5, 17.6**

- [x] 22. Implement serverless deployment configuration
  - [x] 22.1 Create AWS infrastructure configuration
    - Create CDK or Terraform config for CloudFront + S3 (static hosting)
    - Configure API Gateway with Cognito authorizer
    - Define Lambda functions with 29-second timeout
    - Configure DynamoDB tables (Diagrams, Versions, Templates) with on-demand capacity
    - Set up S3 bucket for diagram files with 50 MB limit
    - Configure rate limiting at 1000 requests/second/user
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [x] 23. Final checkpoint - Ensure all tests pass and integration is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The tech stack is: Next.js 14+, React 18+, TypeScript 5+, TailwindCSS 3+, shadcn/ui, Vitest, fast-check, Playwright
- LLM integration supports both OpenAI GPT-5.5 and Claude Sonnet (configurable)
- All API routes can be implemented as Next.js API routes for development, then extracted to Lambda handlers for production deployment

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 4, "tasks": ["5.1", "6.3", "6.4"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 6, "tasks": ["5.4", "6.2"] },
    { "id": 7, "tasks": ["6.5", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "7.5"] },
    { "id": 10, "tasks": ["9.1", "10.1", "11.1", "12.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "10.2", "10.3", "11.2", "11.3", "12.2", "12.3"] },
    { "id": 12, "tasks": ["13.1", "15.1", "16.1"] },
    { "id": 13, "tasks": ["13.2", "13.3", "15.2", "15.3", "16.2", "16.3"] },
    { "id": 14, "tasks": ["17.1", "18.1"] },
    { "id": 15, "tasks": ["17.2", "18.2"] },
    { "id": 16, "tasks": ["20.1", "20.2", "20.3", "20.4"] },
    { "id": 17, "tasks": ["21.1", "21.2", "21.3", "21.4"] },
    { "id": 18, "tasks": ["21.5", "22.1"] }
  ]
}
```
