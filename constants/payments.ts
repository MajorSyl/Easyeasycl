// Post-launch-mode prices for the three monetization products — see the
// Monetization section in README.md. These only take effect once launch
// mode (app_settings.launch_mode_active) is turned off; while it's on,
// everything is free regardless of these numbers.
export type PaymentPurpose = 'listing_boost' | 'agent_subscription' | 'agent_verification';

// The one place the Agent Subscription figure lives — ~$20 USD equivalent,
// still a placeholder pending a confirmed exact NLE amount. Swap this one
// number and every screen that shows the price updates with it.
const AGENT_SUBSCRIPTION_PRICE_NLE = 450;

export const CURRENCY_CODE = 'NLE'; // "New Leone" — Sierra Leone's redenominated currency

export const PAYMENT_PRODUCTS: Record<
  PaymentPurpose,
  { label: string; amount: number; durationLabel: string; description: string; contactOnly: boolean }
> = {
  listing_boost: {
    label: 'Feature This Listing',
    amount: 50,
    durationLabel: '7 days',
    description: 'Your listing appears at the top of Home and Search with a PREMIUM badge for 7 days.',
    contactOnly: false,
  },
  agent_subscription: {
    label: 'Agent Subscription',
    amount: AGENT_SUBSCRIPTION_PRICE_NLE,
    durationLabel: '30 days',
    description: 'All of your current and future listings stay featured for 30 days — no need to boost them one by one.',
    contactOnly: false,
  },
  agent_verification: {
    label: 'Verified Agent Review',
    // Not self-checkout anymore -- see contactOnly below. This amount is
    // still the real fee an admin collects manually after approving a
    // request over email; kept here as the one source of truth for that
    // figure (referenced by app/pay.tsx if an admin does route an agent
    // through the existing submission screen) even though it's no longer
    // shown as a price anywhere in the normal purchase UI.
    amount: 500,
    durationLabel: 'one-time',
    description: 'An admin reviews your account. If approved, your profile and listings get a Verified Agent badge.',
    contactOnly: true,
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
