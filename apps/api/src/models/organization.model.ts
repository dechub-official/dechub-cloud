import { Schema, model } from 'mongoose';
import { MARKETS } from '@dechub/shared';

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    defaultOwnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    defaultMarket: { type: String, enum: MARKETS, default: 'india' },
    inboundApiKeyHash: { type: String, index: true, sparse: true },
    enabledProducts: { type: [String], default: ['crm'] },
    plan: { type: String, default: 'internal' },
  },
  { timestamps: true },
);

export const Organization = model('Organization', organizationSchema);
