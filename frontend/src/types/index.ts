// User & Auth Types
export type UserRole = 'student' | 'faculty' | 'industry' | 'staff' | 'admin';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  organization: string;
  department?: string | null;
  role: string;
  bio?: string | null;
  avatarUrl?: string | null;
  accelerationInterests: string[];
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  privacy: PrivacySettings;
  onboardingCompleted: boolean;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  allowQrScanning: boolean;
  allowMessaging: boolean;
  hideContactInfo: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  organization: string;
  role: UserRole;
}

// Connection Types
export type CollaborativeIntent =
  | 'research'
  | 'brainstorming'
  | 'design_sprint'
  | 'hackathon'
  | 'funding'
  | 'internship_job';

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  connectedUser: User;
  intents: CollaborativeIntent[];
  notes?: string | null;
  scannedAt: string;
  method: 'qr_scan' | 'manual_entry';
  createdAt: string;
  updatedAt: string;
}

// Session & Schedule Types
export type SessionType =
  | 'keynote'
  | 'panel'
  | 'workshop'
  | 'demo'
  | 'networking'
  | 'presentation';

export type RsvpStatus = 'attending' | 'interested' | 'cancelled';

export interface Session {
  id: string;
  title: string;
  description: string;
  sessionType: SessionType;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  currentAttendees: number;
  waitlistCount: number;
  speakers: string[];
  tags: string[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Rsvp {
  id: string;
  userId: string;
  sessionId: string;
  session: Session;
  status: RsvpStatus;
  isWaitlisted: boolean;
  rsvpAt: string;
  createdAt: string;
  updatedAt: string;
}

// Messaging Types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: MessageStatus;
  readAt?: string | null;
  sentAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  otherUser: User;
  lastMessage?: Message | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Research & Opportunities Types
export type ProjectStage =
  | 'concept'
  | 'proposal'
  | 'active'
  | 'completed'
  | 'published';

export type Classification = 'unclassified' | 'cui' | 'classified';

export interface ResearchProject {
  id: string;
  title: string;
  description: string;
  principalInvestigator: string;
  department: string;
  stage: ProjectStage;
  classification: Classification;
  researchAreas: string[];
  seeking: string[];
  keywords: string[];
  studentsInvolved?: string[] | null;
  fundingSources?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  opportunityType: 'internship' | 'job' | 'funding' | 'partnership' | 'research';
  sponsor: string;
  benefits: string[];
  requirements: string[];
  dodAlignment: boolean;
  deadline?: string | null;
  contactEmail: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Industry Partners Types
export interface IndustryPartner {
  id: string;
  organizationName: string;
  description: string;
  organizationType: string;
  techFocus: string[];
  collaborationTypes: string[];
  dodSponsors?: string[] | null;
  boothLocation?: string | null;
  websiteUrl?: string | null;
  teamMembers: string[];
  logoUrl?: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Offline Queue Types
export type OperationType =
  | 'qr_scan'
  | 'message'
  | 'rsvp'
  | 'connection_note';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface OfflineQueueItem {
  id: string;
  userId: string;
  operationType: OperationType;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: QueueStatus;
}

// Feature Flags Types
export interface FeatureConfig {
  enabled: boolean;
  requiresCamera?: boolean;
  devices: DeviceType[];
  roles?: UserRole[];
  optimizedFor?: 'mobile' | 'desktop' | 'both';
}

export interface FeatureFlags {
  qrScanner: FeatureConfig;
  manualCodeEntry: FeatureConfig;
  adminDashboard: FeatureConfig;
  staffCheckin: FeatureConfig;
  messaging: FeatureConfig;
  timelineView: FeatureConfig;
  connectionsList: FeatureConfig;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  field?: string;
}
