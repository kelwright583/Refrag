/**
 * Case notes and comms log types
 */

export type CommsChannel = 'email' | 'note';

export interface CaseNote {
  id: string;
  org_id: string;
  case_id: string;
  created_by: string;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface CaseNoteWithUser extends CaseNote {
  created_by_user?: {
    id: string;
    email: string;
  };
}

export interface CommsLogEntry {
  id: string;
  org_id: string;
  case_id: string;
  sent_by: string;
  channel: CommsChannel;
  to_recipients: string | null;
  subject: string | null;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface CommsLogEntryWithUser extends CommsLogEntry {
  sent_by_user?: {
    id: string;
    email: string;
  };
}

export interface CreateCaseNoteInput {
  case_id: string;
  body_md: string;
}

export interface CreateCommsLogInput {
  case_id: string;
  channel: CommsChannel;
  body_md: string;
  to_recipients?: string;
  subject?: string;
}
