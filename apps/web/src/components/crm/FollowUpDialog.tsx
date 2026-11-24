'use client';

import { useEffect, useState } from 'react';
import type { UserDTO } from '@dechub/shared';
import { toLocalInput, tomorrowAt } from '@/lib/format';
import { Field } from '../ui/bits';
import { Modal } from '../ui/Modal';
import { UserOptions } from './options';

const QUICK = [
  { label: 'In 1 hour', at: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'Tomorrow 10:00', at: () => tomorrowAt(10) },
  { label: 'In 3 days', at: () => { const d = tomorrowAt(10); d.setDate(d.getDate() + 2); return d; } },
  { label: 'Next week', at: () => { const d = tomorrowAt(10); d.setDate(d.getDate() + 6); return d; } },
];

/** Create a follow-up, or reschedule one (mode="reschedule"). */
export function FollowUpDialog({
  open,
  onClose,
  onSave,
  users,
  defaultAssigneeId,
  mode = 'create',
  initialTitle = 'Follow up',
  heading,
  skipLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: { title: string; dueAt: string; assigneeId?: string }) => Promise<void> | void;
  users?: UserDTO[];
  defaultAssigneeId?: string;
  mode?: 'create' | 'reschedule';
  initialTitle?: string;
  heading?: string;
  skipLabel?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [due, setDue] = useState(toLocalInput(tomorrowAt(10)));
  const [assignee, setAssignee] = useState(defaultAssigneeId ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDue(toLocalInput(tomorrowAt(10)));
      setAssignee(defaultAssigneeId ?? '');
    }
  }, [open, initialTitle, defaultAssigneeId]);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ title, dueAt: new Date(due).toISOString(), assigneeId: assignee || undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={heading ?? (mode === 'create' ? 'Set the next follow-up' : 'Reschedule follow-up')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{skipLabel ?? 'Cancel'}</button>
          <button className="btn-primary" disabled={busy || !title.trim() || !due} onClick={save}>
            {mode === 'create' ? 'Save follow-up' : 'Reschedule'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === 'create' && (
          <Field label="What needs to happen">
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        )}
        <div>
          <span className="label">When</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((qk) => (
              <button key={qk.label} type="button" className="rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-orchid hover:text-orchid" onClick={() => setDue(toLocalInput(qk.at()))}>
                {qk.label}
              </button>
            ))}
          </div>
          <input className="field" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        {mode === 'create' && users && (
          <Field label="Assigned to">
            <select className="field" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <UserOptions users={users} />
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
