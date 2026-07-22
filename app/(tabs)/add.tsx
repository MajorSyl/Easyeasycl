import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { PhotoPicker } from '../../components/PhotoPicker';
import { SelectField, type SelectOption } from '../../components/SelectField';
import type { ListingCategory } from '../../lib/types';

type ListingType = 'property' | 'hotel' | 'service';

const typeOptions: { value: ListingType; label: string }[] = [
  { value: 'property', label: 'Property' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'service', label: 'Service' },
];

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
  const { session, profile } = useAuth();

  const [listingType, setListingType] = useState<ListingType>('property');
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [serviceCategory, setServiceCategory] = useState('');
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Log in to post a listing</Text>
        <Text style={styles.loggedOutSubtitle}>You'll need an Easyfen account to publish properties, hotels, or services.</Text>
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
    (listingType !== 'property' || category !== null) &&
    (listingType !== 'service' || serviceCategory.trim().length > 0);

  function resetForm() {
    setPhotos([]);
    setTitle('');
    setPrice('');
    setLocation('');
    setDescription('');
    setBedrooms('');
    setCategory(null);
    setServiceCategory('');
    setRateUnit('hour');
  }

  async function handlePublish() {
    if (!requiredFieldsFilled || submitting || !session) return;
    setSubmitting(true);

    const priceValue = Number(price);
    let error;

    if (listingType === 'property') {
      ({ error } = await supabase.from('listings').insert({
        owner_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        category: category!,
        price: priceValue,
        price_unit: category === 'daily_hourly' ? rateUnit : null,
        location: location.trim(),
        bedrooms: bedrooms.trim() ? Number(bedrooms) : null,
        photos,
      }));
    } else if (listingType === 'hotel') {
      ({ error } = await supabase.from('hotels').insert({
        owner_id: session.user.id,
        name: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: priceValue,
        rate_unit: 'night',
        photos,
      }));
    } else {
      ({ error } = await supabase.from('services').insert({
        owner_id: session.user.id,
        business_name: title.trim(),
        category: serviceCategory.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: priceValue,
        rate_unit: rateUnit,
        photos,
      }));
    }

    setSubmitting(false);

    if (error) {
      Alert.alert('Could not publish listing', friendlyErrorMessage(error));
      return;
    }

    resetForm();
    Alert.alert('Listing published', 'Your listing is now live on Easyfen.', [
      { text: 'View on Home', onPress: () => router.push('/') },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Create Listing</Text>
        <Text style={styles.subheading}>Get your property or service in front of thousands.</Text>

        <View style={styles.typeTabs}>
          {typeOptions.map((option) => {
            const active = option.value === listingType;
            return (
              <Pressable
                key={option.value}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => setListingType(option.value)}
              >
                <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

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
              placeholder={listingType === 'property' ? 'e.g. Modern Apartment in Lumley' : listingType === 'hotel' ? 'e.g. Aberdeen Beach Hotel' : 'e.g. John Doe Plumbing'}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          <View style={styles.row}>
            <Field label={`Price (NLE)`} style={styles.flex1}>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="Location" style={styles.flex1}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Goderich"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </Field>
          </View>

          {listingType === 'property' && (
            <View style={styles.row}>
              <View style={styles.flex1}>
                <SelectField
                  label="Category"
                  placeholder="Select category"
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
          )}

          {listingType === 'property' && category === 'daily_hourly' && (
            <SelectField
              label="Rate"
              placeholder="Select rate"
              value={rateUnit}
              options={rateUnitOptions}
              onChange={setRateUnit}
            />
          )}

          {listingType === 'service' && (
            <>
              <Field label="Service Category">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Plumbing, Cleaning, Electrical"
                  placeholderTextColor={colors.textMuted}
                  value={serviceCategory}
                  onChangeText={setServiceCategory}
                />
              </Field>
              <SelectField
                label="Rate"
                placeholder="Select rate"
                value={rateUnit}
                options={rateUnitOptions}
                onChange={setRateUnit}
              />
            </>
          )}

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                listingType === 'property'
                  ? 'Describe your property in detail...'
                  : listingType === 'hotel'
                    ? 'Describe your hotel in detail...'
                    : 'Describe your service in detail...'
              }
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
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishButtonText}>Publish Listing</Text>}
        </Pressable>
        <Text style={styles.terms}>By posting, you agree to our Community Guidelines</Text>
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
  loggedOutTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  loggedOutSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  loginButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loginButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  subheading: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  typeTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeTabActive: { backgroundColor: colors.accentSoft },
  typeTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  typeTabTextActive: { color: colors.accent },
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
  stepBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.accent },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  field: {},
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
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
  publishButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  publishButtonDisabled: { backgroundColor: colors.border },
  publishButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
