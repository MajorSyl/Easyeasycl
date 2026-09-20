// Decision-tree Help content -- tappable questions with pre-written
// answers, no free-text input and no API call. Add a new question by
// appending an entry here; nothing else needs to change.
export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'list-property',
    question: 'How do I list a property?',
    answer:
      'Tap "Add Listing" in the bottom tab bar (you\'ll need to log in first). Add up to 10 photos, pick your District, City/Town, and Location, fill in the price, category, and description, then tap Publish. If listing approval is turned on, it goes live once an admin approves it — you can check the status any time from My Listings on your Profile.',
  },
  {
    id: 'pricing-currency',
    question: 'How does pricing/currency work?',
    answer:
      "You can list and search in either NLe (New Leone) or US Dollars — pick the currency when you set your price. Prices aren't automatically converted between currencies, so filtering and sorting by price only compares listings in the same currency (that's why Search's budget field and price sort only turn on once you've picked NLe or $, not \"All\").",
  },
  {
    id: 'listing-boost',
    question: 'What is a Listing Boost?',
    answer:
      'A Boost ("Feature This Listing") puts your listing at the top of Home and Search with a PREMIUM badge for 7 days. You can buy one for a specific listing from My Listings on your Profile. If you list often, the Agent Subscription keeps all of your current and future listings featured for 30 days instead of boosting them one at a time — see Plans & Pricing for both.',
  },
  {
    id: 'verified-agent',
    question: 'How do I become a Verified Agent?',
    answer:
      'From Plans & Pricing, request a Verified Agent Review. An admin reviews your account and, separately, agrees the review fee with you directly — there\'s no in-app checkout for this one. Once approved, your profile and listings show a Verified badge, which helps buyers trust you.',
  },
  {
    id: 'contact-agent',
    question: 'How do I contact an agent?',
    answer:
      'Open any listing and tap the message button near the price — that starts a real-time chat with the agent or owner right in the app, no phone number needed up front. You can see all your conversations from the Messages tab, including unread counts and whether the other person is online.',
  },
  {
    id: 'edit-delete-listing',
    question: 'How do I edit or remove a listing?',
    answer:
      'Go to Profile → My Listings, tap the listing you want to change, and choose Edit to update details or photos. If it\'s been rented or sold, mark it as such instead of deleting it — that keeps your listing history while taking it out of active search results. You can delete a listing entirely from the same screen.',
  },
  {
    id: 'report-listing',
    question: 'How do I report a listing?',
    answer:
      "Open the listing and tap \"Report this listing\" near the bottom (you won't see this on your own listings). It's suspended immediately and the owner's account is flagged for an admin to review.",
  },
];
