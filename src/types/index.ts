export type UserRole = 'user' | 'moderator' | 'admin';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type DisasterStatus = 'active' | 'resolved' | 'archived';
export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  profilePicture: string | null;
  country: string;
  city: string;
  region: string;
  language: string;
  warCrimesAccess: boolean;
  totalDonatedEUR: number;
  followersCount: number;
  followingCount: number;
  volunteerEventsCount: number;
  createdAt: Date;
  lastLogin: Date;
}

export interface Disaster {
  disasterId: string;
  title: string;
  type: string;
  subtype: string;
  status: DisasterStatus;
  severity: DisasterSeverity;
  country: string;
  region: string;
  affectedArea: string;
  affectedPopulation: number;
  startDate: Date;
  endDate: Date | null;
  isWarRelated: boolean;
  verifiedByAdmin: boolean;
  totalDonationsEUR: number;
  totalDonorsCount: number;
  totalVolunteersRegistered: number;
  totalVolunteersActive: number;
  postsCount: number;
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface Post {
  postId: string;
  disasterId: string;
  authorId: string;
  authorType: 'user' | 'organization' | 'government' | 'press';
  title: string;
  content: string;
  contentType: string;
  urgencyLevel: string;
  isActive: boolean;
  isAdminVerified: boolean;
  isPinned: boolean;
  needsDonations: boolean;
  needsVolunteers: boolean;
  donationApprovalStatus: 'pending' | 'approved' | 'rejected';
  totalRaisedEUR: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  volunteerCount: number;
  donationCount: number;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerifiedProfile {
  userId: string;
  type: 'organization' | 'government' | 'press';
  entityName: string;
  entityCountry: string;
  position: string;
  orgType?: string;
  displayBadge: string;
  canPostWarCrimes: boolean;
  followersCount: number;
  postsCount: number;
  verifiedBy: string;
  verifiedAt: Date;
}