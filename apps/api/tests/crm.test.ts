import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User } from '../src/models';
import { makeOrg, startDb, stopDb } from './setup';

let A: Awaited<ReturnType<typeof makeOrg>>;
let B: Awaited<ReturnType<typeof makeOrg>>;

const lead = (over: Record<string, unknown> = {}) => ({
  fullName: 'Aisha Khan',
  email: 'aisha@example.com',
  phone: '+971 50 123 4567',
  market: 'uae',
  businessLine: 'agency',
  source: 'referral',
  ...over,
});

beforeAll(async () => {
  await startDb();
  A = await makeOrg('alpha');
  B = await makeOrg('beta');
});
afterAll(stopDb);

describe('tenant isolation', () => {
  it('never shows one organization the leads of another', async () => {
    const res = await A.adminAgent.post('/api/v1/leads').send(lead()).expect(201);
    const id = res.body.lead.id;
    await B.adminAgent.get(`/api/v1/leads/${id}`).expect(404);
    await B.adminAgent.patch(`/api/v1/leads/${id}`).send({ fullName: 'Hacked' }).expect(404);
    const list = await B.adminAgent.get('/api/v1/leads').expect(200);
    expect(list.body.items.find((l: any) => l.id === id)).toBeUndefined();
  });
});

describe('roles', () => {
  it('blocks sales users from admin-only routes', async () => {
    const res = await A.salesAgent.post('/api/v1/leads').send(lead({ email: 'r@x.com', phone: '' })).expect(201);
    await A.salesAgent.delete(`/api/v1/leads/${res.body.lead.id}`).expect(403);
    await A.salesAgent.post('/api/v1/users/invite').send({ email: 'n@x.com', name: 'N', role: 'sales' }).expect(403);
    await A.salesAgent.get('/api/v1/org/audit-logs').expect(403);
  });
});

describe('duplicates', () => {
  it('matches phone numbers written in different formats', async () => {
    await A.adminAgent.post('/api/v1/leads').send(lead({ email: 'p1@x.com', phone: '+91 98450 00001' })).expect(201);
    const dup = await A.adminAgent.post('/api/v1/leads').send(lead({ email: 'p2@x.com', phone: '0091-98450-00001' }));
    expect(dup.status).toBe(409);
  });
});

describe('pipeline rules', () => {
  it('requires a lost reason and cancels open follow-ups when closed', async () => {
    const { body } = await A.adminAgent.post('/api/v1/leads').send(lead({ email: 'close@x.com', phone: '' })).expect(201);
    const id = body.lead.id;
    await A.adminAgent.post('/api/v1/tasks').send({ leadId: id, title: 'Call back', dueAt: new Date(Date.now() + 3600e3) }).expect(201);
    await A.adminAgent.patch(`/api/v1/leads/${id}`).send({ stage: 'lost' }).expect(400);
    const closed = await A.adminAgent.patch(`/api/v1/leads/${id}`).send({ stage: 'lost', lostReason: 'No budget' }).expect(200);
    expect(closed.body.lead.nextFollowUpAt).toBeNull();
    const tasks = await A.adminAgent.get(`/api/v1/tasks?leadId=${id}&window=all`).expect(200);
    expect(tasks.body.items.every((t: any) => t.status === 'cancelled')).toBe(true);
  });
});

describe('inbound', () => {
  it('rejects a bad key, creates a lead, and logs a resubmission', async () => {
    await request(A.app).post('/api/v1/inbound/leads').set('x-api-key', 'nope').send({ form: 'dechub', name: 'X', email: 'x@x.com' }).expect(401);
    const first = await request(A.app)
      .post('/api/v1/inbound/leads')
      .set('x-api-key', A.apiKey)
      .send({ form: 'dechub', name: 'Form Lead', email: 'form@lead.com', services: ['Brand Identity'], challenge: 'Plateaued' })
      .expect(201);
    const again = await request(A.app)
      .post('/api/v1/inbound/leads')
      .set('x-api-key', A.apiKey)
      .send({ form: 'dechub', name: 'Form Lead', email: 'FORM@lead.com', challenge: 'Second try' })
      .expect(200);
    expect(again.body.leadId).toBe(first.body.leadId);
  });

  it('assigns to an online user, else the default owner', async () => {
    await User.updateMany({ orgId: B.org._id }, { lastSeenAt: new Date(Date.now() - 60 * 60e3) });
    const r1 = await request(B.app).post('/api/v1/inbound/leads').set('x-api-key', B.apiKey)
      .send({ form: 'bridge', contactName: 'Default Owner', workEmail: 'd@o.com' }).expect(201);
    const l1 = await B.adminAgent.get(`/api/v1/leads/${r1.body.leadId}`).expect(200);
    expect(l1.body.lead.owner.id).toBe(String(B.admin._id));

    await User.updateOne({ _id: B.sales._id }, { lastSeenAt: new Date() });
    const r2 = await request(B.app).post('/api/v1/inbound/leads').set('x-api-key', B.apiKey)
      .send({ form: 'bridge', contactName: 'Online Owner', workEmail: 'o@o.com' }).expect(201);
    const l2 = await B.adminAgent.get(`/api/v1/leads/${r2.body.leadId}`).expect(200);
    expect(l2.body.lead.owner.id).toBe(String(B.sales._id));
  });

  it('ignores honeypot submissions', async () => {
    await request(A.app).post('/api/v1/inbound/leads').set('x-api-key', A.apiKey)
      .send({ form: 'dechub', name: 'Bot', email: 'bot@bot.com', website_url: 'http://spam' }).expect(201);
    const list = await A.adminAgent.get('/api/v1/leads?q=bot@bot.com').expect(200);
    expect(list.body.total).toBe(0);
  });
});
