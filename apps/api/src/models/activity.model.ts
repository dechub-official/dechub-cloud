import { Schema, model } from 'mongoose';
import { ACTIVITY_TYPES } from '@dechub/shared';

const activitySchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    body: { type: String },
    meta: { type: Schema.Types.Mixed },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    occurredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

activitySchema.index({ orgId: 1, leadId: 1, createdAt: -1 });

export const Activity = model('Activity', activitySchema);
