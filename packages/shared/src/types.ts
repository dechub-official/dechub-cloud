import type {
  ActivityType,
  BusinessLine,
  Currency,
  Market,
  Role,
  Source,
  Stage,
  TaskStatus,
  UserStatus,
} from './constants';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt?: string;
  lastSeenAt?: string;
}

export interface OrgDTO {
  id: string;
  name: string;
  slug: string;
  defaultOwnerId?: string;
  defaultMarket: Market;
  hasApiKey: boolean;
}

export interface CompanyDTO {
  id: string;
  name: string;
  website?: string;
}

export interface LeadDTO {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: CompanyDTO | null;
  jobTitle?: string;
  location?: string;
  market: Market;
  businessLine: BusinessLine;
  source: Source;
  services: string[];
  projectType?: string;
  revenueBand?: string;
  message?: string;
  dealValue?: number;
  currency: Currency;
  stage: Stage;
  lostReason?: string;
  owner?: Pick<UserDTO, 'id' | 'name'> | null;
  nextFollowUpAt?: string | null;
  linkedinUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  body?: string;
  meta?: Record<string, unknown>;
  author?: Pick<UserDTO, 'id' | 'name'> | null;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  assignee?: Pick<UserDTO, 'id' | 'name'> | null;
  lead?: Pick<LeadDTO, 'id' | 'fullName'> | null;
  completedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
