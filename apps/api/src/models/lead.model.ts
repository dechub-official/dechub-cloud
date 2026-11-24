import { Schema, model } from 'mongoose';
import { BUSINESS_LINES, CURRENCIES, MARKETS, SOURCES, STAGES } from '@dechub/shared';

const leadSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    emailLower: { type: String },
    phone: { type: String, trim: true },
    phoneNormalized: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    jobTitle: { type: String, trim: true },
    location: { type: String, trim: true },
    market: { type: String, enum: MARKETS, required: true },
    businessLine: { type: String, enum: BUSINESS_LINES, required: true },
    source: { type: String, enum: SOURCES, required: true },
    services: { type: [String], default: [] },
    projectType: { type: String, trim: true },
    revenueBand: { type: String },
    message: { type: String },
    dealValue: { type: Number, min: 0 },
    currency: { type: String, enum: CURRENCIES, required: true },
    stage: { type: String, enum: STAGES, default: 'new' },
    lostReason: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    nextFollowUpAt: { type: Date, default: null },
    linkedinUrl: { type: String, trim: true },
    importId: { type: Schema.Types.ObjectId, ref: 'Import' },
    closedAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leadSchema.index({ orgId: 1, emailLower: 1 });
leadSchema.index({ orgId: 1, phoneNormalized: 1 });
leadSchema.index({ orgId: 1, stage: 1 });
leadSchema.index({ orgId: 1, ownerId: 1 });
leadSchema.index({ orgId: 1, nextFollowUpAt: 1 });
leadSchema.index({ orgId: 1, createdAt: -1 });
leadSchema.index({ fullName: 'text', email: 'text', phone: 'text' });

export const Lead = model('Lead', leadSchema);
