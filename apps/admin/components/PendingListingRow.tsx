'use client';

import { useState, useTransition } from 'react';
import { setListingModerationStatus } from '../app/actions';
import { initialsOf, avatarColor } from '../lib/avatar';
import { relativeTime, formatListingPrice } from '../lib/format';
import { IconPin, IconCheck, IconX, IconExternalLink } from './icons';

const CATEGORY_LABELS: Record<string, string> = {
  for_rent: 'For Rent',
  for_sale: 'For Sale',
  land: 'Land',
  daily_hourly: 'Daily/Hourly',
};

export type PendingListing = {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  photos: string[] | null;
  created_at: string;
  neighborhood: string | null;
  ownerName: string | null;
  ownerRole: string;
};

export function PendingListingRow({ listing }: { listing: PendingListing }) {
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  function act(status: 'approved' | 'rejected') {
    setRemoved(true);
    startTransition(() => setListingModerationStatus(listing.id, status));
  }

  return (
    <div className={`review-row${removed ? ' fade-out' : ''}`}>
      <div className="avatar-chip" style={{ background: avatarColor(listing.id) }}>
        {initialsOf(listing.ownerName)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="truncate" style={{ fontWeight: 700, fontSize: 13, maxWidth: 220 }}>{listing.title}</span>
          <span className="muted" style={{ fontSize: 11 }}>L-{listing.id.slice(0, 4).toUpperCase()}</span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
          {listing.ownerName ?? 'Unknown'} · {listing.ownerRole}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, fontSize: 11, color: '#667085' }}>
          {listing.neighborhood && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconPin size={11} /> {listing.neighborhood}
            </span>
          )}
          <span>{(listing.photos ?? []).length} photos</span>
        </div>
      </div>

      <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{formatListingPrice(listing.price, listing.currency)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <span className="badge badge-blue">{CATEGORY_LABELS[listing.category] ?? listing.category}</span>
          <span className="muted" style={{ fontSize: 11 }}>{relativeTime(listing.created_at)}</span>
        </div>
      </div>

      <div className="review-row-actions">
        <a href={`/listings`} target="_blank" rel="noopener noreferrer" className="icon-btn icon-btn-link" title="View listing">
          <IconExternalLink size={13} />
        </a>
        <button type="button" className="icon-btn icon-btn-approve" disabled={isPending} onClick={() => act('approved')} title="Approve">
          <IconCheck size={13} />
        </button>
        <button type="button" className="icon-btn icon-btn-reject" disabled={isPending} onClick={() => act('rejected')} title="Reject">
          <IconX size={13} />
        </button>
      </div>
    </div>
  );
}
