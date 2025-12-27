/**
 * Smartsheet Service Unit Tests - Organization Type Classification
 * Tests for the organization type-based project classification logic
 */

import { importPartners } from '../../src/services/smartsheet.service';
import prisma from '../../src/config/database';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

      (prisma.partner.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.partner.create as jest.Mock).mockResolvedValue({
        id: 'partner-1',
        name: 'Tech Corp',
        organizationType: 'Industry',
        researchAreas: [],
        seeking: [],
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'project-1' });

      await importPartners();

      // Verify project was created with Industry classification
      expect(prisma.project.create).toHaveBeenCalledWith({
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

      (prisma.partner.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.partner.create as jest.Mock).mockResolvedValue({
        id: 'partner-2',
        name: 'Innovation Labs',
        organizationType: 'industry',
        researchAreas: [],
        seeking: [],
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'project-2' });

      await importPartners();

      expect(prisma.project.create).toHaveBeenCalledWith({
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

      (prisma.partner.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.partner.create as jest.Mock).mockResolvedValue({
        id: 'partner-3',
        name: 'Defense Agency',
        organizationType: 'Government',
        researchAreas: [],
        seeking: [],
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'project-3' });

      await importPartners();

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Defense Project',
          classification: 'Military/Gov',
          department: 'Defense Agency',
        }),
      });
    });

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

      (prisma.partner.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.partner.create as jest.Mock).mockResolvedValue({
        id: 'partner-4',
        name: 'Unknown Corp',
        organizationType: null,
        researchAreas: [],
        seeking: [],
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'project-4' });

      await importPartners();

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
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

      (prisma.partner.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.partner.create as jest.Mock).mockResolvedValue({
        id: 'partner-5',
        name: 'Query Test Corp',
        organizationType: 'Industry',
        researchAreas: [],
        seeking: [],
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'project-5' });

      await importPartners();

      // Verify the findFirst query uses the correct classification
      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          title: 'Query Test Project',
          classification: 'Industry',
          department: 'Query Test Corp',
        },
      });
    });
  });
});
