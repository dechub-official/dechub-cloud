import { Schema, model } from 'mongoose';

const importSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String },
    rowCount: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    errors: [{ row: Number, reason: String }],
    defaults: { type: Schema.Types.Mixed },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

importSchema.index({ orgId: 1, createdAt: -1 });

export const Import = model('Import', importSchema);
