import { useState, type ReactNode } from 'react';
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
import { formatPrice } from '../../lib/format';
import { PhotoPicker } from '../../components/PhotoPicker';
import { SelectField, type SelectOption } from '../../components/SelectField';
import { CurrencySegmentedControl } from '../../components/CurrencySegmentedControl';
import { StepProgress } from '../../components/StepProgress';
import type { ListingCategory, ListingCurrency } from '../../lib/types';

const FORM_STEPS = ['Photos', 'Details', 'Review', 'Publish'];

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

export default function AddListingScreen() {
  const insets = useSafeAreaInsets();
  const tabBarGap = useTabBarGap();
  const { session, profile } = useAuth();

  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<ListingCurrency>('NLE');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [submitting, setSubmitting] = useState(false);

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

  const requiredFieldsFilled =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    !Number.isNaN(Number(price)) &&
    Number(price) > 0 &&
    location.trim().length > 0 &&
    description.trim().length > 0 &&
    category !== null;

  // Reflects real progress through the form (it's still one continuous
  // scroll, not a paginated wizard) so the indicator means something
  // rather than just decorating the top of the screen.
  const hasStartedDetails =
    title.trim().length > 0 ||
    price.trim().length > 0 ||
    location.trim().length > 0 ||
    description.trim().length > 0 ||
    bedrooms.trim().length > 0 ||
    category !== null;
  const currentStep = submitting ? 3 : requiredFieldsFilled ? 2 : photos.length > 0 || hasStartedDetails ? 1 : 0;

  const priceNumber = Number(price);
  const pricePreview =
    price.trim().length > 0 && !Number.isNaN(priceNumber) && priceNumber > 0
      ? formatPrice(priceNumber, currency, null)
      : null;

  function resetForm() {
    setPhotos([]);
    setTitle('');
    setPrice('');
    setCurrency('NLE');
    setLocation('');
    setDescription('');
    setBedrooms('');
    setCategory(null);
    setRateUnit('hour');
  }

  async function handlePublish() {
    if (!requiredFieldsFilled || submitting || !session) return;
    setSubmitting(true);

    const priceValue = Number(price);
    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
    const cleanLocation = sanitizeText(location);

    const { data, error } = await supabase
      .from('listings')
      .insert({
        owner_id: session.user.id,
        title: cleanTitle,
        description: cleanDescription,
        category: category!,
        price: priceValue,
        currency,
        price_unit: category === 'daily_hourly' ? rateUnit : null,
        location: cleanLocation,
        bedrooms: bedrooms.trim() ? Number(bedrooms) : null,
        photos,
      })
      .select('moderation_status')
      .single();

    setSubmitting(false);

    if (error) {
      appAlert('Could not publish listing', friendlyErrorMessage(error));
      return;
    }

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
      appAlert('Listing published', 'Your listing is now live on Easyfen.', [
        { text: 'View on Home', onPress: () => router.push('/') },
      ]);
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
        <Text style={styles.subheading}>Get your property in front of thousands.</Text>

        <StepProgress steps={FORM_STEPS} currentIndex={currentStep} />

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Photos</Text>
          </View>
          <PhotoPicker photos={photos} onChange={setPhotos} userId={session.user.id} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Details</Text>
          </View>

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
            <Text style={styles.currencyHelper}>Select currency, then enter your price.</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              {pricePreview && <Text style={styles.pricePreview}>{pricePreview}</Text>}
            </View>
            <Field label="Neighborhood" style={styles.flex1}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Goderich"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </Field>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <SelectField
                label="Property Type"
                placeholder="Select type"
                value={category}
                options={categoryOptions}
                onChange={setCategory}
              />
            </View>
            <Field label="Bedrooms" style={styles.flex1}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                placeholderTextColor={colors.textMuted}
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="number-pad"
              />
            </Field>
          </View>

          {category === 'daily_hourly' && (
            <SelectField
              label="Rate"
              placeholder="Select rate"
              value={rateUnit}
              options={rateUnitOptions}
              onChange={setRateUnit}
            />
          )}

          <Field label="Description">
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
          </Field>
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
  // Screen-level heading -- Poppins, like every other section/page title in
  // the app -- but this form stays in the flattened/functional tier (no
  // elevation, no bold-surface treatment): the card below is bordered, not
  // shadowed, and nothing here competes with the listing grid's cards.
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { ...type.labelStrong, color: colors.accent },
  sectionTitle: { ...type.screenTitle, fontSize: fontSize.md, color: colors.textPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  field: {},
  // Uppercase + letter-spacing kept as-is here -- this is a pre-existing
  // form-field-label convention distinct from the badge "AI-app tell" this
  // pass isn't re-litigating; only the font family changes.
  fieldLabel: {
    ...type.labelStrong,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    ...type.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 90 },
  currencyField: { marginBottom: 2 },
  currencyHelper: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
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
