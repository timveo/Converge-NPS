/**
 * Zod Validation Schemas
 *
 * All request/response validation schemas using Zod
 * Enforces type safety and validates user input
 */

import { z } from 'zod';

// ===========================
// Authentication Schemas
// ===========================

export const RegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  organization: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  participantType: z.enum(['student', 'faculty', 'industry', 'alumni', 'guest']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export const VerifyEmailSchema = z.object({
  token: z.string(),
});

export const TwoFactorSendSchema = z.object({
  userId: z.string().uuid(),
});

export const TwoFactorVerifySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// ===========================
// Profile Schemas
// ===========================

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  rank: z.string().max(50).optional().nullable(),
  organization: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  accelerationInterests: z.array(z.string()).optional(),
  linkedinUrl: z.string().max(200).url().optional().nullable(),
  websiteUrl: z.string().max(200).url().optional().nullable(),
});

export const UpdatePrivacySchema = z.object({
  profileVisibility: z.enum(['public', 'private']).optional(),
  allowQrScanning: z.boolean().optional(),
  allowMessaging: z.boolean().optional(),
  hideContactInfo: z.boolean().optional(),
});

export const UpdateOnboardingSchema = z.object({
  onboardingStep: z.number().int().min(0),
  onboardingCompleted: z.boolean().optional(),
});

// ===========================
// Connection Schemas
// ===========================

export const CreateConnectionSchema = z.object({
  connectedUserId: z.string().uuid(),
  collaborativeIntents: z.array(z.string()).max(10),
  notes: z.string().max(1000).optional().nullable(),
  connectionMethod: z.enum(['qr_scan', 'manual_entry']),
});

 export const ManualCodeLookupSchema = z.object({
   code: z.string().trim().min(4).max(36),
 });

export const UpdateConnectionSchema = z.object({
  collaborativeIntents: z.array(z.string()).max(10).optional(),
  notes: z.string().max(1000).optional().nullable(),
  followUpReminder: z.string().datetime().optional().nullable(),
});

export const QRScanSchema = z.object({
  qrCodeData: z.string(), // UUID or encoded data
  collaborativeIntents: z.array(z.string()).max(10),
  notes: z.string().max(1000).optional(),
});

// ===========================
// Session Schemas
// ===========================

export const CreateRsvpSchema = z.object({
  sessionId: z.string().uuid(),
});

export const UpdateRsvpSchema = z.object({
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']),
});

// ===========================
// Project Schemas
// ===========================

export const CreateProjectSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  piRole: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  stage: z.enum(['concept', 'prototype', 'pilot-ready', 'deployed']),
  classification: z.string().default('Unclassified'),
  researchAreas: z.array(z.string()),
  keywords: z.array(z.string()),
  students: z.array(z.string()).optional(),
  seeking: z.array(z.string()).optional(),
  demoSchedule: z.string().max(200).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ProjectInterestSchema = z.object({
  message: z.string().max(500).optional(),
});

// ===========================
// Opportunity Schemas
// ===========================

export const CreateOpportunitySchema = z.object({
  type: z.enum(['funding', 'internship', 'competition']),
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
  sponsorOrganization: z.string().max(200).optional(),
  sponsorContactId: z.string().uuid().optional(),
  requirements: z.string().max(1000).optional(),
  benefits: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  duration: z.string().max(100).optional(),
  deadline: z.string().datetime().optional(),
  dodAlignment: z.array(z.string()).max(10).optional(),
  featured: z.boolean().default(false),
});

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial().extend({
  status: z.enum(['active', 'closed', 'draft']).optional(),
});

export const OpportunityInterestSchema = z.object({
  message: z.string().max(500).optional(),
});

// ===========================
// Industry Partner Schemas
// ===========================

export const CreateIndustryPartnerSchema = z.object({
  companyName: z.string().max(200),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().max(200).url().optional(),
  websiteUrl: z.string().max(200).url().optional(),
  organizationType: z.string().optional(),
  primaryContactName: z.string().max(100).optional(),
  primaryContactTitle: z.string().max(100).optional(),
  primaryContactEmail: z.string().email().max(255).optional(),
  primaryContactPhone: z.string().max(20).optional(),
  technologyFocusAreas: z.array(z.string()),
  seekingCollaboration: z.array(z.string()).optional(),
  dodSponsors: z.string().max(500).optional(),
  boothLocation: z.string().max(100).optional(),
  teamMembers: z.any().optional(), // JSONB
  hideContactInfo: z.boolean().default(false),
});

export const UpdateIndustryPartnerSchema = CreateIndustryPartnerSchema.partial();

// ===========================
// Message Schemas
// ===========================

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(), // Optional for first message
  recipientId: z.string().uuid(), // Required for first message
  content: z.string().min(1).max(1000),
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// ===========================
// Admin Schemas
// ===========================

export const UpdateUserRolesSchema = z.object({
  roles: z.array(z.enum(['staff', 'admin'])),
});

export const SmartsheetSyncSchema = z.object({
  sheetName: z.enum([
    'industry_partners',
    'research_projects',
    'sessions',
    'registrations',
    'connections'
  ]),
  direction: z.enum(['download', 'upload']),
});

// ===========================
// Walk-In Registration Schema
// ===========================

export const WalkInRegistrationSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().max(255),
  organization: z.string().min(1).max(200),
  participantType: z.enum(['student', 'faculty', 'industry', 'alumni', 'guest']),
});

// ===========================
// Query Parameter Schemas
// ===========================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ConnectionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  intent: z.string().optional(),
  sortBy: z.enum(['createdAt', 'fullName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const SessionsQuerySchema = PaginationSchema.extend({
  day: z.string().optional(), // ISO date string
  timeSlot: z.string().optional(),
  type: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const ProjectsQuerySchema = PaginationSchema.extend({
  department: z.string().optional(),
  stage: z.enum(['concept', 'prototype', 'pilot-ready', 'deployed']).optional(),
  classification: z.string().optional(),
  researchArea: z.string().optional(),
  seeking: z.string().optional(),
  search: z.string().optional(),
});

export const OpportunitiesQuerySchema = PaginationSchema.extend({
  type: z.enum(['funding', 'internship', 'competition']).optional(),
  status: z.enum(['active', 'closed', 'draft']).default('active'),
  featured: z.coerce.boolean().optional(),
  dodAlignment: z.string().optional(),
  search: z.string().optional(),
});

export const IndustryPartnersQuerySchema = PaginationSchema.extend({
  organizationType: z.string().optional(),
  technologyFocus: z.string().optional(),
  seekingCollaboration: z.string().optional(),
  search: z.string().optional(),
});

// ===========================
// Type Exports
// ===========================

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof UpdatePrivacySchema>;
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof UpdateConnectionSchema>;
export type QRScanInput = z.infer<typeof QRScanSchema>;
export type CreateRsvpInput = z.infer<typeof CreateRsvpSchema>;
export type UpdateRsvpInput = z.infer<typeof UpdateRsvpSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type ConnectionsQuery = z.infer<typeof ConnectionsQuerySchema>;
export type SessionsQuery = z.infer<typeof SessionsQuerySchema>;
export type ProjectsQuery = z.infer<typeof ProjectsQuerySchema>;
