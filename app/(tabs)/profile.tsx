import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { formatPrice, initialsFor, roleLabel } from '../../lib/format';
import { SelectField, type SelectOption } from '../../components/SelectField';
import type { Profile } from '../../lib/auth-context';

type ListingKind = 'listing' | 'hotel' | 'service';

type MyListing = {
  kind: ListingKind;
  id: string;
  title: string;
  priceLabel: string;
  createdAt: string;
};

const roleOptions: SelectOption<Profile['role']>[] = [
  { value: 'user', label: 'Regular User' },
  { value: 'agent', label: 'Agent' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'hotel_owner', label: 'Hotel Owner' },
];

const kindLabels: Record<ListingKind, string> = {
  listing: 'Property',
  hotel: 'Hotel',
  service: 'Service',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Profile['role']>('user');
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMyListings = useCallback(async () => {
    if (!session) {
      setMyListings([]);
      setLoadingListings(false);
      return;
    }
    const uid = session.user.id;
    const [{ data: listings }, { data: hotels }, { data: services }] = await Promise.all([
      supabase.from('listings').select('id, title, price, currency, price_unit, created_at').eq('owner_id', uid),
      supabase.from('hotels').select('id, name, rate, currency, rate_unit, created_at').eq('owner_id', uid),
      supabase.from('services').select('id, business_name, rate, currency, rate_unit, created_at').eq('owner_id', uid),
    ]);

    const combined: MyListing[] = [
      ...((listings ?? []) as any[]).map((item) => ({
        kind: 'listing' as const,
        id: item.id,
        title: item.title,
        priceLabel: formatPrice(item.price, item.currency, item.price_unit),
        createdAt: item.created_at,
      })),
      ...((hotels ?? []) as any[]).map((item) => ({
        kind: 'hotel' as const,
        id: item.id,
        title: item.name,
        priceLabel: formatPrice(item.rate, item.currency, item.rate_unit),
        createdAt: item.created_at,
      })),
      ...((services ?? []) as any[]).map((item) => ({
        kind: 'service' as const,
        id: item.id,
        title: item.business_name,
        priceLabel: formatPrice(item.rate, item.currency, item.rate_unit),
        createdAt: item.created_at,
      })),
    ];

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyListings(combined);
    setLoadingListings(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadMyListings();
    }, [loadMyListings])
  );

  function startEditing() {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setRole(profile?.role ?? 'user');
    setBusinessName(profile?.business_name ?? '');
    setEditing(true);
  }

  async function saveProfile() {
    if (!session || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        role,
        business_name: role === 'user' ? null : businessName.trim() || null,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
    setEditing(false);
  }

  function confirmDelete(item: MyListing) {
    Alert.alert('Delete listing', `Remove "${item.title}" from Easyfen? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteListing(item) },
    ]);
  }

  async function deleteListing(item: MyListing) {
    const table = item.kind === 'listing' ? 'listings' : item.kind === 'hotel' ? 'hotels' : 'services';
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (error) {
      Alert.alert('Could not delete', error.message);
      return;
    }
    setMyListings((prev) => prev.filter((l) => l.id !== item.id));
  }

  async function handleLogOut() {
    await signOut();
    router.replace('/');
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Log in to view your profile</Text>
        <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
          <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      data={editing ? [] : myListings}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      ListHeaderComponent={
        <>
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(profile?.full_name ?? null)}</Text>
            </View>
            {!editing ? (
              <>
                <Text style={styles.name}>{profile?.full_name ?? 'Easyfen User'}</Text>
                {roleLabel(profile?.role) && <Text style={styles.roleBadge}>{roleLabel(profile?.role)}</Text>}
                {profile?.business_name && <Text style={styles.businessName}>{profile.business_name}</Text>}
                <Text style={styles.contactText}>{session.user.email}</Text>
                {profile?.phone && <Text style={styles.contactText}>{profile.phone}</Text>}

                <Pressable style={styles.editButton} onPress={startEditing}>
                  <Ionicons name="pencil-outline" size={14} color={colors.accent} />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.editForm}>
                <Field label="Full Name">
                  <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.textMuted} />
                </Field>
                <Field label="Phone">
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +232 76 000000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </Field>
                <SelectField label="I am a..." placeholder="Select role" value={role} options={roleOptions} onChange={setRole} />
                {role !== 'user' && (
                  <Field label="Business Name">
                    <TextInput
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="e.g. Test Realty"
                      placeholderTextColor={colors.textMuted}
                    />
                  </Field>
                )}
                <View style={styles.editActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setEditing(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={saveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {!editing && (
            <Pressable style={styles.savedRow} onPress={() => router.push('/favorites')}>
              <Ionicons name="heart" size={18} color={colors.favoriteIcon} />
              <Text style={styles.savedRowText}>Saved</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          {!editing && (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Listings</Text>
              {loadingListings && <ActivityIndicator size="small" color={colors.accent} />}
            </View>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.listingRow}>
          <View style={styles.listingBody}>
            <Text style={styles.listingKind}>{kindLabels[item.kind]}</Text>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.listingPrice}>{item.priceLabel}</Text>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        !editing && !loadingListings ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>You haven't posted anything yet</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        !editing ? (
          <Pressable style={styles.logoutButton} onPress={handleLogOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        ) : null
      }
    />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  loggedOutTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  loginButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loginButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.accent },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  roleBadge: { fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.4, marginTop: 4 },
  businessName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  contactText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  editButtonText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
  editForm: { width: '100%', gap: spacing.md },
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
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.textSecondary, fontWeight: '600' },
  saveButton: { flex: 1, borderRadius: radius.md, backgroundColor: colors.accent, paddingVertical: spacing.md, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  savedRowText: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listingBody: { flex: 1 },
  listingKind: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  listingTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  listingPrice: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600', marginTop: 2 },
  deleteButton: { padding: spacing.sm },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },
});
