// User & Auth Types
export const UserRole = {
  USER: "user",
  MODERATOR: "moderator",
  SUPERUSER: "superuser",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  isBanned: boolean;
  createdAt: string;
  phone?: string;
  studentId?: string;
  lastProfileUpdate?: string;
  lastPasswordUpdate?: string;
}

export interface AuthResponse extends User {
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

// Equipment Types
export interface Equipment {
  _id: string;
  name: string;
  category: string;
  type: "Primary" | "Secondary";
  linkedEquipment?: string; // ID only
  quantity: number;
  condition: "New" | "Good" | "Fair" | "Poor";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const RequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  RETURNED: "returned",
  OVERDUE: "overdue",
  WAITING: "waiting",
  TRANSFERRED: "transferred",
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export interface Responsibility {
  _id: string;
  user: User | string;
  equipment: Equipment | string;
  quantity: number;
  requestDate: string;
  issueDate?: string;
  returnDate?: string;
  dueDate?: string;
  status: RequestStatus;
  notes?: string;
  transferChain?: {
    fromUser: string;
    toUser: string;
    date: string;
  }[];
  createdAt: string;
  updatedAt: string;
  approvedBy?: User | string;
}

export interface EquipmentRequest {
  equipmentId: string;
  quantity: number;
  notes?: string;
}

export interface EquipmentTransfer {
  targetUserId: string;
  quantity: number;
}

// Event Types
export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer?: User | string;
  participants: (User | string)[];
  createdAt: string;
  updatedAt: string;
}

export interface EventCreate {
  title: string;
  description: string;
  date: string;
  location: string;
}

// Team Types
export const TeamType = {
  EVENT: "event",
  GENERAL: "general",
  MEMBER: "member",
} as const;

export type TeamType = (typeof TeamType)[keyof typeof TeamType];

export interface Team {
  _id: string;
  name: string;
  sport: string;
  teamType: TeamType;
  coach?: string;
  executive?: User | string;
  members: (User | string)[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamCreate {
  name: string;
  sport: string;
  coach?: string;
  executive?: string;
  members?: string[];
}

// Announcement Types
export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: User | string;
  targetRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementCreate {
  title: string;
  content: string;
  targetRole?: string;
}

// Report Types
export const ReportType = {
  BUG: "bug",
  FEEDBACK: "feedback",
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export interface Report {
  _id: string;
  user: User | string;
  type: ReportType;
  subject: string;
  description: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export interface ReportCreate {
  type: ReportType;
  subject: string;
  description: string;
}

// Dashboard Types
export interface DashboardSummary {
  announcements?: Announcement[];
  upcomingEvents?: Event[];
  totalUsers?: number;
  totalEquipment?: number;
  totalTeams?: number;
  pendingRequests?: number;
  managedResponsibilities?: number;
  membersCount?: number;
  myTeam?: Team;
  myRegisteredEventsCount?: number;
  myRequestsCount?: number;
}
// Form Types
export interface FormField {
  label?: string;
  type: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  pattern?: string;
  fields?: FormField[]; // For nested "members" type
}

export interface Form {
  _id: string;
  formId: string;
  formTitle: string;
  formDescription: string;
  requireSunwayEmail: boolean;
  fields: FormField[];
  isActive: boolean;
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export interface FormSubmission {
  _id: string;
  form: Form | string;
  submittedBy?: User | string;
  data: Record<string, any>;
  status: SubmissionStatus;
  reviewedBy?: User | string;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

// Meeting Types
export type MeetingType = "virtual" | "physical";

export interface Meeting {
  _id: string;
  title: string;
  topic: string;
  type: MeetingType;
  venue?: string;
  roomNo?: string;
  meetingLink?: string;
  date: string;
  time: string;
  participants: string[];
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingCreate {
  title: string;
  topic: string;
  type: MeetingType;
  venue?: string;
  roomNo?: string;
  meetingLink?: string;
  date: string;
  time: string;
  participants: string[];
}
