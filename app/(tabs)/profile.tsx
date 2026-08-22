import { useCallback, useRef, useState, type ReactNode } from 'react';
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { friendlyErrorMessage } from '../../lib/errors';
import { notifyListingsChanged } from '../../lib/listings-cache-bus';
import { uploadAvatar } from '../../lib/upload';
import { sanitizeText } from '../../lib/sanitize';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { daysSince, formatPrice, initialsFor, roleLabel, verificationBadgeLabel } from '../../lib/format';
import { SelectField, type SelectOption } from '../../components/SelectField';
import type { Profile } from '../../lib/auth-context';

type ListingKind = 'listing';

type MyListing = {
  kind: ListingKind;
  id: string;
  title: string;
  priceLabel: string;
  createdAt: string;
  lastConfirmedAt: string;
  isActive: boolean;
};

const STALE_AFTER_DAYS = 30;

const roleOptions: SelectOption<Profile['role']>[] = [
  { value: 'user', label: 'Regular User' },
  { value: 'agent', label: 'Agent' },
];

const kindLabels: Record<ListingKind, string> = {
  listing: 'Property',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsLoadError, setListingsLoadError] = useState(false);
  const listingsFetchedAt = useRef(0);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Profile['role']>('user');
  const [businessName, setBusinessName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [requestingVerification, setRequestingVerification] = useState(false);

  const loadMyListings = useCallback(async (force = false) => {
    if (!session) {
      setMyListings([]);
      setLoadingListings(false);
      return;
    }
    if (!force && Date.now() - listingsFetchedAt.current < 60_000) return;
    const uid = session.user.id;
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, price, currency, price_unit, created_at, last_confirmed_at, is_active')
      .eq('owner_id', uid);

    if (error) {
      setListingsLoadError(true);
      setLoadingListings(false);
      return;
    }
    setListingsLoadError(false);

    const combined: MyListing[] = ((listings ?? []) as any[]).map((item) => ({
      kind: 'listing' as const,
      id: item.id,
      title: item.title,
      priceLabel: formatPrice(item.price, item.currency, item.price_unit),
      createdAt: item.created_at,
      lastConfirmedAt: item.last_confirmed_at,
      isActive: item.is_active,
    }));

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    listingsFetchedAt.current = Date.now();
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
    setAvatarUrl(profile?.avatar_url ?? null);
    setEditing(true);
  }

  async function pickAvatar() {
    if (!session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Please allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri, session.user.id);
      setAvatarUrl(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload profile picture. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (!session || saving) return;
    setSaving(true);
    const cleanFullName = sanitizeText(fullName);
    const cleanBusinessName = sanitizeText(businessName);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: cleanFullName || null,
        phone: phone.trim() || null,
        role,
        business_name: role === 'user' ? null : cleanBusinessName || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', friendlyErrorMessage(error));
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
    const { error } = await supabase.from('listings').delete().eq('id', item.id);
    if (error) {
      Alert.alert('Could not delete', friendlyErrorMessage(error));
      return;
    }
    listingsFetchedAt.current = 0;
    setMyListings((prev) => prev.filter((l) => l.id !== item.id));
    notifyListingsChanged();
  }

  async function confirmStillAvailable(item: MyListing) {
    if (confirmingId) return;
    setConfirmingId(item.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('listings')
      .update({ last_confirmed_at: nowIso })
      .eq('id', item.id);
    setConfirmingId(null);
    if (error) {
      Alert.alert('Could not confirm', friendlyErrorMessage(error));
      return;
    }
    setMyListings((prev) => prev.map((l) => (l.id === item.id ? { ...l, lastConfirmedAt: nowIso } : l)));
  }

  async function requestPhoneVerification() {
    if (!session || requestingVerification) return;
    setRequestingVerification(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone_verification_requested_at: new Date().toISOString() })
      .eq('id', session.user.id);
    setRequestingVerification(false);
    if (error) {
      Alert.alert('Could not request verification', friendlyErrorMessage(error));
      return;
    }
    await refreshProfile();
    Alert.alert('Request sent', "We'll review your phone number and verify your account soon.");
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
            <Pressable
              style={styles.avatar}
              onPress={editing ? pickAvatar : undefined}
              disabled={avatarUploading}
            >
              {(editing ? avatarUrl : profile?.avatar_url) ? (
                <Image
                  source={{ uri: (editing ? avatarUrl : profile?.avatar_url) as string }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initialsFor(profile?.full_name ?? null)}</Text>
              )}
              {editing && (
                <View style={styles.avatarEditOverlay}>
                  {avatarUploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={16} color="#fff" />}
                </View>
              )}
            </Pressable>
            {!editing ? (
              <>
                <Text style={styles.name}>{profile?.full_name ?? 'Easyfen User'}</Text>
                {roleLabel(profile?.role) && <Text style={styles.roleBadge}>{roleLabel(profile?.role)}</Text>}
                {profile?.business_name && <Text style={styles.businessName}>{profile.business_name}</Text>}
                <Text style={styles.contactText}>{session.user.email}</Text>
                {profile?.phone && <Text style={styles.contactText}>{profile.phone}</Text>}

                {verificationBadgeLabel(profile?.verification_tier) ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.verifiedBadgeText}>{verificationBadgeLabel(profile?.verification_tier)}</Text>
                  </View>
                ) : profile?.phone_verification_requested_at ? (
                  <Text style={styles.verificationPending}>Phone verification pending review</Text>
                ) : profile?.phone ? (
                  <Pressable
                    style={styles.verifyButton}
                    onPress={requestPhoneVerification}
                    disabled={requestingVerification}
                  >
                    {requestingVerification ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Phone Number</Text>
                    )}
                  </Pressable>
                ) : null}

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
            <Pressable style={styles.savedRow} onPress={() => router.push('/saved-searches')}>
              <Ionicons name="bookmark" size={18} color={colors.accent} />
              <Text style={styles.savedRowText}>Saved Searches</Text>
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
      renderItem={({ item }) => {
        const stale = daysSince(item.lastConfirmedAt) >= STALE_AFTER_DAYS;
        return (
          <View>
            <View style={styles.listingRow}>
              <View style={styles.listingBody}>
                <View style={styles.listingKindRow}>
                  <Text style={styles.listingKind}>{kindLabels[item.kind]}</Text>
                  {!item.isActive && (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.listingPrice}>{item.priceLabel}</Text>
                {!item.isActive && (
                  <Text style={styles.suspendedNote}>
                    This listing was reported and suspended pending admin review.
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.editButtonRow}
                onPress={() => router.push(`/edit/${item.kind}/${item.id}`)}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.accent} />
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
            {stale && (
              <View style={styles.staleBanner}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.staleBannerText}>Still available? Confirm to keep it fresh.</Text>
                <Pressable
                  style={styles.staleBannerButton}
                  onPress={() => confirmStillAvailable(item)}
                  disabled={confirmingId === item.id}
                >
                  {confirmingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={styles.staleBannerButtonText}>Confirm</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        !editing && !loadingListings ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={listingsLoadError ? 'cloud-offline-outline' : 'home-outline'}
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyStateText}>
              {listingsLoadError ? "Couldn't load your listings. Try again shortly." : "You haven't posted anything yet"}
            </Text>
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
  loggedOutTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  loginButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loginButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
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
    overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72 },
  avatarText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.accent },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  roleBadge: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 0.4, marginTop: 4 },
  businessName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  contactText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  verifiedBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.success },
  verificationPending: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  verifyButton: { marginTop: spacing.sm },
  verifyButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  editButtonText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: fontWeight.semibold },
  editForm: { width: '100%', gap: spacing.md },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
  cancelButtonText: { color: colors.textSecondary, fontWeight: fontWeight.semibold },
  saveButton: { flex: 1, borderRadius: radius.md, backgroundColor: colors.accent, paddingVertical: spacing.md, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: fontWeight.bold },
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
  savedRowText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
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
  listingKindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listingKind: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.4 },
  suspendedBadge: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  suspendedBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', letterSpacing: 0.4 },
  suspendedNote: { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
  listingTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 2 },
  listingPrice: { fontSize: fontSize.sm, color: colors.accent, fontWeight: fontWeight.semibold, marginTop: 2 },
  editButtonRow: { padding: spacing.sm },
  deleteButton: { padding: spacing.sm },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  staleBannerText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },
  staleBannerButton: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  staleBannerButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
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
  logoutButtonText: { color: colors.danger, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
