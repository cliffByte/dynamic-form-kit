import { FormField } from './form';
import { Form } from './form-management';

export interface SubmissionData {
  id: string;
  value: any;
}

export interface Submission {
  id: string;
  form: Form;
  data: SubmissionData[];
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus =
  | 'pending'
  | 'admission_approved'
  | 'financial_approved'
  | 'declined'
  | 'declined_resubmit'
  | 'completed';

export interface ApprovalHistory {
  id: string;
  action: 'approve' | 'decline' | 'decline_resubmit' | 'edit';
  department: 'admission' | 'financial' | 'user';
  userId?: string;
  userName?: string;
  timestamp: string;
  notes?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
  status: SubmissionStatus;
  currentDepartment?: 'admission' | 'financial'; // Which department needs to review
  approvalHistory: ApprovalHistory[];
  lastEditedAt?: string;
  declineReason?: string;
  canResubmit?: boolean;
}

// Form submission data structure - maps field IDs directly to their values
export interface FormSubmissionData {
  [fieldId: string]: any; // Direct mapping of field ID to value
}

// Enhanced form submission with field metadata for easier access
export interface EnhancedFormSubmission {
  fields: FormField[]; // Original form fields structure
  submissionData: FormSubmissionData; // Direct ID-to-value mapping
  // Helper metadata
  fieldMap: Map<string, FormField>; // Quick lookup map for fields by ID
}
