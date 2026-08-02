# Requirements Document

## Introduction

This feature covers three integrated enhancements to the AWS Architecture Generator application: (1) rebuilding the broken LLM chatbot in DiagramChat.tsx as a fully functional conversational AI assistant with context awareness, (2) adding soft-delete with restore capability for diagrams, and (3) adding a settings page for LLM model selection with connection testing. These enhancements collectively improve the diagram editing experience, data safety, and model flexibility.

## Glossary

- **Chatbot**: The conversational AI panel (DiagramChat component) that allows users to modify architecture diagrams via natural language instructions
- **Lambda_Function_URL**: The AWS Lambda endpoint at https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/ that processes prompts via Amazon Bedrock
- **DrawioXml**: The mxGraphModel XML format used by Draw.io to represent architecture diagrams
- **Conversation_History**: The ordered list of user and assistant messages maintained during a chat session
- **System_Prompt**: The initial instruction provided to the LLM that defines its role and capabilities for modifying Draw.io XML
- **Deleted_Diagrams_Store**: The localStorage-based collection holding soft-deleted diagrams with metadata
- **Model_Selector**: The settings UI component that allows choosing which Bedrock LLM model to use for generation
- **Settings_Store**: The localStorage key-value store persisting user preferences including selected model
- **Recent_Diagrams**: The list of user-created diagrams displayed on the dashboard
- **Soft_Delete**: The process of marking a diagram as deleted without permanent removal, allowing restoration within a retention period

## Requirements

### Requirement 1: Chatbot Conversation Context Management

**User Story:** As a user, I want the chatbot to remember our conversation so that I can iteratively refine my architecture diagram without repeating context.

#### Acceptance Criteria

1. THE Chatbot SHALL maintain Conversation_History for the duration of a chat session
2. WHEN a user sends a message, THE Chatbot SHALL include all prior Conversation_History messages in the request payload sent to the Lambda_Function_URL
3. WHEN a user navigates away from the diagram page, THE Chatbot SHALL clear the Conversation_History for that session
4. THE Chatbot SHALL display all messages from the Conversation_History in chronological order in the chat panel

### Requirement 2: Chatbot XML Context Passing

**User Story:** As a user, I want the chatbot to understand my current diagram so that it can make precise modifications to existing services and connections.

#### Acceptance Criteria

1. WHEN a user sends a message, THE Chatbot SHALL include the current DrawioXml as context in the request payload
2. THE Chatbot SHALL retrieve the latest DrawioXml from the DrawioEmbed component before each request
3. WHEN the DrawioXml exceeds 45000 characters, THE Chatbot SHALL truncate the XML and include a note indicating truncation in the request payload
4. IF the DrawioXml is unavailable, THEN THE Chatbot SHALL send the request without XML context and inform the user that no diagram is loaded

### Requirement 3: Chatbot Lambda Integration

**User Story:** As a user, I want the chatbot to reliably communicate with the backend so that my diagram modifications are processed correctly.

#### Acceptance Criteria

1. THE Chatbot SHALL send POST requests to the Lambda_Function_URL with a JSON body containing the fields: prompt, conversationHistory, currentXml, and modelId
2. WHEN the Lambda_Function_URL returns a successful response containing drawioXml, THE Chatbot SHALL extract the XML from the response
3. IF the Lambda_Function_URL returns an HTTP error status, THEN THE Chatbot SHALL display the error message to the user and retain the current diagram state
4. IF a network error occurs during the request, THEN THE Chatbot SHALL display a retry-able error message to the user
5. WHILE a request is in progress, THE Chatbot SHALL display a loading indicator and disable the input field

### Requirement 4: Chatbot Real-Time Diagram Updates

**User Story:** As a user, I want the diagram to update immediately after the chatbot processes my request so that I can see my changes in real time.

#### Acceptance Criteria

1. WHEN the Chatbot receives updated DrawioXml from the Lambda_Function_URL, THE Chatbot SHALL invoke the onArchitectureUpdate callback with the new XML
2. WHEN the DrawioEmbed component receives new XML, THE DrawioEmbed SHALL reload the diagram in the iframe via postMessage
3. WHEN the diagram is updated via chatbot, THE Chatbot SHALL display a confirmation message indicating which services were added, removed, or modified
4. IF the returned DrawioXml is malformed or empty, THEN THE Chatbot SHALL retain the previous diagram state and inform the user of the failure

### Requirement 5: Chatbot System Prompt

**User Story:** As a developer, I want the chatbot to have a well-defined system prompt so that the LLM understands how to read and modify Draw.io XML correctly.

#### Acceptance Criteria

1. THE Chatbot SHALL include a System_Prompt in every request that instructs the LLM to output valid mxGraphModel XML
2. THE System_Prompt SHALL instruct the LLM to preserve all existing services and connections unless explicitly asked to remove them
3. THE System_Prompt SHALL instruct the LLM to use AWS architecture icon shapes (mxgraph.aws4 library) for new services
4. THE System_Prompt SHALL instruct the LLM to return only the complete updated DrawioXml without additional explanation text wrapping the XML

### Requirement 6: Soft-Delete Diagrams

**User Story:** As a user, I want deleted diagrams to go to a recoverable section so that I can restore accidentally deleted diagrams.

#### Acceptance Criteria

1. WHEN a user deletes a diagram from Recent_Diagrams, THE Deleted_Diagrams_Store SHALL move the diagram record to a "deleted" collection in localStorage with a deletion timestamp
2. WHEN a diagram is soft-deleted, THE Recent_Diagrams list SHALL no longer display that diagram
3. THE application SHALL display a "Deleted" section on the dashboard showing all soft-deleted diagrams with their original name and deletion date
4. WHEN a user clicks "Restore" on a soft-deleted diagram, THE Deleted_Diagrams_Store SHALL move the diagram back to the active drafts collection
5. WHEN a restored diagram appears in Recent_Diagrams, THE diagram SHALL retain all original data including DrawioXml and metadata

### Requirement 7: Permanent Deletion and Auto-Expiry

**User Story:** As a user, I want deleted diagrams to be permanently removed after 30 days so that localStorage does not grow unbounded.

#### Acceptance Criteria

1. WHEN the application loads the dashboard, THE Deleted_Diagrams_Store SHALL check all soft-deleted diagrams for expiry
2. WHEN a soft-deleted diagram has a deletion timestamp older than 30 days, THE Deleted_Diagrams_Store SHALL permanently remove it from localStorage
3. WHEN a user clicks "Delete Permanently" on a soft-deleted diagram, THE Deleted_Diagrams_Store SHALL immediately remove it from localStorage
4. THE Deleted_Diagrams_Store SHALL display the remaining days until auto-expiry for each soft-deleted diagram

### Requirement 8: Settings Model Selection

**User Story:** As a user, I want to select which LLM model powers my diagram generation so that I can choose between speed, quality, and cost.

#### Acceptance Criteria

1. THE Model_Selector SHALL display a dropdown with the following options: Claude Sonnet 4, Claude Haiku, Claude Opus, Amazon Nova Pro, Amazon Nova Lite, Llama 3.3, Mistral Large
2. WHEN a user selects a model, THE Settings_Store SHALL persist the selection in localStorage under the key "selectedModelId"
3. WHEN the settings page loads, THE Model_Selector SHALL display the previously selected model from the Settings_Store
4. WHEN no model has been previously selected, THE Model_Selector SHALL default to "Claude Sonnet 4"

### Requirement 9: Settings Connection Test

**User Story:** As a user, I want to test the connection to the LLM backend so that I can verify my configuration works before generating diagrams.

#### Acceptance Criteria

1. THE settings page SHALL display a "Test Connection" button adjacent to the model selector
2. WHEN a user clicks "Test Connection", THE settings page SHALL send a simple test prompt to the Lambda_Function_URL with the currently selected modelId
3. WHEN the Lambda_Function_URL returns a successful response, THE settings page SHALL display a green success indicator with the response time in milliseconds
4. IF the Lambda_Function_URL returns an error or the request times out after 30 seconds, THEN THE settings page SHALL display a red failure indicator with the error description
5. WHILE the connection test is in progress, THE settings page SHALL display a loading spinner and disable the test button

### Requirement 10: Model ID Propagation

**User Story:** As a developer, I want the selected model ID to be sent with every generation request so that the Lambda can route to the correct Bedrock model.

#### Acceptance Criteria

1. WHEN the Chatbot sends a request to the Lambda_Function_URL, THE Chatbot SHALL include the modelId field from the Settings_Store in the request body
2. WHEN the diagram generation page sends a request to the Lambda_Function_URL, THE generation page SHALL include the modelId field from the Settings_Store in the request body
3. IF no modelId is stored in the Settings_Store, THEN THE application SHALL omit the modelId field from the request body, allowing the Lambda to use its default model
4. THE Lambda_Function_URL SHALL accept an optional modelId field in the request body and use it to select the Bedrock model for inference

