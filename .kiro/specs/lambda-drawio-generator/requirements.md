# Requirements Document

## Introduction

This feature introduces a new Lambda Function URL endpoint that generates professional-quality Draw.io XML diagrams directly using Claude Sonnet via Amazon Bedrock. It eliminates the current two-step process (generate JSON → render XML) by producing Draw.io XML in a single LLM call, and removes the 29-second API Gateway timeout constraint by using Lambda Function URLs which support up to 15 minutes of execution time.

## Glossary

- **Generator_Lambda**: The new AWS Lambda function responsible for receiving architecture description prompts and producing Draw.io XML output via Bedrock Claude Sonnet
- **Function_URL**: An AWS Lambda Function URL providing a dedicated HTTPS endpoint for invoking the Generator_Lambda without API Gateway
- **Bedrock_Client**: The Amazon Bedrock runtime client configured to invoke the Claude Sonnet model (us.anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Draw_io_XML**: Valid mxGraphModel XML conforming to the draw.io format, containing mxCell elements for nodes, edges, and containers
- **Architecture_Prompt**: A natural language description of an AWS architecture provided by the user
- **AWS_Icon_Shape**: A draw.io shape reference using the `shape=mxgraph.aws4.*` prefix from the official AWS Architecture Icons library
- **Container_Group**: A nested grouping element in Draw.io XML representing VPCs, subnets, or availability zones with proper parent-child relationships
- **Frontend_Client**: The Next.js web application that sends prompts and receives generated Draw.io XML for rendering

## Requirements

### Requirement 1: Lambda Function URL Infrastructure

**User Story:** As a developer, I want a Lambda Function URL endpoint for diagram generation, so that long-running LLM calls are not constrained by API Gateway's 29-second timeout.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision a new Lambda function named `arch-generator-drawio` with a Function URL enabled, using the NodejsFunction construct with the Lambda source entry point located in the `lambda/` directory
2. WHEN the Function URL is created, THE CDK_Stack SHALL configure it with `AuthType.NONE` for public access, CORS allowed origins set to `*`, and CORS allowed methods including at minimum POST and OPTIONS
3. THE Generator_Lambda SHALL be configured with a timeout of 900 seconds (15 minutes) and a memory size of 1024 MB
4. THE Generator_Lambda SHALL have an IAM policy granting `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` permissions scoped to Anthropic foundation model resources (resource ARN pattern `arn:aws:bedrock:*::foundation-model/anthropic.*`)
5. THE CDK_Stack SHALL output the Function URL endpoint as a CloudFormation stack output named `DrawioGeneratorFunctionUrl`
6. THE Generator_Lambda SHALL use the Node.js 22.x runtime with TypeScript compilation via NodejsFunction
7. THE Generator_Lambda SHALL be configured with environment variables providing the Bedrock model ID and Bedrock region required for LLM invocation

### Requirement 2: Bedrock Claude Sonnet Integration

**User Story:** As a developer, I want the Lambda to call Claude Sonnet via Bedrock to generate Draw.io XML, so that the system produces professional-quality diagrams in a single LLM call.

#### Acceptance Criteria

1. THE Generator_Lambda SHALL invoke Amazon Bedrock using model ID `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
2. THE Bedrock_Client SHALL send a system prompt instructing Claude to output well-formed Draw.io mxGraphModel XML containing AWS Architecture Icon shapes corresponding to the services in the architecture specification
3. WHEN the Bedrock_Client receives a response, THE Generator_Lambda SHALL extract the XML content enclosed within the `<mxGraphModel>` root element from the response body
4. THE Bedrock_Client SHALL be configured with `max_tokens` of 16384 to accommodate large diagram XML outputs
5. IF the Bedrock_Client receives a throttling or service unavailable error, THEN THE Generator_Lambda SHALL retry the request up to 2 times with exponential backoff (1 second, then 2 seconds), and return an error response indicating service unavailability if all retry attempts are exhausted
6. THE Bedrock_Client SHALL set the temperature to 0.2 for deterministic and consistent diagram output
7. THE Bedrock_Client SHALL be configured with a request timeout of 60 seconds per invocation attempt
8. IF the Bedrock_Client response does not contain a well-formed `<mxGraphModel>` XML element, THEN THE Generator_Lambda SHALL return an error response indicating that diagram generation failed without returning partial or malformed output to the caller
9. IF the Bedrock_Client receives an access denied or model not found error, THEN THE Generator_Lambda SHALL return an error response indicating the model is not available without retrying the request

### Requirement 3: Draw.io XML Direct Generation

**User Story:** As a user, I want the system to generate Draw.io XML directly from my prompt, so that I get professional architecture diagrams without a separate rendering step.

#### Acceptance Criteria

1. WHEN an Architecture_Prompt is received, THE Generator_Lambda SHALL produce a complete mxGraphModel XML document containing all diagram elements within 60 seconds for architectures containing up to 50 services
2. THE Generator_Lambda SHALL include AWS_Icon_Shapes using the `shape=mxgraph.aws4.*` naming convention for all AWS services listed in the supported service registry
3. THE Generator_Lambda SHALL generate Container_Groups for VPC, subnet, and availability zone elements with proper parent-child nesting via the `parent` attribute on mxCell elements
4. THE Generator_Lambda SHALL apply orthogonal edge routing with rounded corners using `edgeStyle=orthogonalEdgeStyle;rounded=1` on all connection edges
5. THE Generator_Lambda SHALL apply a professional color scheme with AWS-standard container fill colors: VPC (#E7F3E7), subnet (#EFF6FF), availability zone (#FFF7ED)
6. THE Generator_Lambda SHALL size service nodes at 60x60 pixels with a 16px icon and a label positioned below the node
7. THE Generator_Lambda SHALL space nodes with a minimum of 120 pixels horizontal and 100 pixels vertical gap between adjacent elements
8. IF a service in the Architecture_Prompt is not recognized against the supported service registry, THEN THE Generator_Lambda SHALL render the service as a labeled generic rectangle node with a review annotation
9. THE Generator_Lambda SHALL validate that the generated output is well-formed XML with a single `<mxGraphModel>` root element before returning it to the caller

### Requirement 4: Request Handling and Validation

**User Story:** As a developer, I want the Lambda to validate incoming requests and return structured responses, so that the frontend can handle both success and error cases.

#### Acceptance Criteria

1. WHEN a POST request is received at the Function URL, THE Generator_Lambda SHALL parse the JSON body expecting a `prompt` field of type string
2. IF the request body is missing or contains invalid JSON, THEN THE Generator_Lambda SHALL return HTTP 400 with a JSON response body containing an `error` field describing whether the body is missing or the JSON is malformed
3. IF the `prompt` field is missing, not of type string, or shorter than 10 characters, THEN THE Generator_Lambda SHALL return HTTP 400 with a JSON response body containing an `error` field indicating the minimum prompt length of 10 characters
4. IF the `prompt` field exceeds 5000 characters, THEN THE Generator_Lambda SHALL return HTTP 400 with a JSON response body containing an `error` field indicating the maximum prompt length of 5000 characters
5. WHEN generation succeeds, THE Generator_Lambda SHALL return HTTP 200 with a JSON body containing a `drawioXml` field (the complete Draw.io XML string) and a `diagramId` field (a string identifier unique per generation)
6. THE Generator_Lambda SHALL include CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`) in all responses
7. WHEN an OPTIONS request is received, THE Generator_Lambda SHALL return HTTP 200 with CORS headers and an empty body
8. IF a request is received with an HTTP method other than POST or OPTIONS, THEN THE Generator_Lambda SHALL return HTTP 405 with a JSON response body containing an `error` field indicating the method is not allowed

### Requirement 5: Error Handling and Resilience

**User Story:** As a user, I want clear error messages when diagram generation fails, so that I can understand the issue and take corrective action.

#### Acceptance Criteria

1. IF the Bedrock_Client returns an AccessDeniedException, THEN THE Generator_Lambda SHALL return HTTP 503 with error code `MODEL_ACCESS_DENIED` and a message indicating the Bedrock model is not enabled, without retrying the request
2. IF the Bedrock_Client returns a retryable error (timeout, throttling, or service unavailability), THEN THE Generator_Lambda SHALL retry the request up to 2 additional times using exponential backoff starting at 1 second before returning HTTP 502 with error code `LLM_ERROR` and the underlying error message
3. IF the LLM response does not contain valid XML (no `<mxGraphModel>` root element), THEN THE Generator_Lambda SHALL return HTTP 422 with error code `INVALID_XML` and a message indicating the AI did not produce valid diagram XML
4. IF the Bedrock_Client request does not complete within 60 seconds per attempt, THEN THE Generator_Lambda SHALL treat it as a retryable timeout error
5. IF an unexpected error occurs during processing, THEN THE Generator_Lambda SHALL log the error message, stack trace, and request context to CloudWatch and return HTTP 500 with a generic `Internal server error` message without exposing internal details in the response body
6. THE Generator_Lambda SHALL include a `requestId` field derived from the Lambda context, an `error` message field, and an error `code` field in all error responses for traceability and consistent parsing

### Requirement 6: Frontend Integration

**User Story:** As a frontend developer, I want to call the new Function URL endpoint and render the result, so that users see professional diagrams generated directly from their prompts.

#### Acceptance Criteria

1. THE Frontend_Client SHALL send a POST request to the Generator_Lambda Function URL with the user's prompt in the request body as `{ "prompt": "<user input>" }` and a `Content-Type` header of `application/json`
2. WHEN the Frontend_Client receives an HTTP 200 response containing a JSON body with a non-empty `drawioXml` string field, THE Frontend_Client SHALL extract the `drawioXml` field and pass it to the DiagramCanvas component for rendering
3. WHILE the Frontend_Client is waiting for a response from the Generator_Lambda, THE Frontend_Client SHALL display a loading indicator with a message indicating diagram generation is in progress, and SHALL disable the submit control to prevent duplicate requests
4. IF the Frontend_Client receives an HTTP 4xx or 5xx response, or a response body containing an `error` field, THEN THE Frontend_Client SHALL display the error message to the user in a toast notification that remains visible for at least 5 seconds or until the user manually dismisses it
5. THE Frontend_Client SHALL configure the fetch request with a timeout of at least 900 seconds to accommodate long-running generation requests
6. THE Frontend_Client SHALL store the Function URL endpoint in an environment variable `NEXT_PUBLIC_DRAWIO_GENERATOR_URL`
7. IF the `NEXT_PUBLIC_DRAWIO_GENERATOR_URL` environment variable is not set or is empty at runtime, THEN THE Frontend_Client SHALL display an error message indicating that the diagram generation service is not configured and SHALL not attempt the network request

### Requirement 7: System Prompt for Draw.io XML Generation

**User Story:** As a developer, I want a well-crafted system prompt that instructs Claude to generate valid Draw.io XML, so that the output consistently matches professional quality standards.

#### Acceptance Criteria

1. THE Generator_Lambda SHALL include a system prompt that specifies the exact mxGraphModel XML structure including root, mxCell id="0", and mxCell id="1" parent="0" boilerplate
2. THE system prompt SHALL enumerate the mapping between AWS service types listed in the supported service registry and their corresponding `shape=mxgraph.aws4.*` shape identifiers, and SHALL specify that any service type without a known aws4 shape mapping be rendered using a generic rectangle node with the service name as label
3. THE system prompt SHALL instruct Claude to use nested container patterns with swimlane style for VPC, subnet, and availability zone groupings
4. THE system prompt SHALL specify edge styling requirements including orthogonal routing (`edgeStyle=orthogonalEdgeStyle`), rounded corners with a radius of 10 pixels, and stroke color `#545B64` for standard connections and `#FF9900` for highlighted or primary data-flow connections
5. THE system prompt SHALL instruct Claude to respond with only the raw XML content without markdown code fences or explanatory text
6. THE system prompt SHALL include at least one reference example of a correctly structured Draw.io XML snippet demonstrating a VPC with subnets and services
7. THE system prompt SHALL specify default node dimensions of 60x60 pixels for AWS service icons and a minimum container width of 300 pixels and minimum container height of 200 pixels for grouping elements (VPC, subnet, availability zone)
8. IF the system prompt is used to generate XML for a service type not present in the shape mapping, THEN THE Generator_Lambda SHALL produce a valid mxCell with a generic rectangular style and the service type as the label text
