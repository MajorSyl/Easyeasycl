'use client';

import { useState, useTransition } from 'react';
import { reviewPayment } from '../actions';

type VerificationPayment = {
  id: string;
  amount: number;
  currency: string;
  notes: string | null;
  submitted_at: string;
  user: { full_name: string | null } | { full_name: string | null }[] | null;
};

export function VerificationRequestRow({ payment }: { payment: VerificationPayment }) {
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [termsMet, setTermsMet] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const canApprove = paymentReceived && termsMet && !isPending;
  const fullName = Array.isArray(payment.user) ? payment.user[0]?.full_name : payment.user?.full_name;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{fullName ?? 'Unknown'}</div>
        <div className="muted" style={{ fontSize: 11 }}>{new Date(payment.submitted_at).toLocaleString('en-GB')}</div>
      </td>
      <td style={{ fontWeight: 600 }}>
        {payment.currency} {Number(payment.amount).toLocaleString('en-US')}
      </td>
      <td className="muted" style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>
        {payment.notes ?? <span style={{ fontSize: 11 }}>No note provided</span>}
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={paymentReceived} onChange={(e) => setPaymentReceived(e.target.checked)} />
            Payment received
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={termsMet} onChange={(e) => setTermsMet(e.target.checked)} />
            Terms met
          </label>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#16a34a', color: '#fff', border: 'none' }}
            disabled={!canApprove}
            onClick={() => startTransition(() => reviewPayment(payment.id, 'approve'))}
          >
            Approve
          </button>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason"
            className="form-select"
            style={{ width: 140 }}
          />
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={isPending}
            onClick={() => startTransition(() => reviewPayment(payment.id, 'reject', reason || 'Verification request declined'))}
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}
