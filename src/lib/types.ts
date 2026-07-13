// Shared types for the inquiry + AI dashboard

export type ViewKey =
  | 'dashboard'
  | 'inquiries'
  | 'notifications'
  | 'ai-replay'
  | 'ai-eval'
  | 'audit-log'
  | 'inquiry-detail'
  | 'hr-employees'
  | 'hr-leaves'
  | 'hr-attendance';

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface CategorizedInquiry {
  id: string;
  uid: number;
  from: string;
  fromName: string;
  fromDomain: string;
  to: string;
  subject: string;
  text: string;
  html: string | null;
  date: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachments: EmailAttachment[];
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  keyPoints: string[];
  suggestedAction: string;
  language: string;
}

export interface AppNotification {
  id: string;
  type: 'inquiry' | 'ai' | 'system' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  note: string;
}

export interface EvalResult {
  model: string;
  ok: boolean;
  category?: string;
  priority?: string;
  summary?: string;
  suggestedAction?: string;
  keyPoints?: string[];
  language?: string;
  latencyMs: number;
  error?: string;
}

export interface ReplyResult {
  ok: boolean;
  replySubject?: string;
  replyBody?: string;
  tone?: string;
  latencyMs: number;
  error?: string;
}

export interface ExtractedItem {
  partNumber: string;
  nsn: string;
  description: string;
  quantity: string;
  serialNumber: string;
  uom: string;
  notes: string;
}

export interface ExtractResult {
  ok: boolean;
  filename?: string;
  contentType?: string;
  size?: number;
  textLength?: number;
  items?: ExtractedItem[];
  rawText?: string;
  latencyMs?: number;
  error?: string;
  cached?: boolean;
}

// ── HR Types ──

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'on-leave' | 'inactive';
  joinDate: string;
  salary: number;
  leaveBalance: number;
  avatar: string; // initials
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  reviewedBy?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'remote';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workHours: number;
}
