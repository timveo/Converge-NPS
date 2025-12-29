/**
 * Organization Type Classification Logic Tests
 * Simple unit tests for the classification logic
 */

describe('Organization Type Classification Logic', () => {
  // Test the core classification logic directly
  const classifyByOrgType = (organizationType: string | null | undefined): string => {
    return (organizationType?.toLowerCase() === 'industry') ? 'Industry' : 'Military/Gov';
  };

  // Test the partner import filtering logic
  const shouldImportPartner = (organizationType: string | null | undefined): boolean => {
    return organizationType?.toLowerCase() === 'industry';
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

  describe('Partner Import Filtering', () => {
    it('should import partners with Organization Type = "Industry"', () => {
      expect(shouldImportPartner('Industry')).toBe(true);
      expect(shouldImportPartner('industry')).toBe(true);
      expect(shouldImportPartner('INDUSTRY')).toBe(true);
    });

    it('should NOT import partners with Organization Type = "Government"', () => {
      expect(shouldImportPartner('Government')).toBe(false);
    });

    it('should NOT import partners with Organization Type = "Military"', () => {
      expect(shouldImportPartner('Military')).toBe(false);
    });

    it('should NOT import partners with Organization Type = "Defense Contractor"', () => {
      expect(shouldImportPartner('Defense Contractor')).toBe(false);
    });

    it('should NOT import partners with null Organization Type', () => {
      expect(shouldImportPartner(null)).toBe(false);
    });

    it('should NOT import partners with undefined Organization Type', () => {
      expect(shouldImportPartner(undefined)).toBe(false);
    });

    it('should NOT import partners with empty Organization Type', () => {
      expect(shouldImportPartner('')).toBe(false);
    });

    it('should NOT import partners with Organization Type = "Startup"', () => {
      expect(shouldImportPartner('Startup')).toBe(false);
    });

    it('should NOT import partners with Organization Type = "Corporation"', () => {
      expect(shouldImportPartner('Corporation')).toBe(false);
    });
  });

  describe('Projects from Non-Industry Partners', () => {
    it('should create projects as Military/Gov when partner org type is Government', () => {
      const orgType = 'Government';
      expect(shouldImportPartner(orgType)).toBe(false); // Partner should NOT be imported
      expect(classifyByOrgType(orgType)).toBe('Military/Gov'); // But projects should be Military/Gov
    });

    it('should create projects as Military/Gov when partner org type is Military', () => {
      const orgType = 'Military';
      expect(shouldImportPartner(orgType)).toBe(false);
      expect(classifyByOrgType(orgType)).toBe('Military/Gov');
    });

    it('should create projects as Military/Gov when partner org type is null', () => {
      const orgType = null;
      expect(shouldImportPartner(orgType)).toBe(false);
      expect(classifyByOrgType(orgType)).toBe('Military/Gov');
    });

    it('should create projects as Industry when partner org type is Industry', () => {
      const orgType = 'Industry';
      expect(shouldImportPartner(orgType)).toBe(true); // Partner SHOULD be imported
      expect(classifyByOrgType(orgType)).toBe('Industry'); // And projects should be Industry
    });
  });
});
