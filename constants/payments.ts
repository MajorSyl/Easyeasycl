// Starting prices for the three monetization products, chosen as reasonable
// anchors (not validated against real willingness-to-pay yet) — see the
// Monetization section in README.md. Adjust freely; nothing else in the
// codebase assumes these exact values.
export type PaymentPurpose = 'listing_boost' | 'agent_subscription' | 'agent_verification';

export const PAYMENT_PRODUCTS: Record<
  PaymentPurpose,
  { label: string; amount: number; durationLabel: string; description: string }
> = {
  listing_boost: {
    label: 'Feature This Listing',
    amount: 300,
    durationLabel: '7 days',
    description: 'Your listing appears at the top of Home and Search with a PREMIUM badge for 7 days.',
  },
  agent_subscription: {
    label: 'Agent Subscription',
    amount: 1000,
    durationLabel: '30 days',
    description: 'All of your current and future listings stay featured for 30 days — no need to boost them one by one.',
  },
  agent_verification: {
    label: 'Verified Agent Review',
    amount: 500,
    durationLabel: 'one-time',
    description: 'An admin reviews your account. If approved, your profile and listings get a Verified Agent badge.',
  },
};

// Exactly two providers, matching what's actually usable in Sierra Leone.
// The internal value `africell_money` is kept as-is (it's the payments
// table's CHECK-constrained column value — renaming it would mean a data
// migration for no real benefit); only the display label changed to match
// the product's real branding, "Afrimoney".
export type MobileMoneyProvider = 'orange_money' | 'africell_money';

// TODO before launch: replace with the real numbers payments should be sent
// to. There is no live payment gateway wired up — every purchase is
// verified manually by an admin against the reference code and payment
// screenshot the payer submits (see admin_review_payment in the payments
// migration and apps/admin/app/payments/page.tsx). Until these are real, do
// not point real users at the boost/subscription/verification purchase
// screens.
export const MOBILE_MONEY_RECEIVING: Record<MobileMoneyProvider, { label: string; number: string; accountName: string }> = {
  orange_money: {
    label: 'Orange Money',
    number: 'REPLACE_WITH_YOUR_ORANGE_MONEY_NUMBER',
    accountName: 'REPLACE_WITH_YOUR_BUSINESS_NAME',
  },
  africell_money: {
    label: 'Afrimoney',
    number: 'REPLACE_WITH_YOUR_AFRIMONEY_NUMBER',
    accountName: 'REPLACE_WITH_YOUR_BUSINESS_NAME',
  },
};
