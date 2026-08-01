/**
 * IaC Generator dispatcher.
 *
 * Central entry point for generating Infrastructure as Code from an ArchitectureSpec.
 * Validates resource count (max 50), dispatches to format-specific generators,
 * and collates results.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import type { ArchitectureSpec } from '@/types/architecture';
import type { IaCResponse } from '@/types/version';
import { generateTerraform } from './terraform-generator';
import { generateCdk } from './cdk-generator';
import { generateCloudFormation } from './cloudformation-generator';

/**
 * Supported IaC output formats.
 */
export type IaCFormat = 'terraform' | 'cdk-typescript' | 'cloudformation';

/**
 * Maximum number of resource nodes supported for IaC generation.
 * Requirement 14.6: Reject architectures with more than 50 resource nodes.
 */
export const MAX_RESOURCE_NODES = 50;

/**
 * All supported IaC formats.
 */
export const SUPPORTED_IAC_FORMATS: IaCFormat[] = ['terraform', 'cdk-typescript', 'cloudformation'];

/**
 * Check if a string is a valid IaC format.
 */
export function isSupportedIaCFormat(format: string): format is IaCFormat {
  return SUPPORTED_IAC_FORMATS.includes(format as IaCFormat);
}

/**
 * Error thrown when an architecture exceeds the supported resource limit.
 */
export class ResourceLimitError extends Error {
  constructor(resourceCount: number) {
    super(
      `Architecture contains ${resourceCount} resource nodes, which exceeds the maximum supported limit of ${MAX_RESOURCE_NODES}. ` +
      `Please simplify the architecture or split it into smaller diagrams.`
    );
    this.name = 'ResourceLimitError';
  }
}

/**
 * Generate Infrastructure as Code from an ArchitectureSpec.
 *
 * @param spec - The architecture specification from the diagram
 * @param format - The desired IaC format ('terraform' | 'cdk-typescript' | 'cloudformation')
 * @returns IaCResponse with generated code, warnings, and resource count
 * @throws ResourceLimitError if the architecture has more than 50 resource nodes
 */
export function generateIaC(spec: ArchitectureSpec, format: IaCFormat): IaCResponse {
  // Validate resource count (Requirement 14.6)
  const resourceCount = spec.services.length;
  if (resourceCount > MAX_RESOURCE_NODES) {
    throw new ResourceLimitError(resourceCount);
  }

  // Dispatch to format-specific generator
  let result: { code: string; warnings: string[]; resourceCount: number };

  switch (format) {
    case 'terraform':
      result = generateTerraform(spec);
      break;
    case 'cdk-typescript':
      result = generateCdk(spec);
      break;
    case 'cloudformation':
      result = generateCloudFormation(spec);
      break;
    default: {
      // Exhaustive check
      const _exhaustive: never = format;
      throw new Error(`Unsupported IaC format: ${_exhaustive}`);
    }
  }

  return {
    code: result.code,
    format,
    warnings: result.warnings,
    resourceCount: result.resourceCount,
  };
}
