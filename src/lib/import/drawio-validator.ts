/**
 * .drawio File Validator
 *
 * Validates uploaded files for well-formed XML and .drawio schema conformance.
 * Used by the Import Lambda handler to reject invalid uploads early.
 *
 * Validates: Requirements 15.3, 15.4, 15.5
 */

/** Maximum import file size: 10 MB (per Requirement 15.4, 15.5) */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

export type ValidationErrorType = 'SIZE_ERROR' | 'XML_PARSE_ERROR' | 'SCHEMA_ERROR';

export interface ValidationSuccess {
  valid: true;
}

export interface ValidationFailure {
  valid: false;
  errorType: ValidationErrorType;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validate file size does not exceed 10 MB.
 *
 * @param sizeInBytes - The file size to check
 * @returns Validation result
 */
export function validateFileSize(sizeInBytes: number): ValidationResult {
  if (sizeInBytes > MAX_IMPORT_FILE_SIZE) {
    return {
      valid: false,
      errorType: 'SIZE_ERROR',
      error: `File size exceeds the maximum allowed size of 10 MB. Your file is ${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }
  return { valid: true };
}

/**
 * Validate that content is well-formed XML.
 * Uses DOMParser to check for parse errors.
 *
 * @param content - The file content as a string
 * @returns Validation result
 */
export function validateXml(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      errorType: 'XML_PARSE_ERROR',
      error: 'The file is empty and cannot be parsed as XML.',
    };
  }

  // Quick check: does it look like XML at all?
  const trimmed = content.trim();
  if (!trimmed.startsWith('<')) {
    return {
      valid: false,
      errorType: 'XML_PARSE_ERROR',
      error: 'The file is not valid XML. XML files must begin with a tag or XML declaration.',
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // DOMParser signals errors via a <parsererror> element
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        valid: false,
        errorType: 'XML_PARSE_ERROR',
        error: 'The file is not valid XML. Please check the file for syntax errors.',
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      errorType: 'XML_PARSE_ERROR',
      error: 'The file could not be parsed as XML.',
    };
  }
}

/**
 * Validate that well-formed XML conforms to the .drawio schema.
 *
 * A valid .drawio file must contain:
 * - A root <mxfile> element
 * - At least one <diagram> child element inside <mxfile>
 * - An <mxGraphModel> element inside <diagram> (may be encoded/compressed)
 * - A <root> element inside <mxGraphModel>
 *
 * Note: Some .drawio files store compressed content inside <diagram>.
 * In those cases, we check for <mxfile> and <diagram> presence only.
 *
 * @param content - The well-formed XML content
 * @returns Validation result
 */
export function validateDrawioSchema(content: string): ValidationResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  // Check for root <mxfile> element
  const root = doc.documentElement;
  if (root.tagName !== 'mxfile') {
    return {
      valid: false,
      errorType: 'SCHEMA_ERROR',
      error: 'The file does not conform to the .drawio format. Missing required <mxfile> root element.',
    };
  }

  // Check for at least one <diagram> element
  const diagrams = root.getElementsByTagName('diagram');
  if (diagrams.length === 0) {
    return {
      valid: false,
      errorType: 'SCHEMA_ERROR',
      error: 'The file does not conform to the .drawio format. Missing required <diagram> element inside <mxfile>.',
    };
  }

  // Check for <mxGraphModel> inside <diagram>
  // Note: diagram content can be stored as:
  //   1. Inline XML: <diagram><mxGraphModel>...</mxGraphModel></diagram>
  //   2. Compressed/encoded text content inside <diagram>
  const firstDiagram = diagrams[0];
  const mxGraphModels = firstDiagram.getElementsByTagName('mxGraphModel');

  if (mxGraphModels.length > 0) {
    // Inline XML mode: verify <root> exists inside <mxGraphModel>
    const mxGraphModel = mxGraphModels[0];
    const roots = mxGraphModel.getElementsByTagName('root');
    if (roots.length === 0) {
      return {
        valid: false,
        errorType: 'SCHEMA_ERROR',
        error: 'The file does not conform to the .drawio format. Missing required <root> element inside <mxGraphModel>.',
      };
    }
  } else {
    // Compressed/encoded mode: <diagram> should have text content
    const textContent = firstDiagram.textContent?.trim();
    if (!textContent || textContent.length === 0) {
      return {
        valid: false,
        errorType: 'SCHEMA_ERROR',
        error: 'The file does not conform to the .drawio format. The <diagram> element has no content (expected <mxGraphModel> or encoded diagram data).',
      };
    }
    // If there's text content, it's likely compressed/encoded which is valid
  }

  return { valid: true };
}

/**
 * Full validation pipeline for .drawio file import.
 * Checks in order: size → XML well-formedness → .drawio schema.
 *
 * @param content - The file content as a string
 * @param sizeInBytes - The file size in bytes (optional, defaults to content byte length)
 * @returns Validation result
 */
export function validateDrawioFile(
  content: string,
  sizeInBytes?: number
): ValidationResult {
  // Step 1: Check file size
  const size = sizeInBytes ?? new TextEncoder().encode(content).length;
  const sizeResult = validateFileSize(size);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // Step 2: Check well-formed XML
  const xmlResult = validateXml(content);
  if (!xmlResult.valid) {
    return xmlResult;
  }

  // Step 3: Check .drawio schema conformance
  const schemaResult = validateDrawioSchema(content);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  return { valid: true };
}
