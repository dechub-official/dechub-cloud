// Single source of truth for fixed value lists, used by both the API and the web app.

export const ROLES = ['admin', 'sales'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['invited', 'active', 'deactivated'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const STAGES = [
  'new',
  'contacted',
  'follow_up',
  'qualified',
  'meeting',
  'proposal',
  'won',
  'lost',
] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: Stage[] = ['new', 'contacted', 'follow_up', 'qualified', 'meeting', 'proposal'];
export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow-up',
  qualified: 'Qualified',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

export const SOURCES = [
  'website',
  'bridge_form',
  'linkedin_scrape',
  'oppora',
  'linkedin_outreach',
  'email_newsletter',
  'whatsapp_outreach',
  'meta_ads',
  'referral',
  'other',
] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  website: 'Website (dechub.in)',
  bridge_form: 'Bridge form',
  linkedin_scrape: 'LinkedIn scrape',
  oppora: 'Oppora',
  linkedin_outreach: 'LinkedIn outreach',
  email_newsletter: 'Email newsletter',
  whatsapp_outreach: 'WhatsApp outreach',
  meta_ads: 'Meta ads',
  referral: 'Referral',
  other: 'Other',
};

export const MARKETS = ['india', 'uae', 'usa', 'other'] as const;
export type Market = (typeof MARKETS)[number];
export const MARKET_LABELS: Record<Market, string> = {
  india: 'India',
  uae: 'UAE',
  usa: 'USA',
  other: 'Other',
};

export const CURRENCIES = ['INR', 'AED', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const MARKET_CURRENCY: Record<Market, Currency> = {
  india: 'INR',
  uae: 'AED',
  usa: 'USD',
  other: 'USD',
};

export const BUSINESS_LINES = ['agency', 'bridge'] as const;
export type BusinessLine = (typeof BUSINESS_LINES)[number];
export const BUSINESS_LINE_LABELS: Record<BusinessLine, string> = {
  agency: 'Dechub Agency',
  bridge: 'Dechub Bridge',
};

export const SERVICES = [
  'Branding',
  'Web & App',
  'Digital Marketing',
  'Retail Experience',
  'Content & Campaigns',
  'AI Automation',
  'Lead Gen',
  'Performance Ads',
  'Academy',
] as const;

export const REVENUE_BANDS = ['Under ₹10Cr', '₹10–50Cr', '₹50–200Cr', '₹200Cr+'] as const;

export const LOST_REASONS = [
  'No budget',
  'No response',
  'Chose competitor',
  'Not a fit',
  'Other',
] as const;

export const ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'whatsapp',
  'linkedin',
  'meeting',
  'stage_change',
  'owner_change',
  'created',
  'form_resubmitted',
  'task_done',
  'task_rescheduled',
  'task_cancelled',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export const CONTACT_TYPES = ['call', 'email', 'whatsapp', 'linkedin', 'meeting'] as const;

export const TASK_STATUSES = ['open', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** A user counts as "online" for lead assignment if their CRM tab pinged within this window. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Fields a CSV column can be mapped to on import. */
export const IMPORT_FIELDS = [
  'fullName',
  'email',
  'phone',
  'company',
  'website',
  'jobTitle',
  'location',
  'linkedinUrl',
  'message',
  'dealValue',
  'source',
  'market',
  'businessLine',
  'services',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
