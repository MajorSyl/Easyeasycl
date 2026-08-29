import { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth-context';
import { friendlyErrorMessage } from '../../../lib/errors';
import { appAlert } from '../../../lib/alert';
import { notifyListingsChanged } from '../../../lib/listings-cache-bus';
import { sanitizeText } from '../../../lib/sanitize';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';
import { PhotoPicker } from '../../../components/PhotoPicker';
import { SelectField, type SelectOption } from '../../../components/SelectField';
import { CurrencyToggle } from '../../../components/CurrencyToggle';
import type { ListingCategory, ListingCurrency } from '../../../lib/types';

type Kind = 'listing' | 'hotel' | 'service';

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

export default function EditListingScreen() {
  const insets = useSafeAreaInsets();
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<ListingCurrency>('NLE');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [serviceCategory, setServiceCategory] = useState('');
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => {
    if (!id || !kind || !session) return;
    const table = kind === 'listing' ? 'listings' : kind === 'hotel' ? 'hotels' : 'services';
    supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setLoading(false);
          return;
        }
        if (data.owner_id !== session.user.id) {
          setNotOwner(true);
          setLoading(false);
          return;
        }
        setTitle(data.title ?? data.name ?? data.business_name ?? '');
        setPrice(String(data.price ?? data.rate ?? ''));
        if (kind === 'listing' && (data.currency === 'NLE' || data.currency === 'USD')) setCurrency(data.currency);
        setLocation(data.location ?? '');
        setDescription(data.description ?? '');
        setBedrooms(data.bedrooms != null ? String(data.bedrooms) : '');
        setCategory((data.category as ListingCategory) ?? null);
        if (kind === 'service') setServiceCategory(data.category ?? '');
        if (data.price_unit === 'hour' || data.price_unit === 'day') setRateUnit(data.price_unit);
        if (data.rate_unit === 'hour' || data.rate_unit === 'day') setRateUnit(data.rate_unit);
        setPhotos(data.photos ?? []);
        setLoading(false);
      });
  }, [id, kind]);

  const canSave =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    !Number.isNaN(Number(price)) &&
    Number(price) > 0 &&
    location.trim().length > 0;

  async function handleSave() {
    if (!canSave || saving || !session || !id) return;
    setSaving(true);
    const priceValue = Number(price);
    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
    const cleanLocation = sanitizeText(location);
    const cleanServiceCategory = sanitizeText(serviceCategory);
    let error;

    if (kind === 'listing') {
      ({ error } = await supabase
        .from('listings')
        .update({
          title: cleanTitle,
          description: cleanDescription || null,
          category: category ?? undefined,
          price: priceValue,
          currency,
          price_unit: category === 'daily_hourly' ? rateUnit : null,
          location: cleanLocation,
          bedrooms: bedrooms.trim() ? Number(bedrooms) : null,
          photos,
        })
        .eq('id', id)
        .eq('owner_id', session.user.id));
    } else if (kind === 'hotel') {
      ({ error } = await supabase
        .from('hotels')
        .update({
          name: cleanTitle,
          description: cleanDescription || null,
          location: cleanLocation,
          rate: priceValue,
          photos,
        })
        .eq('id', id)
        .eq('owner_id', session.user.id));
    } else {
      ({ error } = await supabase
        .from('services')
        .update({
          business_name: cleanTitle,
          category: cleanServiceCategory || undefined,
          description: cleanDescription || null,
          location: cleanLocation,
          rate: priceValue,
          rate_unit: rateUnit,
          photos,
        })
        .eq('id', id)
        .eq('owner_id', session.user.id));
    }

    setSaving(false);
    if (error) {
      appAlert('Could not save changes', friendlyErrorMessage(error));
      return;
    }
    notifyListingsChanged();
    router.back();
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.mutedText}>Log in to edit your listings.</Text>
      </View>
    );
  }

  if (notOwner) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.mutedText}>You can only edit listings you own.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.heading}>Edit Listing</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <PhotoPicker photos={photos} onChange={setPhotos} userId={session.user.id} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>

          <Field label={kind === 'service' ? 'Business Name' : kind === 'hotel' ? 'Hotel Name' : 'Title'}>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />
          </Field>

          <View style={styles.row}>
            {kind === 'listing' ? (
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Price</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.currencyToggleWrap}>
                    <CurrencyToggle value={currency} onChange={setCurrency} />
                  </View>
                </View>
              </View>
            ) : (
              <Field label="Price (NLE)" style={styles.flex1}>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
            )}
            <Field label="Location" style={styles.flex1}>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor={colors.textMuted} />
            </Field>
          </View>

          {kind === 'listing' && (
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
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
            </View>
          )}

          {kind === 'listing' && category === 'daily_hourly' && (
            <SelectField label="Rate" placeholder="Select rate" value={rateUnit} options={rateUnitOptions} onChange={setRateUnit} />
          )}

          {kind === 'service' && (
            <>
              <Field label="Service Category">
                <TextInput
                  style={styles.input}
                  value={serviceCategory}
                  onChangeText={setServiceCategory}
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
              <SelectField label="Rate" placeholder="Select rate" value={rateUnit} options={rateUnitOptions} onChange={setRateUnit} />
            </>
          )}

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
        </View>

        <Pressable style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} disabled={!canSave || saving} onPress={handleSave}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  mutedText: { color: colors.textSecondary, fontSize: fontSize.md },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  heading: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
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
  priceRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  priceInput: { flex: 1 },
  currencyToggleWrap: { width: 84 },
  saveButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});
