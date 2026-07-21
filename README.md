# Easyfen

A mobile app for finding and listing properties, hotels, and local services in Freetown, Sierra Leone. Built with React Native (Expo) and Supabase.

## What's in the app

- **Home** — browse properties, hotels, and services; filter by For Rent / For Sale / Land / Daily-Hourly; save favorites with the heart icon
- **Search** — search everything at once by name, place, or trade, with an NLE budget filter and price sorting; hire service providers directly
- **Add Listing** — post a property, hotel, or service with up to 10 photos
- **Messages** — real-time chat between buyers, agents, and service providers, with online status and unread counts
- **Profile** — edit your details, choose your role (agent, service provider, hotel owner), manage and delete your listings

Sign-in is email + password. Browsing works without an account; posting, favoriting, and messaging require one.

## Where the data lives

Everything is stored in a Supabase project called **Easyfen**:

- Database tables: `profiles`, `listings`, `hotels`, `services`, `favorites`, `conversations`, `messages`
- Photos: Supabase Storage, bucket `listing-photos`
- Chat updates arrive live via Supabase Realtime
- Row Level Security is enabled everywhere: anyone can read public listings, but users can only create/edit/delete their own content
- The `is_premium` and `is_verified` badges are plain database columns — toggle them by hand in the Supabase dashboard (Table Editor) until a payments feature exists

## Running the app for development

You need [Node.js](https://nodejs.org) (LTS) installed.

```bash
npm install
cp .env.example .env   # then fill in the two values (see below)
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (same WiFi network required).

The two values in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL` — the Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the Supabase publishable key

Both are visible in the Supabase dashboard under Project Settings → API, and both also appear in `eas.json` (they are client-side values, safe to be public; data protection comes from Row Level Security, not from hiding these).

## Building an installable Android APK

Builds run automatically through GitHub Actions + Expo's EAS Build service — no computer needed:

1. On GitHub, open the **Actions** tab → **Build Android APK** → **Run workflow**
2. The job finishes in ~2 minutes and prints a link to the build page on expo.dev in its Summary
3. Open that link on the phone; when the build says **Finished** (15–60 min on the free tier), tap **Install**

The workflow needs one repository secret: `EXPO_TOKEN` — an access token from [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens). If that token is ever revoked, create a new one and update the secret, or builds will stop working.
