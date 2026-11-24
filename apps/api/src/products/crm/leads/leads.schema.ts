import { z } from 'zod';
import {
  BUSINESS_LINES,
  CURRENCIES,
  LOST_REASONS,
  MARKETS,
  SOURCES,
  STAGES,
} from '@dechub/shared';

const optStr = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const leadBaseSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name.').max(160),
  email: z.string().trim().email('Enter a valid email.').optional().or(z.literal('').transform(() => undefined)),
  phone: optStr(40),
  companyName: optStr(160),
  companyWebsite: optStr(300),
  jobTitle: optStr(160),
  location: optStr(160),
  market: z.enum(MARKETS),
  businessLine: z.enum(BUSINESS_LINES),
  source: z.enum(SOURCES),
  services: z.array(z.string().max(60)).max(20).optional(),
  projectType: optStr(160),
  revenueBand: optStr(40),
  message: optStr(5000),
  dealValue: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(CURRENCIES).optional(),
  linkedinUrl: optStr(300),
  ownerId: z.string().optional(),
});

export const createLeadSchema = leadBaseSchema
  .extend({ allowDuplicate: z.boolean().optional() })
  .refine((v) => v.email || v.phone, {
    message: 'Add an email or a phone number.',
    path: ['email'],
  });

export const updateLeadSchema = leadBaseSchema.partial().extend({
  stage: z.enum(STAGES).optional(),
  lostReason: z.string().trim().max(300).optional(),
});

export const listLeadsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  stage: z.string().optional(), // comma separated
  source: z.string().optional(),
  owner: z.string().optional(), // user id or "me"
  market: z.string().optional(),
  businessLine: z.string().optional(),
  service: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  companyId: z.string().optional(),
  sort: z
    .enum(['createdAt', 'fullName', 'stage', 'dealValue', 'nextFollowUpAt', 'updatedAt'])
    .default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(['owner', 'stage', 'delete']),
  ownerId: z.string().optional(),
  stage: z.enum(STAGES).optional(),
  lostReason: z.string().optional(),
});

export const LOST_REASON_LIST = LOST_REASONS;
