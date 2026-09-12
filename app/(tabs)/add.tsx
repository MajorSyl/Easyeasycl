import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { friendlyErrorMessage } from '../../lib/errors';
import { appAlert } from '../../lib/alert';
import { notifyListingsChanged } from '../../lib/listings-cache-bus';
import { sanitizeText } from '../../lib/sanitize';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { type } from '../../constants/typography';
import { formatPrice, parsePriceInput, sanitizePriceInput } from '../../lib/format';
import { PhotoPicker } from '../../components/PhotoPicker';
import { SelectField, type SelectOption } from '../../components/SelectField';
import { LocationFields } from '../../components/LocationFields';
import { CurrencySegmentedControl } from '../../components/CurrencySegmentedControl';
import { coordsForCity } from '../../constants/locations';
import { AMENITIES } from '../../constants/amenities';
import { generateListingDescription } from '../../constants/description-templates';
import type { LocationMatch } from '../../lib/location-match';
import type { ListingCategory, ListingCurrency } from '../../lib/types';

const categoryOptions: SelectOption<ListingCategory>[] = [
  { value: 'for_rent', label: 'For Rent' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'land', label: 'Land' },
  { value: 'daily_hourly', label: 'Daily/Hourly' },
];

const rateUnitOptions: SelectOption<'hour' | 'day'>[] = [
  { value: 'hour', label: 'Per Hour' },
  { value: 'day', label: 'Per Day' },
];

// Everything that gets persisted as a local draft, so a dropped connection
// or an accidental tab switch never loses what an agent already typed --
// see the draft effect below. Deliberately excludes nothing: even the
// already-uploaded `photos` URLs are worth keeping, since re-picking them
// would mean re-uploading.
type DraftState = {
  title: string;
  price: string;
  priceNote: string;
  currency: ListingCurrency;
  location: string;
  bedrooms: string;
  amenities: string[];
  category: ListingCategory | null;
  rateUnit: 'hour' | 'day';
  description: string;
  photos: string[];
};

function draftKey(userId: string) {
  return `easyfen:add-listing-draft:${userId}`;
}

export default function AddListingScreen() {
  const insets = useSafeAreaInsets();
  const tabBarGap = useTabBarGap();
  const { session } = useAuth();

  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [currency, setCurrency] = useState<ListingCurrency>('NLE');
  const [location, setLocation] = useState('');
  const [locationMatch, setLocationMatch] = useState<LocationMatch | null>(null);
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [submitting, setSubmitting] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);

  // Guards against (a) saving a just-restored draft straight back to
  // storage as if it were a fresh edit, and (b) restoring more than once if
  // this effect's dependency (the user id) is stable across re-renders.
  const restoredForUserRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before resetForm() blanks every field, so the save effect's
  // very next run (triggered by those blanked fields) skips once instead of
  // writing an empty draft back over the removeItem() that just ran.
  const skipNextSaveRef = useRef(false);

  // Restore a local draft the moment we know who's signed in. Only ever
  // reads -- if there's nothing saved, the form just starts blank as usual.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || restoredForUserRef.current === userId) return;
    restoredForUserRef.current = userId;
    AsyncStorage.getItem(draftKey(userId))
      .then((raw) => {
        if (!raw) return;
        const draft = JSON.parse(raw) as Partial<DraftState>;
        if (draft.title) setTitle(draft.title);
        if (draft.price) setPrice(draft.price);
        if (draft.priceNote) setPriceNote(draft.priceNote);
        if (draft.currency) setCurrency(draft.currency);
        if (draft.location) setLocation(draft.location);
        if (draft.bedrooms) setBedrooms(draft.bedrooms);
        if (draft.amenities?.length) setAmenities(draft.amenities);
        if (draft.category) setCategory(draft.category);
        if (draft.rateUnit) setRateUnit(draft.rateUnit);
        if (draft.description) setDescription(draft.description);
        if (draft.photos?.length) setPhotos(draft.photos);
      })
      .catch(() => {
        // A corrupt or unreadable draft just means starting fresh -- never
        // block the form over it.
      });
  }, [session?.user.id]);

  // Debounced auto-save -- waits for a pause in typing rather than writing
  // to storage on every keystroke. Skipped entirely until the restore pass
  // above has run, so it can't immediately overwrite a draft with the blank
  // initial state on first mount.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || restoredForUserRef.current !== userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      const draft: DraftState = {
        title,
        price,
        priceNote,
        currency,
        location,
        bedrooms,
        amenities,
        category,
        rateUnit,
        description,
        photos,
      };
      AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft)).catch(() => {});
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, price, priceNote, currency, location, bedrooms, amenities, category, rateUnit, description, photos, session?.user.id]);

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Log in to post a listing</Text>
        <Text style={styles.loggedOutSubtitle}>You'll need an Easyfen account to publish a property listing.</Text>
        <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
          <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
        </Pressable>
      </View>
    );
  }

  // Only Title and Price are required -- everything else (Location,
  // Property Type, Bedrooms, Amenities, Description, even Photos) can be
  // added later by editing the listing. The goal is getting a listing live
  // in well under two minutes; richness is a post-publish nudge, not a
  // pre-publish gate.
  const requiredFieldsFilled =
    title.trim().length > 0 && price.trim().length > 0 && !Number.isNaN(parsePriceInput(price)) && parsePriceInput(price) > 0;

  const priceNumber = parsePriceInput(price);
  const pricePreview =
    price.trim().length > 0 && !Number.isNaN(priceNumber) && priceNumber > 0
      ? formatPrice(priceNumber, currency, null)
      : null;

  function resetForm() {
    setPhotos([]);
    setTitle('');
    setPrice('');
    setPriceNote('');
    setCurrency('NLE');
    setLocation('');
    setLocationMatch(null);
    setDescription('');
    setBedrooms('');
    setAmenities([]);
    setCategory(null);
    setRateUnit('hour');
    setMoreDetailsOpen(false);
    skipNextSaveRef.current = true;
    if (session?.user.id) AsyncStorage.removeItem(draftKey(session.user.id)).catch(() => {});
  }

  function toggleAmenity(amenity: string) {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((a) => a !== amenity) : [...current, amenity]
    );
  }

  function handleGenerateDescription() {
    setDescription(
      generateListingDescription({
        category,
        bedrooms,
        city: locationMatch?.city ?? '',
        location,
        price: price.trim() ? parsePriceInput(price) : null,
        currency,
        priceUnit: category === 'daily_hourly' ? rateUnit : null,
        priceNote,
        amenities,
      })
    );
  }

  async function handlePublish() {
    if (!requiredFieldsFilled || submitting || !session) return;
    setSubmitting(true);

    const priceValue = parsePriceInput(price);
    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
    const cleanLocation = sanitizeText(location);
    const cleanCity = sanitizeText(locationMatch?.city ?? '');
    // No geocoding service is wired into this app -- fall back to the
    // city's approximate town-centroid so the listing still has *some*
    // coordinate to sort by in "Near Me" until it's ever set precisely.
    const cityCoords = coordsForCity(cleanCity);

    const { data, error } = await supabase
      .from('listings')
      .insert({
        owner_id: session.user.id,
        title: cleanTitle,
        description: cleanDescription || null,
        category: category ?? 'for_rent',
        price: priceValue,
        currency,
        price_unit: category === 'daily_hourly' ? rateUnit : null,
        price_note: priceNote.trim() ? sanitizeText(priceNote) : null,
        district: locationMatch?.district ?? '',
        city: cleanCity,
        location: cleanLocation,
        latitude: cityCoords?.lat ?? null,
        longitude: cityCoords?.lng ?? null,
        // Land has no bedrooms, regardless of whatever's left in the field
        // from before the agent switched Property Type to Land -- the field
        // is hidden for Land, so there's no way to clear it by hand.
        bedrooms: category === 'land' ? null : bedrooms.trim() ? Number(bedrooms) : null,
        photos,
      })
      .select('id, moderation_status')
      .single();

    setSubmitting(false);

    if (error) {
      // Surfaced to the console (not the user -- lib/errors.ts deliberately
      // never shows raw SQL/API text) so a real failure can be diagnosed
      // from a bug report instead of guessed at from "something went wrong."
      console.error('Publish listing failed:', error);
      appAlert('Could not publish listing', friendlyErrorMessage(error));
      return;
    }

    // The Location text didn't match any known city/town -- the listing
    // still saved fine with district/city left blank, but flag it so an
    // admin can add the area to constants/locations.ts and this stops
    // happening for future listings from the same area. Fire-and-forget:
    // never blocks or fails the publish that already succeeded above.
    if (!locationMatch && data?.id) {
      supabase.from('unmatched_locations').insert({ listing_id: data.id, location_text: cleanLocation });
    }

    const listingId = data?.id;
    resetForm();
    notifyListingsChanged();
    // moderation_status is set server-side (see the listings_set_moderation_status
    // trigger) based on the admin's current approval-gate setting — never
    // assumed client-side, since the client has no reliable way to know
    // which was in effect at the moment this insert landed.
    if (data?.moderation_status === 'pending') {
      appAlert(
        'Submitted for review',
        "Your listing will go live once an admin approves it. You can check its status from My Listings.",
        [{ text: 'OK', onPress: () => router.push('/profile') }]
      );
    } else {
      appAlert(
        '🎉 Your listing is live!',
        'Want more views? Add photos, a description, or more details anytime.',
        [
          ...(listingId
            ? [{ text: 'Add More Details', onPress: () => router.push(`/edit/listing/${listingId}`) }]
            : []),
          { text: 'View Listing', onPress: () => (listingId ? router.push(`/listing/${listingId}`) : router.push('/')) },
        ]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarGap + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Create Listing</Text>
        <Text style={styles.subheading}>List your property in under two minutes.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photos (optional)</Text>
          <PhotoPicker photos={photos} onChange={setPhotos} userId={session.user.id} />
        </View>

        <View style={styles.card}>
          <Field label="Title">
            <TextInput
              style={styles.input}
              placeholder="e.g. Modern Apartment in Lumley"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          <View style={styles.currencyField}>
            <Text style={styles.fieldLabel}>Currency</Text>
            <CurrencySegmentedControl value={currency} onChange={setCurrency} />
          </View>

          <Field label="Price">
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={price}
              onChangeText={(text) => setPrice(sanitizePriceInput(text))}
              keyboardType="decimal-pad"
              inputMode="numeric"
            />
            {pricePreview && <Text style={styles.pricePreview}>{pricePreview}</Text>}
          </Field>

          <LocationFields location={location} onLocationChange={setLocation} onResolvedChange={setLocationMatch} />

          <SelectField
            label="Property Type (optional)"
            placeholder="Select type"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
          />

          <Pressable
            style={styles.moreDetailsToggle}
            onPress={() => setMoreDetailsOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: moreDetailsOpen }}
          >
            <Text style={styles.moreDetailsToggleText}>Add more details (optional)</Text>
            <Ionicons
              name={moreDetailsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.accent}
            />
          </Pressable>

          {moreDetailsOpen && (
            <View style={styles.moreDetails}>
              {category !== 'land' && (
                <Field label="Bedrooms">
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 3"
                    placeholderTextColor={colors.textMuted}
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    keyboardType="number-pad"
                    inputMode="numeric"
                  />
                </Field>
              )}

              <Field label="Price Note (optional)">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. per town lot, per acre, negotiable"
                  placeholderTextColor={colors.textMuted}
                  value={priceNote}
                  onChangeText={setPriceNote}
                />
              </Field>

              {category === 'daily_hourly' && (
                <SelectField
                  label="Rate"
                  placeholder="Select rate"
                  value={rateUnit}
                  options={rateUnitOptions}
                  onChange={setRateUnit}
                />
              )}

              {category !== 'land' && (
                <View>
                  <Text style={styles.fieldLabel}>Amenities (optional)</Text>
                  <View style={styles.amenityWrap}>
                    {AMENITIES.map((amenity) => {
                      const active = amenities.includes(amenity);
                      return (
                        <Pressable
                          key={amenity}
                          style={[styles.amenityChip, active && styles.amenityChipActive]}
                          onPress={() => toggleAmenity(amenity)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                        >
                          {active && <Text style={styles.amenityCheck}>✓ </Text>}
                          <Text style={[styles.amenityChipText, active && styles.amenityChipTextActive]}>{amenity}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.descriptionHeader}>
                <Text style={styles.fieldLabel}>Description (optional)</Text>
                <Pressable
                  style={styles.generateButton}
                  onPress={handleGenerateDescription}
                  accessibilityRole="button"
                  accessibilityLabel="Generate a draft description from the fields above"
                >
                  <Text style={styles.generateButtonText}>✨ Generate description</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your property in detail..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        </View>

        <Pressable
          style={[styles.publishButton, !requiredFieldsFilled && styles.publishButtonDisabled]}
          disabled={!requiredFieldsFilled || submitting}
          onPress={handlePublish}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.publishButtonText, !requiredFieldsFilled && styles.publishButtonTextDisabled]}>
              Publish Listing
            </Text>
          )}
        </Pressable>
        <Text style={styles.terms}>
          By posting, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/guidelines')}>
            Community Guidelines
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  loggedOutTitle: { ...type.screenTitle, fontSize: fontSize.xl, color: colors.textPrimary, marginBottom: spacing.xs },
  loggedOutSubtitle: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  loginButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loginButtonText: { ...type.button, fontSize: fontSize.md, color: '#fff' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...type.sectionTitle, fontSize: fontSize.xxl, color: colors.textPrimary },
  subheading: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...type.screenTitle, fontSize: fontSize.md, color: colors.textPrimary },
  field: {},
  fieldLabel: {
    ...type.labelStrong,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  // Plain white/card, not the page's blue background -- a form field the
  // user is actively typing into needs to read as its own clearly-bounded
  // surface, not a same-toned patch of page.
  input: {
    ...type.body,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 90 },
  moreDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  moreDetailsToggleText: { ...type.labelStrong, fontSize: fontSize.sm, color: colors.accent },
  moreDetails: { gap: spacing.md },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  amenityChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  amenityCheck: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },
  amenityChipText: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary },
  amenityChipTextActive: { color: colors.accentStrong },
  descriptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  generateButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  generateButtonText: { ...type.labelStrong, fontSize: fontSize.xs, color: colors.accentStrong },
  currencyField: { marginBottom: 2 },
  pricePreview: { ...type.secondary, fontSize: fontSize.xs, color: colors.accentStrong, marginTop: 6 },
  publishButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  publishButtonDisabled: { backgroundColor: colors.border },
  publishButtonText: { ...type.button, fontSize: fontSize.md, color: '#fff' },
  publishButtonTextDisabled: { color: colors.textMuted },
  terms: { ...type.secondary, textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
  // accentStrong, not accent -- this link sits directly on `background`,
  // where plain accent only clears 4.33:1 (fails AA's 4.5:1 text floor).
  termsLink: { color: colors.accentStrong, textDecorationLine: 'underline' },
});
