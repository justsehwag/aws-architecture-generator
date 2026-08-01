/**
 * IaC generation module.
 *
 * Re-exports the public API for generating Infrastructure as Code
 * from architecture specifications.
 */

export {
  generateIaC,
  isSupportedIaCFormat,
  ResourceLimitError,
  MAX_RESOURCE_NODES,
  SUPPORTED_IAC_FORMATS,
  type IaCFormat,
} from './iac-generator';

export { generateTerraform } from './terraform-generator';
export { generateCdk } from './cdk-generator';
export { generateCloudFormation } from './cloudformation-generator';
