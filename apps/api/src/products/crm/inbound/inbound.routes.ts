import { Router } from 'express';
import { z } from 'zod';
import { Lead, Organization, User } from '../../../models';
import { inboundLimiter } from '../../../middleware/rateLimit';
import { audit } from '../../../utils/audit';
import { ah, badRequest, HttpError } from '../../../utils/http';
import { sha256 } from '../../../utils/tokens';
import { createLead, findDuplicate, logActivity, pickInboundOwner } from '../leads/leads.service';

const router = Router();

/**
 * Website form capture (IN-01..IN-05).
 * POST /api/v1/inbound/leads  with header  x-api-key: dch_live_...
 *
 * Body for dechub.in:     { form: "dechub", name, email, services[], annualRevenue, challenge }
 * Body for bridge.dechub.ai: { form: "bridge", companyName, companyWebsite, contactName,
 *                           workEmail, projectType, phone, projectDescription }
 * Optional on both: "website_url" is a hidden honeypot field. Real visitors leave it empty.
 */
const payload = z.object({
  form: z.enum(['dechub', 'bridge']),
  // dechub.in contact form
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().max(200).optional(),
  services: z.union([z.array(z.string()), z.string()]).optional(),
  annualRevenue: z.string().trim().max(40).optional(),
  challenge: z.string().trim().max(5000).optional(),
  // bridge.dechub.ai Book a Demo
  companyName: z.string().trim().max(160).optional(),
  companyWebsite: z.string().trim().max(300).optional(),
  contactName: z.string().trim().max(160).optional(),
  workEmail: z.string().trim().max(200).optional(),
  projectType: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  projectDescription: z.string().trim().max(5000).optional(),
  // honeypot
  website_url: z.string().optional(),
});

const SERVICE_MAP: Record<string, string> = {
  'brand identity': 'Branding',
  branding: 'Branding',
  'web & app design': 'Web & App',
  'digital marketing': 'Digital Marketing',
  'retail experience': 'Retail Experience',
  'content & campaigns': 'Content & Campaigns',
};

const REVENUE_MAP: Record<string, string> = {
  'under rs10cr': 'Under ₹10Cr',
  'rs10cr - rs50cr': '₹10–50Cr',
  'rs50cr - rs200cr': '₹50–200Cr',
  'rs200cr+': '₹200Cr+',
};

router.post(
  '/leads',
  inboundLimiter,
  ah(async (req, res) => {
    const key = req.header('x-api-key');
    if (!key) throw new HttpError(401, 'missing_key', 'Missing x-api-key header.');
    const org = await Organization.findOne({ inboundApiKeyHash: sha256(key) });
    if (!org) throw new HttpError(401, 'invalid_key', 'This API key is not valid.');

    const body = payload.parse(req.body);
    // Bots fill hidden fields. Answer as if it worked, but save nothing.
    if (body.website_url) return res.status(201).json({ ok: true });

    const isBridge = body.form === 'bridge';
    const fullName = (isBridge ? body.contactName : body.name)?.trim();
    const email = (isBridge ? body.workEmail : body.email)?.trim() || undefined;
    const phone = body.phone?.trim() || undefined;
    if (!fullName) throw badRequest('A name is required.');
    if (!email && !phone) throw badRequest('An email or phone is required.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('The email is not valid.');

    const services = (Array.isArray(body.services) ? body.services : body.services?.split(',') ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => SERVICE_MAP[s.toLowerCase()] ?? s);
    const message = isBridge ? body.projectDescription : body.challenge;

    // Repeat submitter: log on the existing lead and keep its owner and stage.
    const dup = await findDuplicate(org._id, email, phone);
    if (dup) {
      await logActivity(org._id, dup._id, 'form_resubmitted', undefined, message, {
        form: body.form,
        services,
        projectType: body.projectType,
      });
      await Lead.updateOne({ _id: dup._id }, { $currentDate: { updatedAt: true } });
      return res.status(200).json({ ok: true, leadId: String(dup._id), duplicate: true });
    }

    const { ownerId, reason } = await pickInboundOwner(org._id);
    const lead = await createLead(org._id, {
      fullName,
      email,
      phone,
      companyName: body.companyName,
      companyWebsite: body.companyWebsite,
      market: org.defaultMarket as any,
      businessLine: isBridge ? 'bridge' : 'agency',
      source: isBridge ? 'bridge_form' : 'website',
      services,
      projectType: body.projectType,
      revenueBand: body.annualRevenue ? REVENUE_MAP[body.annualRevenue.toLowerCase()] ?? body.annualRevenue : undefined,
      message,
      ownerId,
    });
    const owner = ownerId ? await User.findById(ownerId).select('name').lean() : null;
    await logActivity(org._id, lead._id, 'created', undefined, undefined, { source: lead.source, via: 'website_form', form: body.form });
    await logActivity(org._id, lead._id, 'owner_change', undefined, undefined, { to: owner?.name ?? 'Unassigned', reason });
    await audit(req, 'lead_created', 'lead', lead._id, { via: 'inbound', form: body.form, ownerReason: reason }, org._id);
    res.status(201).json({ ok: true, leadId: String(lead._id) });
  }),
);

export default router;
