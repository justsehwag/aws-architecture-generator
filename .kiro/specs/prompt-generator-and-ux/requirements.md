# Requirements Document

## Introduction

This feature enhances the AWS Architecture Generator with multiple UX and functionality improvements: an authentication gate with toast warnings instead of page redirects, an engaging generation waiting experience, a prompt generator that accepts file uploads and inventory data, removal of the template section from the Create page, AWS pricing calculator integration in the chatbot, and a theme toggle on the Create page.

## Glossary

- **Create_Page**: The `/create` route where users describe their architecture and trigger diagram generation
- **Auth_Gate**: A client-side mechanism that blocks protected actions for unauthenticated users while keeping the page visible
- **Toast_Warning**: A non-blocking notification displayed as a colored banner at the top or corner of the viewport
- **Generation_Progress_UI**: The visual feedback component displayed while the Lambda Function URL processes a diagram request
- **Prompt_Generator**: A mode on the Create Page that accepts file uploads or pasted content and uses AI to produce an architecture prompt
- **Chatbot**: The DiagramChat component on the diagram viewer page that supports conversational Q&A and diagram modifications
- **Lambda_Function_URL**: The serverless endpoint that handles LLM requests in "xml" and "chat" modes
- **Theme_Toggle**: A UI control that switches between light and dark color modes using the existing next-themes library
- **Uploaded_Content**: File data or pasted text provided by the user to the Prompt Generator for AI analysis

## Requirements

### Requirement 1: Auth Gate Toast Warning

**User Story:** As a visitor, I want to see the Create Page content without being redirected, so that I can understand what the app offers before signing up.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to the Create_Page, THE Auth_Gate SHALL render the full page content without redirecting to the login route
2. WHEN an unauthenticated user clicks the "Generate Diagram" button, THE Auth_Gate SHALL display a Toast_Warning with the message "Please login or sign up to use this feature"
3. WHEN an unauthenticated user attempts to use the Prompt_Generator file upload, THE Auth_Gate SHALL display a Toast_Warning with the message "Please login or sign up to use this feature"
4. WHILE the user is unauthenticated, THE Auth_Gate SHALL prevent the diagram generation request from being sent to the Lambda_Function_URL
5. THE Toast_Warning SHALL use a yellow or red background color to indicate a warning severity
6. THE Toast_Warning SHALL auto-dismiss after 5 seconds or when the user manually closes it

### Requirement 2: Enhanced Generation Progress UI

**User Story:** As a user, I want to see engaging visual feedback while my diagram generates, so that the waiting experience feels professional and informative.

#### Acceptance Criteria

1. WHEN diagram generation begins, THE Generation_Progress_UI SHALL display animated step labels: "Interpreting prompt...", "Generating architecture...", "Rendering diagram..."
2. WHEN diagram generation begins, THE Generation_Progress_UI SHALL display a skeleton preview area with a shimmer animation representing the incoming diagram
3. WHEN diagram generation is in progress, THE Generation_Progress_UI SHALL display an elapsed time counter that updates every second
4. THE Generation_Progress_UI SHALL transition between steps with a smooth animation lasting no more than 300 milliseconds
5. WHILE diagram generation is in progress, THE Generation_Progress_UI SHALL display an animated progress bar or pulse indicator

### Requirement 3: Prompt Generator Mode

**User Story:** As a user, I want to upload inventory files or paste content and have AI generate an architecture prompt, so that I can create diagrams from existing infrastructure documentation.

#### Acceptance Criteria

1. THE Create_Page SHALL display a toggle switch with options "Manual Prompt" and "Prompt Generator"
2. WHEN the user selects "Prompt Generator" mode, THE Create_Page SHALL display a file upload area and a large text area for pasting content
3. THE Prompt_Generator SHALL accept files with extensions: .csv, .xlsx, .pdf, .txt, .json, .eml
4. IF a user uploads a file exceeding 5 megabytes, THEN THE Prompt_Generator SHALL display an error message indicating the file size limit
5. IF a user uploads a file with an unsupported extension, THEN THE Prompt_Generator SHALL display an error message listing accepted file types
6. WHEN the user submits uploaded content or pasted text, THE Prompt_Generator SHALL send the content to the Lambda_Function_URL with mode "chat" for analysis
7. WHEN the Lambda_Function_URL returns a generated prompt, THE Prompt_Generator SHALL populate the main prompt text area with the result
8. WHILE the AI is analyzing the uploaded content, THE Prompt_Generator SHALL display a loading indicator with the message "Analyzing your content..."
9. THE Prompt_Generator SHALL allow the user to edit the generated prompt before clicking "Generate Diagram"
10. WHEN the user switches from "Prompt Generator" mode back to "Manual Prompt" mode, THE Create_Page SHALL preserve any text currently in the prompt text area

### Requirement 4: Remove Template Section from Create Page

**User Story:** As a user, I want a simplified Create Page focused on prompt input and the prompt generator, so that the interface is less cluttered.

#### Acceptance Criteria

1. THE Create_Page SHALL NOT display the "Start from a template" section or template selector cards
2. THE Create_Page SHALL retain the navigation link to the /templates page
3. WHEN a user navigates to /templates, THE application SHALL still display the full templates page

### Requirement 5: AWS Pricing Calculator Link in Chatbot

**User Story:** As a user, I want to get a cost estimate for my architecture from the chatbot, so that I can understand the monthly cost implications of my design.

#### Acceptance Criteria

1. THE Chatbot SHALL display a "Get AWS Pricing Estimate" suggestion chip
2. WHEN the user clicks the "Get AWS Pricing Estimate" chip, THE Chatbot SHALL send the current diagram XML to the Lambda_Function_URL with mode "chat" and a pricing analysis instruction
3. WHEN the Lambda_Function_URL returns a pricing response, THE Chatbot SHALL display a cost breakdown summary listing inferred services and estimated monthly costs
4. THE Chatbot SHALL include a link to calculator.aws in the pricing response
5. THE Chatbot SHALL infer AWS services, regions, and instance sizes from the current diagram XML context without asking excessive follow-up questions
6. IF the current diagram XML is empty or unavailable, THEN THE Chatbot SHALL display a message indicating that a diagram is required for pricing estimation

### Requirement 6: Theme Toggle on Create Page

**User Story:** As a user, I want to toggle between light and dark mode on the Create Page, so that I can use my preferred visual theme while working.

#### Acceptance Criteria

1. THE Create_Page SHALL display a theme toggle button in the top-right corner of the page
2. THE theme toggle button SHALL use a sun icon for light mode and a moon icon for dark mode
3. WHEN the user clicks the theme toggle, THE application SHALL switch between light and dark color modes using the existing next-themes configuration
4. THE theme toggle on the Create_Page SHALL synchronize with the theme setting on the Settings page
