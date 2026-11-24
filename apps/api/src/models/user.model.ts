import { Schema, model } from 'mongoose';
import { ROLES, USER_STATUSES } from '@dechub/shared';

const userSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    role: { type: String, enum: ROLES, default: 'sales' },
    status: { type: String, enum: USER_STATUSES, default: 'invited' },
    inviteTokenHash: { type: String, index: true, sparse: true },
    inviteExpiresAt: { type: Date },
    resetTokenHash: { type: String, index: true, sparse: true },
    resetExpiresAt: { type: Date },
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    lastSeenAt: { type: Date },
    lastAssignedAt: { type: Date },
  },
  { timestamps: true },
);

// Email is unique within an organization.
userSchema.index({ orgId: 1, email: 1 }, { unique: true });
// Login looks a user up by email alone.
userSchema.index({ email: 1 });

export const User = model('User', userSchema);
