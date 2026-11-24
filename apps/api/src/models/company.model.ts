import { Schema, model } from 'mongoose';

const companySchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true },
    website: { type: String, trim: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

companySchema.index({ orgId: 1, nameLower: 1 });

export const Company = model('Company', companySchema);
