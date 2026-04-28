export interface FormCategory {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  weightage: number;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum FormOwnerType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
}

export enum FormStatus {
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export interface Form {
  id: string;
  name: Record<string, string>;
  title?: string;
  description?: Record<string, string>;
  weightage?: number;
  schema?: any;
  metadata?: Record<string, any>;
  organizationId?: string | null;
  ownerType: FormOwnerType;
  ownerId: string;
  status?: string;
  publishStatus?: FormStatus;
  isPublic?: boolean;
  category?: FormCategory;
  createdAt: string;
  updatedAt?: string;
}
