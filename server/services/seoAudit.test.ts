import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getIssuesByType, 
  getIssuesBySeverity, 
  getIssuesByEntityType,
  SeoIssue
} from './seoAudit.service';

// Mock issues for testing
const mockIssues: SeoIssue[] = [
  {
    id: 'missing_meta_title_article_1',
    type: 'missing_meta_title',
    severity: 'critical',
    entityType: 'article',
    entityId: 1,
    entityTitle: 'Test Article 1',
    entitySlug: 'test-article-1',
    field: 'seoTitle',
    currentValue: undefined,
    recommendation: 'Add a unique, descriptive SEO title',
    autoFixAvailable: true
  },
  {
    id: 'missing_meta_description_article_2',
    type: 'missing_meta_description',
    severity: 'critical',
    entityType: 'article',
    entityId: 2,
    entityTitle: 'Test Article 2',
    entitySlug: 'test-article-2',
    field: 'seoDescription',
    currentValue: undefined,
    recommendation: 'Add a compelling meta description',
    autoFixAvailable: true
  },
  {
    id: 'short_meta_description_article_3',
    type: 'short_meta_description',
    severity: 'warning',
    entityType: 'article',
    entityId: 3,
    entityTitle: 'Test Article 3',
    entitySlug: 'test-article-3',
    field: 'seoDescription',
    currentValue: 'Short desc',
    recommendation: 'Meta description is too short',
    autoFixAvailable: true
  },
  {
    id: 'missing_alt_text_media_1',
    type: 'missing_alt_text',
    severity: 'warning',
    entityType: 'media',
    entityId: 1,
    entityTitle: 'image.jpg',
    field: 'altText',
    currentValue: undefined,
    recommendation: 'Add descriptive alt text',
    autoFixAvailable: true
  },
  {
    id: 'low_word_count_article_4',
    type: 'low_word_count',
    severity: 'info',
    entityType: 'article',
    entityId: 4,
    entityTitle: 'Test Article 4',
    entitySlug: 'test-article-4',
    field: 'content',
    currentValue: '150 words',
    recommendation: 'Consider adding more content',
    autoFixAvailable: false
  },
  {
    id: 'missing_featured_image_person_1',
    type: 'missing_featured_image',
    severity: 'warning',
    entityType: 'person',
    entityId: 1,
    entityTitle: 'John Doe',
    entitySlug: 'john-doe',
    field: 'avatar',
    currentValue: undefined,
    recommendation: 'Add a profile image',
    autoFixAvailable: false
  }
];

describe('SEO Audit Service', () => {
  describe('getIssuesByType', () => {
    it('should group issues by their type', () => {
      const grouped = getIssuesByType(mockIssues);
      
      expect(grouped.missing_meta_title).toHaveLength(1);
      expect(grouped.missing_meta_description).toHaveLength(1);
      expect(grouped.short_meta_description).toHaveLength(1);
      expect(grouped.missing_alt_text).toHaveLength(1);
      expect(grouped.low_word_count).toHaveLength(1);
      expect(grouped.missing_featured_image).toHaveLength(1);
    });

    it('should return empty object for empty issues array', () => {
      const grouped = getIssuesByType([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('getIssuesBySeverity', () => {
    it('should group issues by severity level', () => {
      const grouped = getIssuesBySeverity(mockIssues);
      
      expect(grouped.critical).toHaveLength(2);
      expect(grouped.warning).toHaveLength(3);
      expect(grouped.info).toHaveLength(1);
    });

    it('should return empty arrays for empty issues', () => {
      const grouped = getIssuesBySeverity([]);
      
      expect(grouped.critical).toHaveLength(0);
      expect(grouped.warning).toHaveLength(0);
      expect(grouped.info).toHaveLength(0);
    });

    it('should correctly identify critical issues', () => {
      const grouped = getIssuesBySeverity(mockIssues);
      
      grouped.critical.forEach(issue => {
        expect(issue.severity).toBe('critical');
      });
    });
  });

  describe('getIssuesByEntityType', () => {
    it('should group issues by entity type', () => {
      const grouped = getIssuesByEntityType(mockIssues);
      
      expect(grouped.article).toHaveLength(4);
      expect(grouped.media).toHaveLength(1);
      expect(grouped.person).toHaveLength(1);
    });

    it('should return empty object for empty issues array', () => {
      const grouped = getIssuesByEntityType([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('Issue structure', () => {
    it('should have all required fields in each issue', () => {
      mockIssues.forEach(issue => {
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('entityType');
        expect(issue).toHaveProperty('entityId');
        expect(issue).toHaveProperty('entityTitle');
        expect(issue).toHaveProperty('field');
        expect(issue).toHaveProperty('recommendation');
        expect(issue).toHaveProperty('autoFixAvailable');
      });
    });

    it('should have valid severity values', () => {
      const validSeverities = ['critical', 'warning', 'info'];
      mockIssues.forEach(issue => {
        expect(validSeverities).toContain(issue.severity);
      });
    });

    it('should have valid entity types', () => {
      const validEntityTypes = ['article', 'person', 'company', 'investor', 'event', 'job', 'accelerator', 'media'];
      mockIssues.forEach(issue => {
        expect(validEntityTypes).toContain(issue.entityType);
      });
    });
  });

  describe('Auto-fix availability', () => {
    it('should correctly identify auto-fixable issues', () => {
      const autoFixable = mockIssues.filter(i => i.autoFixAvailable);
      expect(autoFixable).toHaveLength(4);
    });

    it('should correctly identify non-auto-fixable issues', () => {
      const notAutoFixable = mockIssues.filter(i => !i.autoFixAvailable);
      expect(notAutoFixable).toHaveLength(2);
    });
  });
});
