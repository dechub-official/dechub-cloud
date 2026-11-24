'use client';

import { useState } from 'react';
import { LOST_REASONS } from '@dechub/shared';
import { Modal } from '../ui/Modal';

/** Moving a lead to Lost always asks why (PIPE-03). */
export function LostReasonDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>('No response');
  const [other, setOther] = useState('');
  const value = reason === 'Other' ? other.trim() : reason;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Why was this lead lost?"
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" disabled={!value} onClick={() => onConfirm(reason === 'Other' ? `Other: ${value}` : value)}>
            Mark as lost
          </button>
        </>
      }
    >
      <div className="space-y-2">
        {LOST_REASONS.map((r) => (
          <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-[13.5px] ${reason === r ? 'border-orchid bg-orchid-soft' : 'border-line'}`}>
            <input type="radio" name="lost" className="accent-[#5B3CC4]" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
        {reason === 'Other' && (
          <textarea className="field mt-2" rows={2} placeholder="What happened?" value={other} onChange={(e) => setOther(e.target.value)} autoFocus />
        )}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-muted">Open follow-ups on this lead will be cancelled.</p>
    </Modal>
  );
}
