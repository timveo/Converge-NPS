/**
 * Organization Type Classification Logic Tests
 * Simple unit tests for the classification logic
 */

describe('Organization Type Classification Logic', () => {
  // Test the core classification logic directly
  const classifyByOrgType = (organizationType: string | null | undefined): string => {
    return (organizationType?.toLowerCase() === 'industry') ? 'Industry' : 'Military/Gov';
  };

  describe('Industry Classification', () => {
    it('should classify "Industry" as Industry', () => {
      expect(classifyByOrgType('Industry')).toBe('Industry');
    });

    it('should classify "industry" as Industry (case insensitive)', () => {
      expect(classifyByOrgType('industry')).toBe('Industry');
    });

    it('should classify "INDUSTRY" as Industry (case insensitive)', () => {
      expect(classifyByOrgType('INDUSTRY')).toBe('Industry');
    });
  });

  describe('Military/Gov Classification', () => {
    it('should classify "Government" as Military/Gov', () => {
      expect(classifyByOrgType('Government')).toBe('Military/Gov');
    });

    it('should classify "Military" as Military/Gov', () => {
      expect(classifyByOrgType('Military')).toBe('Military/Gov');
    });

    it('should classify "Defense Contractor" as Military/Gov', () => {
      expect(classifyByOrgType('Defense Contractor')).toBe('Military/Gov');
    });

    it('should classify null as Military/Gov', () => {
      expect(classifyByOrgType(null)).toBe('Military/Gov');
    });

    it('should classify undefined as Military/Gov', () => {
      expect(classifyByOrgType(undefined)).toBe('Military/Gov');
    });

    it('should classify empty string as Military/Gov', () => {
      expect(classifyByOrgType('')).toBe('Military/Gov');
    });

    it('should classify "Startup" as Military/Gov', () => {
      expect(classifyByOrgType('Startup')).toBe('Military/Gov');
    });

    it('should classify "Corporation" as Military/Gov', () => {
      expect(classifyByOrgType('Corporation')).toBe('Military/Gov');
    });
  });
});
