import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import {
  BUSINESS_LINES,
  IMPORT_FIELDS,
  MARKETS,
  MARKET_CURRENCY,
  SOURCES,
  type ImportField,
  type Market,
} from '@dechub/shared';
import { Import, Lead, User } from '../../../models';
import { tenant } from '../../../middleware/auth';
import { audit } from '../../../utils/audit';
import { ah, badRequest } from '../../../utils/http';
import { normalizeEmail, normalizePhone } from '../../../utils/normalize';
import { createLead, logActivity } from '../leads/leads.service';

const router = Router();
const MAX_ROWS = 10_000;
// The file stays in memory and is never written to disk (IMP-01).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseCsv(buf?: Buffer): Record<string, string>[] {
  if (!buf) throw badRequest('Choose a CSV file to upload.');
  let rows: Record<string, string>[];
  try {
    rows = parse(buf, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
  } catch {
    throw badRequest('This file could not be read as CSV. Export it again as "CSV UTF-8" and retry.');
  }
  if (!rows.length) throw badRequest('The file has no rows.');
  if (rows.length > MAX_ROWS) throw badRequest(`The file has ${rows.length} rows. Split it into files of ${MAX_ROWS} rows or fewer.`);
  return rows;
}

const HINTS: Record<ImportField, string[]> = {
  fullName: ['name', 'full name', 'fullname', 'contact name', 'contact', 'lead name', 'person'],
  email: ['email', 'email address', 'e-mail', 'work email', 'mail'],
  phone: ['phone', 'phone number', 'mobile', 'whatsapp', 'contact number', 'tel'],
  company: ['company', 'company name', 'organization', 'organisation', 'business'],
  website: ['website', 'company website', 'url', 'domain'],
  jobTitle: ['title', 'job title', 'position', 'designation', 'role'],
  location: ['location', 'city', 'country', 'region'],
  linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'profile url'],
  message: ['message', 'notes', 'note', 'comments', 'description'],
  dealValue: ['value', 'deal value', 'amount', 'budget'],
  source: ['source', 'lead source'],
  market: ['market'],
  businessLine: ['business line', 'line'],
  services: ['services', 'service', 'interest', 'interested in'],
};

function suggestMapping(headers: string[]) {
  const mapping: Record<string, ImportField | ''> = {};
  const used = new Set<string>();
  for (const h of headers) {
    const key = h.toLowerCase().replace(/[_-]+/g, ' ').trim();
    const match = (Object.keys(HINTS) as ImportField[]).find(
      (f) => !used.has(f) && HINTS[f].some((hint) => key === hint),
    ) ?? (Object.keys(HINTS) as ImportField[]).find(
      (f) => !used.has(f) && HINTS[f].some((hint) => key.includes(hint)),
    );
    mapping[h] = match ?? '';
    if (match) used.add(match);
  }
  // A "first name" + "last name" pair is common in scraped lists.
  return mapping;
}

router.post(
  '/preview',
  upload.single('file'),
  ah(async (req, res) => {
    const rows = parseCsv(req.file?.buffer);
    const headers = Object.keys(rows[0]);
    res.json({ headers, rows: rows.slice(0, 10), rowCount: rows.length, suggestedMapping: suggestMapping(headers) });
  }),
);

const runSchema = z.object({
  mapping: z.record(z.string(), z.union([z.enum(IMPORT_FIELDS), z.literal('')])),
  defaults: z.object({
    source: z.enum(SOURCES),
    market: z.enum(MARKETS),
    businessLine: z.enum(BUSINESS_LINES),
    ownerId: z.string(),
  }),
});

const pick = <T extends readonly string[]>(list: T, value: string | undefined, fallback: T[number]): T[number] => {
  if (!value) return fallback;
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (list as readonly string[]).includes(v) ? (v as T[number]) : fallback;
};

router.post(
  '/',
  upload.single('file'),
  ah(async (req, res) => {
    const orgId = req.auth!.orgId;
    const rows = parseCsv(req.file?.buffer);
    let config: z.infer<typeof runSchema>;
    try {
      config = runSchema.parse({
        mapping: JSON.parse(String(req.body.mapping ?? '{}')),
        defaults: JSON.parse(String(req.body.defaults ?? '{}')),
      });
    } catch {
      throw badRequest('Choose a source, market, business line and owner for this import.');
    }
    const owner = await User.findOne({ _id: config.defaults.ownerId, orgId, status: 'active' }).select('_id');
    if (!owner) throw badRequest('Pick an active teammate as the owner for this import.');

    const fieldToHeader = new Map<string, string>();
    for (const [header, field] of Object.entries(config.mapping)) if (field) fieldToHeader.set(field, header);
    if (!fieldToHeader.has('fullName')) throw badRequest('Map a column to Full name.');
    if (!fieldToHeader.has('email') && !fieldToHeader.has('phone')) throw badRequest('Map a column to Email or Phone.');

    const job = await Import.create({
      orgId,
      userId: req.auth!.userId,
      fileName: req.file?.originalname,
      rowCount: rows.length,
      defaults: config.defaults,
    });

    // Load existing emails and phones once, then also catch duplicates inside the same file.
    const existing = await Lead.find({ orgId, deletedAt: null }).select('emailLower phoneNormalized').lean();
    const seenEmails = new Set(existing.map((l) => l.emailLower).filter(Boolean) as string[]);
    const seenPhones = new Set(existing.map((l) => l.phoneNormalized).filter(Boolean) as string[]);

    let created = 0;
    let skipped = 0;
    const errors: { row: number; reason: string }[] = [];
    const get = (row: Record<string, string>, f: ImportField) => {
      const h = fieldToHeader.get(f);
      const v = h ? row[h] : undefined;
      return v && v.trim() ? v.trim() : undefined;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2; // +1 for the header row, +1 for 1-based numbering
      const fullName = get(row, 'fullName');
      const email = get(row, 'email');
      const phone = get(row, 'phone');
      if (!fullName) { errors.push({ row: rowNo, reason: 'Missing name' }); continue; }
      const e = normalizeEmail(email);
      const p = normalizePhone(phone);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push({ row: rowNo, reason: 'Email is not valid' }); continue; }
      if (!e && !p) { errors.push({ row: rowNo, reason: 'Missing email or phone' }); continue; }
      if ((e && seenEmails.has(e)) || (p && seenPhones.has(p))) { skipped++; continue; }

      const market = pick(MARKETS, get(row, 'market'), config.defaults.market) as Market;
      const valueRaw = get(row, 'dealValue');
      const dealValue = valueRaw ? Number(valueRaw.replace(/[^0-9.]/g, '')) : undefined;
      try {
        const lead = await createLead(orgId, {
          fullName,
          email,
          phone,
          companyName: get(row, 'company'),
          companyWebsite: get(row, 'website'),
          jobTitle: get(row, 'jobTitle'),
          location: get(row, 'location'),
          linkedinUrl: get(row, 'linkedinUrl'),
          message: get(row, 'message'),
          dealValue: Number.isFinite(dealValue) ? dealValue : undefined,
          currency: MARKET_CURRENCY[market],
          source: pick(SOURCES, get(row, 'source'), config.defaults.source),
          market,
          businessLine: pick(BUSINESS_LINES, get(row, 'businessLine'), config.defaults.businessLine),
          services: get(row, 'services')?.split(/[,;|]/).map((s) => s.trim()).filter(Boolean),
          ownerId: owner._id,
          importId: job._id,
        });
        await logActivity(orgId, lead._id, 'created', req.auth!.userId, undefined, { source: lead.source, via: 'import', importId: String(job._id) });
        if (e) seenEmails.add(e);
        if (p) seenPhones.add(p);
        created++;
      } catch (err: any) {
        errors.push({ row: rowNo, reason: err?.message?.slice(0, 120) ?? 'Could not save' });
      }
    }

    job.created = created;
    job.skipped = skipped;
    job.failed = errors.length;
    job.errors = errors.slice(0, 1000) as any;
    await job.save();
    await audit(req, 'import_run', 'import', job._id, { file: job.fileName, created, skipped, failed: errors.length });
    res.status(201).json({ id: String(job._id), rowCount: rows.length, created, skipped, failed: errors.length, errors: errors.slice(0, 1000) });
  }),
);

router.get(
  '/',
  ah(async (req, res) => {
    const items = await Import.find(tenant(req)).sort({ createdAt: -1 }).limit(100).populate('userId', 'name').lean();
    res.json({
      items: items.map((i: any) => ({
        id: String(i._id),
        fileName: i.fileName,
        rowCount: i.rowCount,
        created: i.created,
        skipped: i.skipped,
        failed: i.failed,
        user: i.userId ? { id: String(i.userId._id), name: i.userId.name } : null,
        createdAt: i.createdAt,
      })),
    });
  }),
);

export default router;
