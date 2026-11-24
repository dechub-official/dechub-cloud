import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import request from 'supertest';
import { createApp } from '../src/app';
import { Organization, User } from '../src/models';
import { generateApiKey, sha256 } from '../src/utils/tokens';

let mongo: MongoMemoryServer;

export async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongo?.stop();
}

export const app = () => createApp();

/** Creates an organization with one admin and one sales user, and returns logged-in agents. */
export async function makeOrg(slug: string) {
  const org = await Organization.create({ name: slug, slug, defaultMarket: 'india' });
  const apiKey = generateApiKey();
  org.inboundApiKeyHash = sha256(apiKey);
  const passwordHash = await bcrypt.hash('password-123', 4);
  const admin = await User.create({ orgId: org._id, name: `${slug} admin`, email: `admin@${slug}.test`, role: 'admin', status: 'active', passwordHash });
  const sales = await User.create({ orgId: org._id, name: `${slug} sales`, email: `sales@${slug}.test`, role: 'sales', status: 'active', passwordHash });
  (org as any).defaultOwnerId = admin._id;
  await org.save();

  const a = app();
  const adminAgent = request.agent(a);
  await adminAgent.post('/api/v1/auth/login').send({ email: admin.email, password: 'password-123' }).expect(200);
  const salesAgent = request.agent(a);
  await salesAgent.post('/api/v1/auth/login').send({ email: sales.email, password: 'password-123' }).expect(200);
  return { org, admin, sales, adminAgent, salesAgent, apiKey, app: a };
}
