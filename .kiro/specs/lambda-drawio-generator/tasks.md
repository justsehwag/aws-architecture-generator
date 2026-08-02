# Implementation Plan: Lambda Draw.io Generator

## Overview

This plan implements a new Lambda function (`arch-generator-drawio`) that generates Draw.io XML directly from architecture prompts using Claude Sonnet via Amazon Bedrock. The Lambda uses a Function URL (no API Gateway) for up to 15-minute execution. The frontend calls this endpoint and renders the resulting XML in the existing DiagramCanvas component.

## Tasks

- [x] 1. Create the system prompt module
  - [x] 1.1 Create `infrastructure/lambda/drawio-generator/system-prompt.ts`
    - Export a `buildSystemPrompt()` function returning the full system prompt string
    - Include mxGraphModel XML structure boilerplate (root, mxCell id="0", mxCell id="1" parent="0")
    - Include the complete AWS service → `shape=mxgraph.aws4.*` mapping table (lambda, ec2, s3, dynamodb, api-gateway, cloudfront, rds, sqs, sns, ecs, eks, vpc, elb, alb, cognito, kinesis, step-functions, eventbridge, route53, waf, cloudwatch, etc.)
    - Include container patterns (VPC, subnet, AZ) with swimlane style and proper parent-child nesting
    - Specify edge styling: `edgeStyle=orthogonalEdgeStyle;rounded=1`, stroke color `#545B64` for standard, `#FF9900` for highlighted
    - Specify node dimensions: 60x60 px for service icons, min 300x200 px for containers
    - Specify spacing: 120px horizontal, 100px vertical minimum gap
    - Specify color scheme: VPC `#E7F3E7`, subnet `#EFF6FF`, AZ `#FFF7ED`
    - Include one reference example XML snippet (VPC with subnets and services)
    - Instruct Claude to respond with raw XML only (no markdown fences, no explanatory text)
    - Instruct fallback to labeled generic rectangle for unrecognized services
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 2. Implement the Lambda handler
  - [x] 2.1 Create `infrastructure/lambda/drawio-generator/index.ts` with request validation
    - Export `handler` function typed for `LambdaFunctionURLEvent` → `LambdaFunctionURLResponse`
    - Implement OPTIONS handling (return 200 with CORS headers, empty body)
    - Implement HTTP method check (reject non-POST/OPTIONS with 405)
    - Parse JSON body, return 400 if missing or malformed
    - Validate `prompt` field: must be string, 10-5000 characters
    - Include CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`) in all responses
    - Include `requestId` (from `event.requestContext.requestId`), `error`, and `code` in all error responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8, 5.6_

  - [x] 2.2 Implement Bedrock invocation with retry logic
    - Create `BedrockRuntimeClient` initialized outside handler (warm starts)
    - Read `BEDROCK_MODEL_ID` and `BEDROCK_REGION` from environment variables
    - Implement `callBedrockWithRetry(prompt: string)` with max 3 attempts total
    - Set `max_tokens: 16384`, `temperature: 0.2`, 60-second timeout per attempt
    - Retry on ThrottlingException, ServiceUnavailableException, timeout with exponential backoff (1s, 2s)
    - Return immediately on AccessDeniedException (no retry), map to HTTP 503 `MODEL_ACCESS_DENIED`
    - Map exhausted retries to HTTP 502 `LLM_ERROR`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.9, 5.1, 5.2, 5.4_

  - [x] 2.3 Implement XML extraction and validation
    - Create `extractDrawioXml(llmResponse: string): string | null` that extracts content from `<mxGraphModel` to `</mxGraphModel>` inclusive
    - Validate extracted XML is well-formed with a single `<mxGraphModel>` root element
    - If extraction fails or XML is invalid, return HTTP 422 with `INVALID_XML` code
    - Generate `diagramId` in format `drawio-{timestamp}-{random}`
    - Return HTTP 200 with `{ drawioXml, diagramId }` on success
    - Log unexpected errors to CloudWatch (message, stack trace, request context) and return HTTP 500 with generic message
    - _Requirements: 2.3, 2.8, 3.9, 4.5, 5.3, 5.5_

  - [ ]* 2.4 Write property tests for request validation (Properties 4, 5, 8)
    - **Property 4: Invalid request bodies are rejected with HTTP 400**
    - **Property 5: Prompt length boundaries are enforced**
    - **Property 8: Unsupported HTTP methods are rejected**
    - Use fast-check to generate random invalid JSON, missing prompt fields, random HTTP methods
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.8**

  - [ ]* 2.5 Write property tests for XML extraction and retry logic (Properties 1, 2, 3)
    - **Property 1: XML extraction preserves content**
    - **Property 2: Retry logic respects retry budget and backoff**
    - **Property 3: XML validation accepts valid and rejects invalid**
    - Use fast-check to generate random XML strings wrapped in arbitrary text, random success/failure sequences
    - **Validates: Requirements 2.3, 2.5, 2.8, 3.9, 5.2, 5.3, 5.4**

  - [ ]* 2.6 Write property tests for response structure (Properties 6, 7, 9)
    - **Property 6: Success responses contain required fields**
    - **Property 7: All responses include CORS headers and error responses include structured fields**
    - **Property 9: Unexpected errors produce generic responses**
    - Use fast-check to generate random valid/invalid requests, verify CORS headers and response shapes
    - **Validates: Requirements 4.5, 4.6, 5.5, 5.6**

- [x] 3. Checkpoint - Lambda handler complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add CDK infrastructure for the new Lambda
  - [x] 4.1 Update `infrastructure/lib/arch-generator-stack.ts`
    - Add a new `NodejsFunction` named `arch-generator-drawio` after the existing `generateFn`
    - Entry point: `lambda/drawio-generator/index.ts`, handler: `handler`
    - Runtime: Node.js 22.x, timeout: 900 seconds, memory: 1024 MB
    - Environment variables: `BEDROCK_MODEL_ID` = `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, `BEDROCK_REGION` = `us-east-1`
    - Bundling: `minify: false, sourceMap: true, externalModules: []`
    - Add IAM policy: `bedrock:InvokeModel` + `bedrock:InvokeModelWithResponseStream` on `arn:aws:bedrock:*::foundation-model/anthropic.*`
    - Add Function URL with `AuthType.NONE`, CORS origins `*`, methods POST, headers `Content-Type`
    - Add `CfnOutput` named `DrawioGeneratorFunctionUrl` with the Function URL value
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 4.2 Write CDK assertion tests for the new resources
    - Verify synthesized template contains Lambda function with correct runtime, timeout, memory
    - Verify Function URL resource with CORS configuration
    - Verify IAM policy with Bedrock permissions
    - Verify CfnOutput exists for the Function URL
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Implement frontend service and hook
  - [x] 5.1 Create `src/services/drawio-generator.ts`
    - Export `DrawioGenerateRequest`, `DrawioGenerateResponse`, `DrawioGenerateError` interfaces
    - Export `generateDrawioXml(request: DrawioGenerateRequest): Promise<DrawioGenerateResponse>`
    - Read `NEXT_PUBLIC_DRAWIO_GENERATOR_URL` from `process.env`
    - Throw a configuration error if the URL is not set or empty
    - Send POST with `{ prompt }` body and `Content-Type: application/json` header
    - Use `AbortController` with 900-second timeout
    - Parse response: extract `drawioXml` and `diagramId` on success
    - Throw typed `DrawioGenerateError` for HTTP 4xx/5xx responses (extract `error`, `code`, `requestId`)
    - _Requirements: 6.1, 6.5, 6.6, 6.7_

  - [x] 5.2 Create `src/hooks/useDrawioGenerator.ts`
    - Export `UseDrawioGeneratorReturn` interface with `generate`, `drawioXml`, `diagramId`, `isGenerating`, `error`, `reset`
    - Export `useDrawioGenerator()` hook
    - Manage loading state: set `isGenerating: true` on call, disable duplicate submissions
    - On success: store `drawioXml` and `diagramId` in state
    - On error: parse error response, display toast notification (visible 5+ seconds or until dismissed)
    - Integrate with existing toast system for error display
    - Provide `reset()` to clear state
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ]* 5.3 Write unit tests for the frontend service and hook
    - Test service: correct fetch construction, timeout configuration, error parsing
    - Test hook: loading state transitions, duplicate submission prevention, error/success states
    - Test missing environment variable handling
    - _Requirements: 6.1, 6.3, 6.4, 6.7_

- [x] 6. Frontend integration with DiagramCanvas
  - [x] 6.1 Wire `useDrawioGenerator` into the diagram generation UI
    - In the component handling prompt submission, call `useDrawioGenerator().generate(prompt)`
    - Display loading indicator with "Generating diagram..." message while `isGenerating` is true
    - Disable the submit button while generating
    - On success, pass `drawioXml` to `DiagramCanvas` via the `xml` prop
    - Show error toast on failure using the existing toast notification pattern
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. Environment variable setup
  - [x] 7.1 Add `NEXT_PUBLIC_DRAWIO_GENERATOR_URL` to `.env.local`
    - Add the variable with a placeholder value (to be replaced after CDK deployment)
    - Document the variable purpose in a comment
    - _Requirements: 6.6_

- [x] 8. Final checkpoint - Build verification
  - [x] 8.1 Verify the project builds successfully
    - Run `npm run build` to confirm no TypeScript compilation errors
    - Run CDK synth (`npx cdk synth`) in the infrastructure directory to confirm template generation
    - Ensure all tests pass
    - _Requirements: 1.1, 1.6_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The Lambda handler follows the same pattern as the existing `generate` Lambda but uses `LambdaFunctionURLEvent` instead of API Gateway events
- The frontend hook follows the same state management pattern as `useGenerationState`
- All 9 correctness properties from the design are covered across tasks 2.4, 2.5, and 2.6

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "5.1"] },
    { "id": 3, "tasks": ["2.3", "5.2"] },
    { "id": 4, "tasks": ["2.4", "2.5", "4.2"] },
    { "id": 5, "tasks": ["2.6", "5.3"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["8.1"] }
  ]
}
```
