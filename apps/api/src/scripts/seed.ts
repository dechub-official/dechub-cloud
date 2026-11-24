/**
 * Creates the first organization and its admin.
 * Usage: fill SEED_* in apps/api/.env, then run `npm run seed` from the repo root.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { Organization, User } from '../models';
import { slugify } from '../utils/normalize';

async function main() {
  const orgName = process.env.SEED_ORG_NAME || 'Dechub';
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || password.length < 10) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ characters) in apps/api/.env');
  }

  await connectDb();
  let org = await Organization.findOne({ slug: slugify(orgName) });
  if (!org) {
    org = await Organization.create({ name: orgName, slug: slugify(orgName), defaultMarket: 'india' });
    console.log(`Created organization "${orgName}"`);
  } else {
    console.log(`Organization "${orgName}" already exists`);
  }

  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      orgId: org._id,
      name,
      email,
      role: 'admin',
      status: 'active',
      passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`Created admin ${email}`);
  } else {
    console.log(`User ${email} already exists, left unchanged`);
  }

  if (!org.defaultOwnerId) {
    (org as any).defaultOwnerId = admin._id;
    await org.save();
    console.log('Set the admin as default owner for inbound leads');
  }
  await mongoose.disconnect();
  console.log('Seed complete. Log in at the web app with the admin email and password.');
}

main().catch(async (e) => {
  console.error(e.message ?? e);
  await mongoose.disconnect();
  process.exit(1);
});
