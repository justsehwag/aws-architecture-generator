# Requirements Document

## Introduction

The AWS Architecture Generator is a modern production-ready web application that converts natural language descriptions of AWS solutions into professional architecture diagrams using the Draw.io MCP Server. Users describe their desired infrastructure in plain English and receive editable Draw.io diagrams with official AWS Architecture Icons, along with PNG/SVG/PDF exports, architecture explanations, cost estimates, and best practice recommendations aligned with the AWS Well-Architected Framework.

The application is built with React, Next.js, TypeScript, TailwindCSS, and shadcn/ui. It leverages an LLM (OpenAI GPT-5.5 or Claude Sonnet) to interpret natural language and produce structured diagram specifications, which are then rendered via the Draw.io MCP Server. The deployment target is a serverless AWS architecture using CloudFront, S3, API Gateway, Lambda, Cognito, and DynamoDB.

## Glossary

- **Generator**: The core web application system that processes user prompts and produces architecture diagrams
- **Diagram_Engine**: The subsystem responsible for converting structured JSON into Draw.io XML via the Draw.io MCP Server
- **LLM_Service**: The AI language model service (OpenAI GPT-5.5 or Claude Sonnet) used to interpret natural language prompts
- **Draw_io_MCP**: The Draw.io MCP Server used to produce .drawio XML output
- **Diagram_Viewer**: The UI component that renders and allows editing of generated diagrams
- **Template_Library**: The collection of pre-built architecture templates available to users
- **Export_Service**: The subsystem responsible for producing PNG, SVG, PDF, JSON, and Markdown exports
- **Cost_Estimator**: The subsystem that estimates monthly AWS costs for a generated architecture
- **Architecture_Analyzer**: The subsystem that validates architectures against the AWS Well-Architected Framework
- **Auth_Service**: The authentication and authorization subsystem powered by AWS Cognito
- **Version_Store**: The subsystem that persists diagram versions and history in DynamoDB
- **IaC_Generator**: The subsystem that generates Terraform, CDK, or CloudFormation code from a diagram

## Requirements

### Requirement 1: Natural Language Prompt Input

**User Story:** As a solutions architect, I want to describe my desired AWS architecture in plain English, so that I can quickly generate a professional diagram without manual drawing.

#### Acceptance Criteria

1. WHEN a user submits a natural language prompt containing between 10 and 5000 characters, THE Generator SHALL send the prompt to the LLM_Service for interpretation
2. WHEN the LLM_Service returns a valid structured JSON representation of the architecture, THE Generator SHALL pass the JSON to the Diagram_Engine for rendering
3. WHILE the LLM_Service is processing a prompt, THE Generator SHALL display a loading indicator
4. IF the LLM_Service returns a response that cannot be parsed into valid structured JSON, THEN THE Generator SHALL display an error message indicating the prompt could not be interpreted and allow the user to resubmit
5. IF the LLM_Service fails to interpret the prompt, THEN THE Generator SHALL display an error message describing the failure reason and suggest up to 3 alternative prompt phrasings
6. IF the LLM_Service request times out after 30 seconds, THEN THE Generator SHALL retry the request up to 2 additional times before displaying a timeout error
7. IF the user submits an empty prompt or a prompt with fewer than 10 characters, THEN THE Generator SHALL display a validation error message indicating the minimum prompt length requirement
8. THE Generator SHALL accept prompts containing up to 5000 characters

### Requirement 2: Diagram Generation via Draw.io MCP

**User Story:** As a solutions architect, I want my architecture descriptions converted into editable Draw.io diagrams, so that I can refine and share professional diagrams with my team.

#### Acceptance Criteria

1. WHEN the Diagram_Engine receives a valid structured JSON architecture specification, THE Diagram_Engine SHALL produce a .drawio XML file using the Draw_io_MCP that can be opened and rendered without errors in Draw.io
2. THE Diagram_Engine SHALL use official AWS Architecture Icons for all AWS services listed in the supported service registry in the generated diagram
3. THE Diagram_Engine SHALL group resources into containers based on their declared VPC, subnet, Availability Zone, and Region associations as specified in the input JSON
4. THE Diagram_Engine SHALL apply layout algorithms such that no more than 10% of connection edges overlap or cross other nodes in the generated diagram
5. IF a service in the structured JSON is not recognized against the supported service registry, THEN THE Diagram_Engine SHALL render the service as a labeled generic node and include a review annotation on that node indicating the service was not recognized
6. WHEN a diagram is generated, THE Diagram_Engine SHALL produce the output within 10 seconds of receiving the structured JSON for specifications containing up to 50 services
7. IF the Diagram_Engine receives a malformed or schema-invalid JSON input, THEN THE Diagram_Engine SHALL reject the request and return an error message indicating which fields failed validation without producing a partial .drawio file

### Requirement 3: Diagram Viewing and Editing

**User Story:** As a solutions architect, I want to view and edit my generated diagrams directly in the browser, so that I can make adjustments without switching tools.

#### Acceptance Criteria

1. WHEN a diagram is generated, THE Diagram_Viewer SHALL render the .drawio diagram in a pannable and zoomable canvas within 3 seconds for diagrams containing up to 200 nodes
2. WHEN the user drags a node, THE Diagram_Viewer SHALL reposition that node to the new location on the canvas while maintaining all existing edge connections to that node
3. WHEN the user selects a node and triggers delete, THE Diagram_Viewer SHALL remove the selected node and all edges connected to it from the canvas
4. WHEN the user double-clicks a node, THE Diagram_Viewer SHALL present an inline text field pre-filled with the current label, allowing the user to rename the AWS service label and confirm by pressing Enter or cancel by pressing Escape
5. WHEN the user draws an edge from one node to another, THE Diagram_Viewer SHALL create a visible connection between the two selected nodes
6. WHEN the user selects a layout orientation option, THE Diagram_Viewer SHALL reflow the diagram in the chosen orientation (horizontal left-to-right or vertical top-to-bottom) while preserving all nodes and edges
7. WHEN a user modifies the diagram, THE Diagram_Viewer SHALL support undo and redo operations via Ctrl+Z and Ctrl+Y keyboard shortcuts for up to the 50 most recent actions in the current editing session
8. WHEN the user triggers diagram regeneration from a modified prompt, THE Diagram_Viewer SHALL discard the current diagram and render a new diagram based on the updated prompt
9. IF the user triggers a destructive action (delete node or regenerate diagram), THEN THE Diagram_Viewer SHALL display a confirmation prompt before executing the action, allowing the user to cancel

### Requirement 4: Multi-Format Export

**User Story:** As a solutions architect, I want to export my diagrams in multiple formats, so that I can include them in presentations, documents, and infrastructure repositories.

#### Acceptance Criteria

1. WHEN a user requests an export, THE Export_Service SHALL generate the diagram in the requested format within 5 seconds for diagrams containing up to 50 architecture components
2. THE Export_Service SHALL support export to .drawio (native Draw.io XML) format
3. THE Export_Service SHALL support export to PNG format with a minimum resolution of 300 DPI and dimensions matching the diagram canvas size
4. THE Export_Service SHALL support export to SVG format preserving all nodes, edges, labels, and groupings as scalable vector elements without rasterization
5. THE Export_Service SHALL support export to PDF format with configurable page size (A4, Letter, A3)
6. THE Export_Service SHALL support export to JSON format containing the architecture specification including service names, service types, connections between services, and metadata properties for each component
7. THE Export_Service SHALL support export to Markdown format containing an architecture summary, a list of services with their types, and a description of connections between services
8. IF a user requests an export in an unsupported format, THEN THE Export_Service SHALL reject the request and return an error message indicating the format is not supported along with the list of supported formats
9. IF an export operation fails due to a processing error, THEN THE Export_Service SHALL return an error message indicating the failure reason without producing a partial or corrupted output file

### Requirement 5: Architecture Templates

**User Story:** As a solutions architect, I want access to pre-built architecture templates, so that I can quickly start from a proven pattern and customize it for my needs.

#### Acceptance Criteria

1. THE Template_Library SHALL provide at least 8 pre-built templates including: 3-Tier Web Application, Serverless API, Microservices, AI Chatbot, SAP on AWS, Data Lake, ML Pipeline, and Event-Driven Architecture
2. WHEN a user selects a template, THE Template_Library SHALL load the template into the Diagram_Viewer within 3 seconds, displaying all components and connections defined in the template as editable diagram elements
3. WHEN a user selects a template, THE Template_Library SHALL display a description of the architecture pattern (between 50 and 500 characters) and at least 2 intended use cases
4. THE Template_Library SHALL allow users to save up to 25 custom diagrams as personal templates, requiring a template name (1 to 100 characters) at the time of saving
5. IF a template fails to load into the Diagram_Viewer, THEN THE Template_Library SHALL display an error message indicating the failure reason and retain the user's current diagram state unchanged
6. THE Template_Library SHALL display all available templates in a browsable list showing each template's name, description summary, and category

### Requirement 6: Smart Architecture Analysis

**User Story:** As a solutions architect, I want the system to analyze my architecture for completeness and best practices, so that I can identify gaps before implementation.

#### Acceptance Criteria

1. WHEN a diagram is generated, THE Architecture_Analyzer SHALL detect missing components by comparing the architecture against a reference checklist of common infrastructure components (load balancers, NAT gateways, monitoring services, DNS, CDN, backup) and suggest additions, displaying each suggestion with a severity level of Critical, Recommended, or Optional
2. WHEN a diagram is generated, THE Architecture_Analyzer SHALL evaluate the architecture against the AWS Well-Architected Framework pillars (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability) and produce a per-pillar summary indicating whether gaps were found or no gaps were detected
3. WHEN a diagram is generated, THE Architecture_Analyzer SHALL provide up to 10 security improvement recommendations (encryption, IAM policies, network isolation), each labeled with a severity level of Critical, Recommended, or Optional
4. WHEN a diagram is generated, THE Architecture_Analyzer SHALL provide up to 10 high-availability improvement recommendations (multi-AZ, auto-scaling, failover), each labeled with a severity level of Critical, Recommended, or Optional
5. WHEN a diagram is generated, THE Architecture_Analyzer SHALL provide up to 10 cost optimization recommendations (right-sizing, reserved capacity, serverless alternatives), each labeled with a severity level of Critical, Recommended, or Optional
6. WHEN recommendations are generated, THE Architecture_Analyzer SHALL display them in a side panel adjacent to the diagram, grouped by category (Security, High-Availability, Cost Optimization) and sorted by severity level from Critical to Optional
7. IF the Architecture_Analyzer detects no gaps or recommendations for a given category, THEN THE Architecture_Analyzer SHALL display a confirmation message indicating no issues were found for that category

### Requirement 7: Cost Estimation

**User Story:** As a solutions architect, I want to see estimated monthly costs for my architecture, so that I can make informed decisions about resource selection.

#### Acceptance Criteria

1. WHEN a diagram is generated, THE Cost_Estimator SHALL calculate an estimated monthly cost in USD for the architecture based on default usage assumptions of 730 hours per month compute, 1 million requests per month, 100 GB data transfer per month, and 50 GB storage per service
2. WHEN a diagram is generated or a cost recalculation completes, THE Cost_Estimator SHALL display cost breakdowns per AWS service in the architecture, showing each service name, its individual estimated monthly cost rounded to two decimal places, and the total estimated monthly cost
3. WHEN a user adds, removes, or replaces a service in the architecture, THE Cost_Estimator SHALL recalculate the estimated cost within 3 seconds
4. THE Cost_Estimator SHALL allow users to adjust usage parameters (requests per month ranging from 1 to 10 billion, data transfer volume ranging from 0 to 100 TB, storage size ranging from 0 to 1 PB) to refine estimates
5. IF pricing data is unavailable for a service due to an unsupported service type or a data retrieval failure, THEN THE Cost_Estimator SHALL indicate the service cost as "estimate unavailable" and exclude it from the total
6. IF the architecture contains no AWS services, THEN THE Cost_Estimator SHALL display a total estimated monthly cost of $0.00 and show no service breakdown

### Requirement 8: Architecture Explanation

**User Story:** As a solutions architect, I want a plain-language explanation of my generated architecture, so that I can share context with non-technical stakeholders.

#### Acceptance Criteria

1. WHEN a diagram is generated, THE Generator SHALL produce a plain-language explanation of the architecture that describes each AWS service node and its role, using no undefined acronyms or technical jargon without inline definitions
2. WHEN a diagram is generated, THE Generator SHALL produce a summary table listing all AWS services used with columns for service name, purpose, and connections to other services in the architecture
3. WHEN a diagram is generated, THE Generator SHALL produce up to 10 best practice recommendations aligned with the AWS Well-Architected Framework specific to the architecture pattern
4. WHEN a user modifies the diagram, THE Generator SHALL update the architecture explanation, summary table, and recommendations to reflect the current diagram state within 5 seconds of the modification
5. WHEN the architecture explanation is generated, THE Generator SHALL display the explanation, summary table, and recommendations in a dedicated panel adjacent to the diagram

### Requirement 9: User Authentication and Authorization

**User Story:** As a user, I want to securely log in and manage my diagrams, so that my work is protected and persisted across sessions.

#### Acceptance Criteria

1. THE Auth_Service SHALL authenticate users via AWS Cognito supporting email/password and social login (Google, GitHub)
2. IF a user is not authenticated, THEN THE Auth_Service SHALL redirect the user to the login page and prevent access to the Create Diagram, Diagram Viewer, and Templates pages
3. WHILE a user is authenticated, THE Auth_Service SHALL associate all generated diagrams with the user's account
4. IF an authentication token expires, THEN THE Auth_Service SHALL attempt a silent token refresh within 5 seconds, and redirect to the login page if the refresh fails
5. IF a user provides invalid credentials, THEN THE Auth_Service SHALL display an error message indicating the login attempt failed without revealing which field (email or password) was incorrect
6. IF a user fails to authenticate 5 consecutive times, THEN THE Auth_Service SHALL temporarily lock the account for 15 minutes and display a message indicating the lockout duration

### Requirement 10: Version History and Autosave

**User Story:** As a solutions architect, I want my diagram changes saved automatically with version history, so that I can recover previous versions without manual saves.

#### Acceptance Criteria

1. WHILE a user is editing a diagram, THE Version_Store SHALL autosave the diagram state every 30 seconds, storing the full diagram layout including all nodes, connections, and metadata
2. WHEN a user explicitly saves a diagram, THE Version_Store SHALL create a version snapshot labeled with a user-provided name of up to 100 characters and the current timestamp
3. THE Version_Store SHALL retain up to 50 versions per diagram, and WHEN the limit is reached, THE Version_Store SHALL remove the oldest autosaved version to make room for the new version while preserving all explicitly named versions
4. WHEN a user requests version history, THE Version_Store SHALL display a chronological list of saved versions showing the version name or "Autosave" label, the timestamp, and the authoring user
5. WHEN a user selects a previous version to restore, THE Version_Store SHALL first autosave the current diagram state as a version, then restore the diagram to the selected version's state
6. IF an autosave operation fails, THEN THE Version_Store SHALL display an indicator to the user that the autosave failed and SHALL retry the save within 30 seconds
7. IF a version restore operation fails, THEN THE Version_Store SHALL retain the current diagram state unchanged and display an error message indicating the restore could not be completed

### Requirement 11: Application Pages and Navigation

**User Story:** As a user, I want clear navigation between application pages, so that I can efficiently access all features.

#### Acceptance Criteria

1. THE Generator SHALL provide a Dashboard page displaying up to 10 most-recently-modified diagrams, quick-start templates, and usage statistics including total diagrams created and total generations performed
2. THE Generator SHALL provide a Create Diagram page with a prompt input field accepting up to 5000 characters, a template selector, and generation controls including a generate button and a clear/reset button
3. THE Generator SHALL provide a Diagram Viewer page with the interactive canvas, export controls, analysis panel, and cost estimation panel
4. THE Generator SHALL provide a Templates page listing all available and saved templates with search by name or description and filtering by category
5. THE Generator SHALL provide a Settings page for user preferences including theme selection, default AWS region, LLM model selection, and keyboard shortcut customization
6. THE Generator SHALL provide a persistent navigation bar accessible from all pages containing links to Dashboard, Create Diagram, Templates, and Settings, with the current page visually indicated as active
7. WHEN the user selects a navigation link, THE Generator SHALL navigate to the target page within 1 second without full page reload
8. WHEN the user navigates to the Diagram Viewer page without a selected diagram, THE Generator SHALL redirect the user to the Dashboard page

### Requirement 12: Responsive UI and Accessibility

**User Story:** As a user, I want the application to work well on different devices and be accessible, so that I can use it in various contexts and with assistive technologies.

#### Acceptance Criteria

1. THE Generator SHALL render all content without horizontal scrolling and with all interactive elements remaining usable on viewports from 375px to 2560px width
2. THE Generator SHALL support a dark mode theme toggled via user settings, where user-selected theme preference takes precedence over the operating system preference
3. THE Generator SHALL meet WCAG 2.1 Level AA accessibility standards for all content and interactive elements, including color contrast ratios of at least 4.5:1 for normal text and 3:1 for large text in both light and dark themes
4. THE Generator SHALL support keyboard navigation using Tab, Shift+Tab, Enter, Escape, and Arrow keys for all actions reachable via the user interface, without requiring a mouse
5. THE Generator SHALL render the first meaningful content (Largest Contentful Paint) within 2 seconds on a 10 Mbps connection with 50ms round-trip latency
6. WHILE a user navigates via keyboard, THE Generator SHALL display a visible focus indicator with a minimum contrast ratio of 3:1 against adjacent colors on the currently focused element

### Requirement 13: Error Handling and Resilience

**User Story:** As a user, I want the application to handle errors gracefully, so that I can continue working without losing progress.

#### Acceptance Criteria

1. IF an API call returns an HTTP error status (4xx or 5xx) or fails to receive a response within 15 seconds, THEN THE Generator SHALL display a non-technical error message describing the failed action and present a retry button
2. IF a network disconnection is detected, THEN THE Generator SHALL queue up to 20 pending changes in browser local storage and synchronize them in order when connectivity is restored within 5 minutes
3. IF the Diagram_Engine produces an invalid .drawio file, THEN THE Generator SHALL display a fallback error view indicating that diagram rendering failed and retain the structured JSON in memory for user-initiated retry
4. IF an external service call fails, THEN THE Generator SHALL retry the request using exponential backoff starting at 1 second with a maximum of 3 attempts before displaying an error to the user
5. WHILE the Generator is in an error state due to a failed operation, THE Generator SHALL preserve all unsaved user edits in the current session so that no in-progress work is lost

### Requirement 14: Infrastructure as Code Generation

**User Story:** As a DevOps engineer, I want to generate IaC code from my architecture diagram, so that I can deploy the designed infrastructure programmatically.

#### Acceptance Criteria

1. WHEN a user requests IaC generation with Terraform selected, THE IaC_Generator SHALL produce syntactically valid Terraform code containing one resource block for each resource node in the architecture diagram, with inter-resource references reflecting the connections defined in the diagram
2. WHEN a user requests IaC generation with AWS CDK selected, THE IaC_Generator SHALL produce syntactically valid AWS CDK (TypeScript) code containing one construct for each resource node in the architecture diagram, with inter-resource references reflecting the connections defined in the diagram
3. WHEN a user requests IaC generation with CloudFormation selected, THE IaC_Generator SHALL produce syntactically valid CloudFormation YAML containing one resource entry for each resource node in the architecture diagram, with inter-resource references reflecting the connections defined in the diagram
4. WHEN IaC code is generated, THE IaC_Generator SHALL use parameterized values for configurable properties including instance types, CIDR blocks, and naming conventions, with each parameter assigned a default value derived from the diagram
5. IF the architecture contains services not representable in the selected IaC format, THEN THE IaC_Generator SHALL include a comment in the generated code identifying each unsupported resource by its diagram node name and stating that it requires manual configuration
6. IF the architecture diagram contains more than 50 resource nodes, THEN THE IaC_Generator SHALL display an error message indicating the diagram exceeds the supported resource limit

### Requirement 15: Diagram Import

**User Story:** As a solutions architect, I want to import existing .drawio diagrams, so that I can enhance and analyze architectures I have already created.

#### Acceptance Criteria

1. WHEN a user uploads a valid .drawio file, THE Generator SHALL parse the file and render all shapes, connectors, and text labels in the Diagram_Viewer within 10 seconds
2. WHEN a user uploads a valid .drawio file, THE Architecture_Analyzer SHALL analyze the imported diagram for recommendations within 30 seconds of upload completion
3. IF the uploaded file is not well-formed XML or does not conform to the .drawio schema, THEN THE Generator SHALL display an error message indicating whether the file is not valid XML or is missing required .drawio structure
4. THE Generator SHALL support importing .drawio files up to 10 MB in size
5. IF the uploaded file exceeds 10 MB, THEN THE Generator SHALL reject the upload and display an error message indicating the maximum allowed file size of 10 MB

### Requirement 16: Serverless Deployment Architecture

**User Story:** As a DevOps engineer, I want the application deployed on a serverless AWS architecture, so that it scales automatically and minimizes operational overhead.

#### Acceptance Criteria

1. THE Generator SHALL be deployed with CloudFront serving the static frontend assets from S3
2. THE Generator SHALL route API requests through API Gateway to Lambda functions with a maximum execution timeout of 29 seconds per invocation
3. THE Generator SHALL persist user data and diagram metadata in DynamoDB using on-demand capacity mode
4. THE Generator SHALL store generated diagram files (.drawio, PNG, SVG, PDF) in S3 with a maximum individual file size of 50 MB
5. IF a request to API Gateway does not include a valid AWS Cognito authentication token, THEN THE Generator SHALL reject the request and return an unauthorized error indication without processing the request further
6. THE Generator SHALL enforce a rate limit of 1000 requests per second per user at the API Gateway level
7. IF a Lambda function invocation fails or times out, THEN THE Generator SHALL return an error indication to the caller and preserve any previously persisted data unchanged

### Requirement 17: Advanced Features

**User Story:** As a power user, I want advanced capabilities like architecture comparison, voice input, and multi-language support, so that I can work more efficiently and collaborate across teams.

#### Acceptance Criteria

1. WHERE architecture comparison is enabled, WHEN the user selects two architecture versions, THE Generator SHALL display both diagrams side-by-side and highlight added, removed, and modified components using distinct visual indicators
2. WHERE voice input is enabled, WHEN the user activates speech input, THE Generator SHALL transcribe the spoken description using the browser speech recognition API and populate the architecture description input field with the transcribed text within 5 seconds of speech completion
3. IF the browser does not support speech recognition or the transcription fails, THEN THE Generator SHALL display an error message indicating the failure reason and allow the user to enter the description manually
4. WHERE multi-language is enabled, THE Generator SHALL localize all UI labels, button text, navigation elements, tooltips, and system-generated messages in English, German, French, Spanish, and Japanese
5. WHEN a user requests an Architecture Decision Record, THE Generator SHALL produce a Markdown document containing at minimum: title, status, context, decision, and consequences sections
6. WHEN a user requests pre-sales documentation, THE Generator SHALL produce a document containing at minimum: solution overview, architecture diagram, AWS services used with their roles, and key design decisions
7. WHERE architecture comparison is enabled, IF the user has fewer than two architecture versions available, THEN THE Generator SHALL disable the comparison action and display a message indicating that two versions are required
