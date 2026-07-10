// Shared types for the inquiry + AI dashboard

export type ViewKey =
  | 'dashboard'
  | 'inquiries'
  | 'notifications'
  | 'ai-reply'
  | 'ai-eval'
  | 'audit-log';

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
