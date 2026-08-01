import { describe, it, expect } from 'vitest';
import {
  getServiceIcon,
  isKnownService,
  getServiceCategory,
  getServiceEntry,
  getAllServiceTypes,
  GENERIC_NODE_STYLE,
  SERVICE_CATEGORIES,
} from './aws-service-registry';

describe('aws-service-registry', () => {
  describe('getServiceIcon', () => {
    it('returns the correct Draw.io style for a known service', () => {
      const style = getServiceIcon('lambda');
      expect(style).toBe('shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda');
    });

    it('returns the correct style for s3', () => {
      const style = getServiceIcon('s3');
      expect(style).toBe('shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3');
    });

    it('returns GENERIC_NODE_STYLE for unrecognized services', () => {
      const style = getServiceIcon('unknown-service');
      expect(style).toBe(GENERIC_NODE_STYLE);
    });

    it('returns GENERIC_NODE_STYLE for empty string', () => {
      expect(getServiceIcon('')).toBe(GENERIC_NODE_STYLE);
    });
  });

  describe('isKnownService', () => {
    it('returns true for a known service', () => {
      expect(isKnownService('ec2')).toBe(true);
      expect(isKnownService('dynamodb')).toBe(true);
      expect(isKnownService('vpc')).toBe(true);
    });

    it('returns false for an unknown service', () => {
      expect(isKnownService('not-a-service')).toBe(false);
      expect(isKnownService('')).toBe(false);
      expect(isKnownService('generic')).toBe(false);
    });
  });

  describe('getServiceCategory', () => {
    it('returns the correct category for compute services', () => {
      expect(getServiceCategory('ec2')).toBe('Compute');
      expect(getServiceCategory('lambda')).toBe('Compute');
    });

    it('returns the correct category for networking services', () => {
      expect(getServiceCategory('vpc')).toBe('Networking');
      expect(getServiceCategory('cloudfront')).toBe('Networking');
    });

    it('returns the correct category for database services', () => {
      expect(getServiceCategory('dynamodb')).toBe('Databases');
      expect(getServiceCategory('aurora')).toBe('Databases');
    });

    it('returns undefined for unknown services', () => {
      expect(getServiceCategory('unknown')).toBeUndefined();
    });
  });

  describe('getServiceEntry', () => {
    it('returns a full entry with all fields for known services', () => {
      const entry = getServiceEntry('sqs');
      expect(entry).toBeDefined();
      expect(entry!.type).toBe('sqs');
      expect(entry!.displayName).toBe('Amazon SQS');
      expect(entry!.category).toBe('Application Integration');
      expect(entry!.drawioStyle).toContain('mxgraph.aws4');
    });

    it('returns undefined for unknown services', () => {
      expect(getServiceEntry('not-real')).toBeUndefined();
    });
  });

  describe('getAllServiceTypes', () => {
    it('returns an array of all registered service types', () => {
      const types = getAllServiceTypes();
      expect(types.length).toBeGreaterThanOrEqual(80);
      expect(types).toContain('ec2');
      expect(types).toContain('lambda');
      expect(types).toContain('s3');
    });

    it('does not include the generic fallback type', () => {
      const types = getAllServiceTypes();
      expect(types).not.toContain('generic');
    });
  });

  describe('SERVICE_CATEGORIES', () => {
    it('contains all expected category keys', () => {
      const categories = Object.keys(SERVICE_CATEGORIES);
      expect(categories).toContain('Compute');
      expect(categories).toContain('Storage');
      expect(categories).toContain('Databases');
      expect(categories).toContain('Networking');
      expect(categories).toContain('Security');
      expect(categories).toContain('Application Integration');
      expect(categories).toContain('Analytics');
      expect(categories).toContain('AI/ML');
      expect(categories).toContain('Management');
      expect(categories).toContain('Developer Tools');
    });

    it('has consistent data between categories and registry', () => {
      for (const [category, services] of Object.entries(SERVICE_CATEGORIES)) {
        for (const service of services) {
          expect(getServiceCategory(service)).toBe(category);
        }
      }
    });
  });

  describe('GENERIC_NODE_STYLE', () => {
    it('is a valid Draw.io style string', () => {
      expect(GENERIC_NODE_STYLE).toContain('shape=mxgraph.aws4');
      expect(GENERIC_NODE_STYLE).toContain('resIcon=');
    });
  });
});
