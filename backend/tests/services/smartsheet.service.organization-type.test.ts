/**
 * Smartsheet Service Unit Tests - Organization Type Classification
 * Tests for the organization type-based project classification logic
 */

import prisma from '../../src/config/database';
import { importPartners } from '../../src/services/smartsheet.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  partner: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
}));

const mockPrisma = {
  partner: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
} as any;

// Mock environment variables
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    SMARTSHEET_API_KEY: 'test-api-key',
    SMARTSHEET_PARTNERS_SHEET_ID: 'test-partners-sheet-id',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Smartsheet Service - Organization Type Classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSheetResponse = {
    data: {
      id: 'test-sheet-id',
      name: 'Test Partners Sheet',
      columns: [
        { id: 1, title: 'Company Name', type: 'TEXT_NUMBER' },
        { id: 2, title: 'Organization Type', type: 'TEXT_NUMBER' },
        { id: 3, title: 'Description', type: 'TEXT_NUMBER' },
        { id: 4, title: 'Project 1 - Title', type: 'TEXT_NUMBER' },
        { id: 5, title: 'Project 1 - Description', type: 'TEXT_NUMBER' },
        { id: 6, title: 'Project 1 - Stage', type: 'TEXT_NUMBER' },
      ],
      rows: [],
    },
  };

  describe('Industry Organization Type', () => {
    it('should classify projects as Industry when organization type is "Industry"', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Tech Corp' },
            { columnId: 2, value: 'Industry' },
            { columnId: 3, value: 'A tech company' },
            { columnId: 4, value: 'AI Project' },
            { columnId: 5, value: 'AI research project' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-1',
        name: 'Tech Corp',
        organizationType: 'Industry',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-1' } as any);

      await importPartners();

      // Verify project was created with Industry classification
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'AI Project',
          classification: 'Industry',
          department: 'Tech Corp',
        }),
      });
    });

    it('should classify projects as Industry when organization type is "industry" (case insensitive)', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Innovation Labs' },
            { columnId: 2, value: 'industry' },
            { columnId: 3, value: 'Innovation company' },
            { columnId: 4, value: 'Quantum Project' },
            { columnId: 5, value: 'Quantum computing research' },
            { columnId: 6, value: 'Prototype' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-2',
        name: 'Innovation Labs',
        organizationType: 'industry',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-2' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          classification: 'Industry',
        }),
      });
    });
  });

  describe('Non-Industry Organization Types', () => {
    it('should classify projects as Military/Gov when organization type is "Government"', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Defense Agency' },
            { columnId: 2, value: 'Government' },
            { columnId: 3, value: 'Government defense agency' },
            { columnId: 4, value: 'Defense Project' },
            { columnId: 5, value: 'Defense research project' },
            { columnId: 6, value: 'Pilot Ready' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-3',
        name: 'Defense Agency',
        organizationType: 'Government',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-3' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Defense Project',
          classification: 'Military/Gov',
          department: 'Defense Agency',
        }),
      });
    });

    it('should classify projects as Military/Gov when organization type is "Military"', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Army Research Lab' },
            { columnId: 2, value: 'Military' },
            { columnId: 3, value: 'Military research lab' },
            { columnId: 4, value: 'Tactical Project' },
            { columnId: 5, value: 'Tactical systems project' },
            { columnId: 6, value: 'Deployed' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-4',
        name: 'Army Research Lab',
        organizationType: 'Military',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-4' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          classification: 'Military/Gov',
        }),
      });
    });

    it('should classify projects as Military/Gov when organization type is "Defense Contractor"', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Defense Systems Inc' },
            { columnId: 2, value: 'Defense Contractor' },
            { columnId: 3, value: 'Defense contracting company' },
            { columnId: 4, value: 'Weapons System' },
            { columnId: 5, value: 'Advanced weapons system' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-5',
        name: 'Defense Systems Inc',
        organizationType: 'Defense Contractor',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-5' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          classification: 'Military/Gov',
        }),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should classify projects as Military/Gov when organization type is null', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Unknown Corp' },
            { columnId: 2, value: null },
            { columnId: 3, value: 'Unknown company type' },
            { columnId: 4, value: 'Mystery Project' },
            { columnId: 5, value: 'Project with unknown org type' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-6',
        name: 'Unknown Corp',
        organizationType: null,
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-6' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          classification: 'Military/Gov',
        }),
      });
    });

    it('should classify projects as Military/Gov when organization type is empty string', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Empty Type Corp' },
            { columnId: 2, value: '' },
            { columnId: 3, value: 'Company with empty org type' },
            { columnId: 4, value: 'Empty Type Project' },
            { columnId: 5, value: 'Project with empty org type' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-7',
        name: 'Empty Type Corp',
        organizationType: '',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-7' } as any);

      await importPartners();

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          classification: 'Military/Gov',
        }),
      });
    });
  });

  describe('Project Updates', () => {
    it('should update existing project with correct classification based on organization type', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Updated Corp' },
            { columnId: 2, value: 'Industry' },
            { columnId: 3, value: 'Updated company' },
            { columnId: 4, value: 'Existing Project' },
            { columnId: 5, value: 'Updated project description' },
            { columnId: 6, value: 'Prototype' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-8',
        name: 'Updated Corp',
        organizationType: 'Industry',
        researchAreas: [],
        seeking: [],
      } as any);

      // Mock existing project
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'existing-project-1',
        title: 'Existing Project',
      } as any);

      mockPrisma.project.update.mockResolvedValue({ id: 'existing-project-1' } as any);

      await importPartners();

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'existing-project-1' },
        data: expect.objectContaining({
          title: 'Existing Project',
          classification: 'Industry',
          department: 'Updated Corp',
        }),
      });
    });

    it('should handle multiple projects from the same partner with correct classifications', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Multi Project Corp' },
            { columnId: 2, value: 'Government' },
            { columnId: 3, value: 'Government contractor' },
            { columnId: 4, value: 'Project Alpha' },
            { columnId: 5, value: 'First government project' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      // Add columns for Project 2
      const extendedColumns = [
        ...mockSheetResponse.data.columns,
        { id: 7, title: 'Project 2 - Title', type: 'TEXT_NUMBER' },
        { id: 8, title: 'Project 2 - Description', type: 'TEXT_NUMBER' },
        { id: 9, title: 'Project 2 - Stage', type: 'TEXT_NUMBER' },
      ];

      // Add Project 2 data to the row
      mockRows[0].cells.push(
        { columnId: 7, value: 'Project Beta' },
        { columnId: 8, value: 'Second government project' },
        { columnId: 9, value: 'Pilot Ready' }
      );

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { 
          ...mockSheetResponse.data, 
          columns: extendedColumns,
          rows: mockRows 
        },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-9',
        name: 'Multi Project Corp',
        organizationType: 'Government',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-alpha' } as any);

      await importPartners();

      // Should create both projects with Military/Gov classification
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Project Alpha',
          classification: 'Military/Gov',
        }),
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Project Beta',
          classification: 'Military/Gov',
        }),
      });
    });
  });

  describe('Database Query Validation', () => {
    it('should query for existing projects using the correct classification', async () => {
      const mockRows = [
        {
          id: 1,
          rowNumber: 1,
          cells: [
            { columnId: 1, value: 'Query Test Corp' },
            { columnId: 2, value: 'Industry' },
            { columnId: 3, value: 'Test company for query validation' },
            { columnId: 4, value: 'Query Test Project' },
            { columnId: 5, value: 'Project for testing database queries' },
            { columnId: 6, value: 'Concept' },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        ...mockSheetResponse,
        data: { ...mockSheetResponse.data, rows: mockRows },
      });

      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-10',
        name: 'Query Test Corp',
        organizationType: 'Industry',
        researchAreas: [],
        seeking: [],
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'project-10' } as any);

      await importPartners();

      // Verify the findFirst query uses the correct classification
      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          title: 'Query Test Project',
          classification: 'Industry',
          department: 'Query Test Corp',
        },
      });
    });
  });
});
