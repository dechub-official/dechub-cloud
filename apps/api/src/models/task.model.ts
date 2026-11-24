import { Schema, model } from 'mongoose';
import { TASK_STATUSES } from '@dechub/shared';

const taskSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'open' },
    completedAt: { type: Date },
    history: [{ dueAt: Date, changedAt: Date, changedBy: Schema.Types.ObjectId }],
  },
  { timestamps: true },
);

taskSchema.index({ orgId: 1, assigneeId: 1, status: 1, dueAt: 1 });
taskSchema.index({ orgId: 1, leadId: 1, status: 1 });

export const Task = model('Task', taskSchema);
