# Implementation Plan: Chatbot Enhancements

## Overview

Rebuild the DiagramChat component with conversation history and server-side prompt assembly, add soft-delete with restore for diagrams, and expand settings with Bedrock model selection and connection testing. Implementation follows the critical path: Lambda first, then chatbot, then soft-delete, then dashboard, then settings, then deploy.

## Tasks

- [ ] 1. Update Lambda handler to accept new request format
  - [ ] 1.1 Extend Lambda handler to accept conversationHistory, currentXml, and modelId fields
    - Parse `conversationHistory`, `currentXml`, and `modelId` from the request body in `infrastructure/lambda/drawio-generator/index.ts`
    - Assemble the Bedrock messages array server-side: system prompt via `buildSystemPrompt()`, prepend currentXml as context if provided, include conversation history as alternating user/assistant messages, append current user prompt as final message
    - If `modelId` is provided in the request, use it instead of the default `BEDROCK_MODEL_ID` env var
    - Keep existing retry logic, XML extraction, and validation unchanged
    - Update the `callBedrockWithRetry` function signature to accept a messages array and optional modelId instead of a single prompt string
    - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 10.4_

  - [ ] 1.2 Add conversation history truncation for token limits
    - If the assembled messages array exceeds a safe threshold (approx 180,000 characters total), truncate oldest messages from conversationHistory while preserving the system prompt, currentXml context, and latest user message
    - Log a warning when truncation occurs
    - _Requirements: 1.2, 3.1_

- [ ] 2. Checkpoint - Verify Lambda compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Rebuild DiagramChat component with conversation history
  - [ ] 3.1 Create new DiagramChat component with proper interfaces and state
    - Rewrite `src/components/diagram/DiagramChat.tsx` with the new `DiagramChatProps` interface: `{ currentXml?: string; onArchitectureUpdate?: (xml: string) => void; className?: string }`
    - Remove the old `architectureSpec` prop and `generateXmlFromSpec` function
    - Maintain `messages: ChatMessage[]` state for conversation history with `id`, `role`, `content`, `timestamp`
    - Clear history on component unmount (useEffect cleanup)
    - Include welcome message as initial assistant message
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ] 3.2 Implement request payload construction with XML context and modelId
    - Read `selectedModelId` from localStorage on each request
    - Truncate `currentXml` at 45,000 characters with a note if exceeded
    - Build POST body: `{ prompt, conversationHistory, currentXml, modelId }`
    - Send to Lambda Function URL (from `NEXT_PUBLIC_DRAWIO_GENERATOR_URL` env var)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 10.1_

  - [ ] 3.3 Implement response handling and diagram update callback
    - On success: extract `drawioXml` from response, add assistant message to history, invoke `onArchitectureUpdate(xml)` callback
    - On HTTP error: display error message from response body, retain current diagram state
    - On network error: display "Network error — try again" message
    - Show loading indicator and disable input while request is in progress
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.4_

  - [ ] 3.4 Update diagram page to pass currentXml prop and handle onArchitectureUpdate
    - In the diagram page component, pass the current DrawioEmbed XML state as `currentXml` prop to DiagramChat
    - Handle `onArchitectureUpdate` callback to update the DrawioEmbed component's XML via postMessage reload
    - Remove any old `architectureSpec` prop passing
    - _Requirements: 4.1, 4.2_

- [ ] 4. Checkpoint - Verify chatbot builds and can send/receive messages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement soft-delete storage module
  - [ ] 5.1 Create soft-delete utility functions in a new module
    - Create `src/utils/deleted-diagrams.ts` with functions: `softDeleteDiagram(diagramId)`, `restoreDiagram(diagramId)`, `permanentlyDeleteDiagram(diagramId)`, `purgeExpiredDiagrams()`, `getDeletedDiagrams()`, `getDaysUntilExpiry(diagram)`
    - Use localStorage keys: `deleted_diagrams` and `diagram_drafts`
    - `softDeleteDiagram`: move diagram from `diagram_drafts` to `deleted_diagrams` with `deletedAt` and `expiresAt` (deletedAt + 30 days) timestamps
    - `restoreDiagram`: move diagram from `deleted_diagrams` back to `diagram_drafts` preserving all original data
    - `permanentlyDeleteDiagram`: remove from `deleted_diagrams`
    - `purgeExpiredDiagrams`: remove entries where `expiresAt` is in the past
    - `getDaysUntilExpiry`: calculate remaining days from now until `expiresAt`
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Add deleted diagrams section to dashboard
  - [ ] 6.1 Add "Deleted" section to the dashboard page
    - On the main page (`src/app/page.tsx`), add a collapsible "Deleted" section below the recent diagrams list
    - Call `purgeExpiredDiagrams()` on page load to clean up expired items
    - Display each soft-deleted diagram with: original name, deletion date, days until expiry, "Restore" button, "Delete Permanently" button
    - Wire "Restore" to `restoreDiagram()` and refresh the active diagrams list
    - Wire "Delete Permanently" to `permanentlyDeleteDiagram()` and refresh the deleted list
    - _Requirements: 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

  - [ ] 6.2 Update existing delete action to use soft-delete
    - Find the existing delete handler for diagrams in the dashboard/page component
    - Replace the permanent delete with a call to `softDeleteDiagram(diagramId)`
    - Ensure the diagram disappears from the active list immediately
    - _Requirements: 6.1, 6.2_

- [ ] 7. Checkpoint - Verify soft-delete and restore work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update settings page with model selector and test connection
  - [ ] 8.1 Replace LLM model dropdown with Bedrock model options
    - In `src/app/settings/page.tsx`, replace the existing `LLM_MODELS` array with the full Bedrock model list: Claude Sonnet 4, Claude Haiku, Claude Opus, Amazon Nova Pro, Amazon Nova Lite, Llama 3.3, Mistral Large
    - Persist selected model to localStorage under the key `selectedModelId` (separate from the existing settings object so the chatbot can read it directly)
    - Load previously selected model on page mount; default to Claude Sonnet 4 if none stored
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 8.2 Add Test Connection button with status indicator
    - Add a "Test Connection" button below the model selector
    - On click: send a simple test prompt (`"Generate a simple S3 bucket diagram"`) to the Lambda Function URL with the currently selected modelId
    - On success: show green checkmark with response time in milliseconds
    - On error or timeout (30s): show red X with error description
    - Show loading spinner and disable button while test is in progress
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9. Checkpoint - Verify settings page model selection persists and test connection works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Deploy and push changes
  - [ ] 10.1 Deploy updated Lambda via CDK
    - Run `cd infrastructure && npx cdk deploy --require-approval never` to deploy the updated Lambda handler
    - Verify the Lambda function URL still works after deployment
    - _Requirements: 10.4_

  - [ ] 10.2 Commit and push all frontend and infrastructure changes
    - Stage all modified files (Lambda handler, DiagramChat, soft-delete utils, dashboard page, settings page)
    - Commit with message: "feat: chatbot conversation history, soft-delete, model selector"
    - Push to remote branch

- [ ] 11. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All code is TypeScript (Lambda handler + Next.js React frontend)
- The Lambda Function URL at `NEXT_PUBLIC_DRAWIO_GENERATOR_URL` handles CORS via infrastructure config
- localStorage is the persistence layer for diagrams, deleted diagrams, and settings (no backend DB)
- The existing `buildSystemPrompt()` in `system-prompt.ts` is reused as-is
- Checkpoints ensure incremental validation before moving to the next major piece
- Tasks 10.1 and 10.2 (deploy/push) are the only tasks that require terminal/CLI execution

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "6.1"] },
    { "id": 4, "tasks": ["3.3", "6.2"] },
    { "id": 5, "tasks": ["3.4", "8.1"] },
    { "id": 6, "tasks": ["8.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2"] }
  ]
}
```
