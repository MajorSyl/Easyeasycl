'use client';

import { useState, useTransition } from 'react';
import { reviewPayment } from '../app/actions';
import { initialsOf, avatarColor } from '../lib/avatar';
import { relativeTime, formatNLE } from '../lib/format';
import { IconCheck, IconX, IconExternalLink } from './icons';

const PURPOSE_LABELS: Record<string, string> = {
  listing_boost: 'Listing Boost',
  agent_subscription: 'Agent Subscription',
  agent_verification: 'Agent Verification',
};
const PURPOSE_DETAIL: Record<string, string> = {
  listing_boost: '7-day boost',
  agent_subscription: '30-day subscription',
  agent_verification: 'Admin review',
};

export type QueuedPayment = {
  id: string;
  purpose: string;
  amount: number;
  currency: string;
  momo_provider: string | null;
  momo_reference: string | null;
  screenshot_url: string | null;
  notes: string | null;
  submitted_at: string;
  payerName: string | null;
};

function providerLabel(p: QueuedPayment): string {
  if (p.momo_provider === 'orange_money') return 'Orange Money';
  if (p.momo_provider === 'africell_money') return 'Afrimoney';
  return 'Manual';
}

export function PaymentQueueRow({ payment }: { payment: QueuedPayment }) {
  const isVerification = payment.purpose === 'agent_verification';
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [termsMet, setTermsMet] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  const canApprove = isVerification ? paymentReceived && termsMet && !isPending : !isPending;

  function act(decision: 'approve' | 'reject') {
    setRemoved(true);
    startTransition(() => reviewPayment(payment.id, decision, decision === 'reject' ? 'Declined from Overview queue' : undefined));
  }

  return (
    <div className={`review-row${removed ? ' fade-out' : ''}`}>
      <div className="avatar-chip" style={{ background: avatarColor(payment.id) }}>
        {initialsOf(payment.payerName)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{payment.payerName ?? 'Unknown'}</span>
          <span className="badge badge-gray">{providerLabel(payment)}</span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
          {PURPOSE_LABELS[payment.purpose] ?? payment.purpose} · {PURPOSE_DETAIL[payment.purpose] ?? ''}
        </div>
        {payment.momo_reference && (
          <div className="muted" style={{ fontSize: 10.5, fontFamily: 'monospace', marginTop: 2 }}>{payment.momo_reference}</div>
        )}
        {isVerification && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: '#475467' }}>
              <input type="checkbox" checked={paymentReceived} onChange={(e) => setPaymentReceived(e.target.checked)} />
              Payment received
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: '#475467' }}>
              <input type="checkbox" checked={termsMet} onChange={(e) => setTermsMet(e.target.checked)} />
              Terms met
            </label>
          </div>
        )}
      </div>

      <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{isVerification ? 'Contact' : formatNLE(payment.amount)}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{relativeTime(payment.submitted_at)}</div>
      </div>

      <div className="payment-row-actions">
        {payment.screenshot_url && (
          <a href={payment.screenshot_url} target="_blank" rel="noopener noreferrer" className="icon-btn icon-btn-link" title="View payment proof">
            <IconExternalLink size={13} />
          </a>
        )}
        <button type="button" className="icon-btn icon-btn-approve" disabled={!canApprove} onClick={() => act('approve')} title="Approve">
          <IconCheck size={13} />
        </button>
        <button type="button" className="icon-btn icon-btn-reject" disabled={isPending} onClick={() => act('reject')} title="Reject">
          <IconX size={13} />
        </button>
      </div>
    </div>
  );
}
