import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
import { useSettings } from '../../lib/settings';
import { readCache, writeCache } from '../../lib/offline-cache';
import { friendlyErrorMessage } from '../../lib/errors';
import { appAlert } from '../../lib/alert';
import { notifyListingsChanged } from '../../lib/listings-cache-bus';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { uploadAvatar } from '../../lib/upload';
import { requestAgentVerification } from '../../lib/contact';
import { sanitizeText } from '../../lib/sanitize';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { daysSince, formatPrice, initialsFor, roleLabel, verificationBadgeLabel } from '../../lib/format';
import { SelectField, type SelectOption } from '../../components/SelectField';
import { WebFooter } from '../../components/WebFooter';
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
  isPremium: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
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
  const tabBarGap = useTabBarGap();
  const { session, profile, signOut, refreshProfile } = useAuth();
  const { dataLiteMode, setDataLiteMode } = useSettings();
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsLoadError, setListingsLoadError] = useState(false);
  const [showingSavedListings, setShowingSavedListings] = useState(false);
  const listingsFetchedAt = useRef(0);
  const myListingsCacheRef = useRef<MyListing[] | null>(null);
  const myListingsCacheUidRef = useRef<string | null>(null);

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
  const [subscriptionUntil, setSubscriptionUntil] = useState<string | null>(null);

  const loadSubscriptionStatus = useCallback(async () => {
    if (!session) {
      setSubscriptionUntil(null);
      return;
    }
    const { data } = await supabase
      .from('agent_subscriptions')
      .select('ends_at')
      .eq('user_id', session.user.id)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .maybeSingle();
    setSubscriptionUntil(data?.ends_at ?? null);
  }, [session]);

  const loadMyListings = useCallback(async (force = false) => {
    if (!session) {
      setMyListings([]);
      setLoadingListings(false);
      return;
    }
    const uid = session.user.id;
    const cacheKey = `easyfen_my_listings_cache_${uid}`;

    if (myListingsCacheUidRef.current !== uid) {
      myListingsCacheRef.current = null;
      myListingsCacheUidRef.current = uid;
      const persisted = await readCache<MyListing[]>(cacheKey);
      if (persisted) myListingsCacheRef.current = persisted;
    }

    if (!force && Date.now() - listingsFetchedAt.current < 60_000) return;
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, price, currency, price_unit, created_at, last_confirmed_at, is_active, is_premium, moderation_status')
      .eq('owner_id', uid);

    if (error) {
      if (myListingsCacheRef.current) {
        setMyListings(myListingsCacheRef.current);
        setListingsLoadError(false);
        setShowingSavedListings(true);
      } else {
        setListingsLoadError(true);
      }
      setLoadingListings(false);
      return;
    }
    setListingsLoadError(false);
    setShowingSavedListings(false);

    const combined: MyListing[] = ((listings ?? []) as any[]).map((item) => ({
      kind: 'listing' as const,
      id: item.id,
      title: item.title,
      priceLabel: formatPrice(item.price, item.currency, item.price_unit),
      createdAt: item.created_at,
      lastConfirmedAt: item.last_confirmed_at,
      isActive: item.is_active,
      isPremium: item.is_premium,
      moderationStatus: item.moderation_status,
    }));

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    listingsFetchedAt.current = Date.now();
    myListingsCacheRef.current = combined;
    writeCache(cacheKey, combined);
    setMyListings(combined);
    setLoadingListings(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadMyListings();
      loadSubscriptionStatus();
    }, [loadMyListings, loadSubscriptionStatus])
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
      appAlert('Photo access needed', 'Please allow photo library access to set a profile picture.');
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
      appAlert('Upload failed', 'Could not upload profile picture. Please try again.');
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
      appAlert('Could not save', friendlyErrorMessage(error));
      return;
    }
    await refreshProfile();
    setEditing(false);
  }

  function confirmDelete(item: MyListing) {
    appAlert('Delete listing', `Remove "${item.title}" from Easyfen? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteListing(item) },
    ]);
  }

  async function deleteListing(item: MyListing) {
    const { error } = await supabase.from('listings').delete().eq('id', item.id);
    if (error) {
      appAlert('Could not delete', friendlyErrorMessage(error));
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
      appAlert('Could not confirm', friendlyErrorMessage(error));
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
      appAlert('Could not request verification', friendlyErrorMessage(error));
      return;
    }
    await refreshProfile();
    appAlert('Request sent', "We'll review your phone number and verify your account soon.");
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
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarGap + spacing.lg }]}
      data={editing ? [] : myListings}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      ListHeaderComponent={
        <>
          <View style={styles.headerCard}>
            <Pressable
              style={styles.avatar}
              onPress={editing ? pickAvatar : undefined}
              disabled={avatarUploading}
              accessibilityRole={editing ? 'button' : undefined}
              accessibilityLabel={editing ? 'Change profile photo' : 'Profile photo'}
            >
              {(editing ? avatarUrl : profile?.avatar_url) ? (
                <Image
                  source={{ uri: (editing ? avatarUrl : profile?.avatar_url) as string }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  accessible={false}
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

                {profile?.role === 'agent' &&
                  profile?.verification_tier !== 'agent_verified' &&
                  profile?.verification_tier !== 'id_verified' && (
                    <Pressable style={styles.verifyButton} onPress={() => requestAgentVerification(profile?.full_name)}>
                      <Text style={styles.verifyButtonText}>Become a Verified Agent</Text>
                    </Pressable>
                  )}

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
            <View style={styles.savedRow}>
              <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedRowText}>Data Saver</Text>
                <Text style={styles.savedRowSubtext}>Photos won't load automatically on a slow connection</Text>
              </View>
              <Switch
                value={dataLiteMode}
                onValueChange={setDataLiteMode}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#fff"
                accessibilityLabel="Data Saver"
              />
            </View>
          )}

          {!editing && (
            <Pressable style={styles.savedRow} onPress={() => router.push('/packages')}>
              <Ionicons name="rocket" size={18} color={colors.accent} />
              <Text style={styles.savedRowText}>Plans & Pricing</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

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

          {!editing && profile?.role === 'agent' && (
            <Pressable style={styles.savedRow} onPress={() => router.push('/pay?purpose=agent_subscription')}>
              <Ionicons name="star" size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedRowText}>Agent Subscription</Text>
                <Text style={styles.savedRowSubtext}>
                  {subscriptionUntil
                    ? `Active until ${new Date(subscriptionUntil).toLocaleDateString('en-GB')}`
                    : 'Keep all your listings featured'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          {!editing && showingSavedListings && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
              <Text style={styles.offlineBannerText}>Showing saved listings — check your connection</Text>
            </View>
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
                  {item.isPremium && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={9} color="#fff" />
                      <Text style={styles.featuredBadgeText}>FEATURED</Text>
                    </View>
                  )}
                  {!item.isActive && (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
                    </View>
                  )}
                  {item.moderationStatus === 'pending' && (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={10} color={colors.gold} />
                      <Text style={styles.pendingBadgeText}>PENDING REVIEW</Text>
                    </View>
                  )}
                  {item.moderationStatus === 'rejected' && (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedBadgeText}>NOT APPROVED</Text>
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
                {item.moderationStatus === 'pending' && (
                  <Text style={styles.suspendedNote}>
                    This listing is waiting for admin approval before it's visible to other users.
                  </Text>
                )}
                {item.moderationStatus === 'rejected' && (
                  <Text style={styles.suspendedNote}>
                    An admin didn't approve this listing. Edit it and it will be resubmitted for review.
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.editButtonRow}
                onPress={() => router.push(`/edit/${item.kind}/${item.id}`)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title}`}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.accent} />
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
              >
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
            {item.isActive && !item.isPremium && (
              <Pressable
                style={styles.boostBanner}
                onPress={() => router.push(`/pay?purpose=listing_boost&listingId=${item.id}`)}
              >
                <Ionicons name="rocket-outline" size={14} color={colors.gold} />
                <Text style={styles.boostBannerText}>Feature this listing for more views</Text>
                <Text style={styles.boostBannerButtonText}>Boost</Text>
              </Pressable>
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
          <>
            {/* On web, WebFooter (copyright + privacy/terms/guidelines/agent
                links) renders here, scoped to the Profile screen only — it
                used to be mounted globally in app/_layout.tsx, which put it
                on every screen including Home. Native has no equivalent
                bottom-of-page footer convention, so it keeps its own
                in-page legal-links row instead, which is the only way
                iOS/Android users can reach these pages at all. */}
            {Platform.OS === 'web' ? (
              <WebFooter />
            ) : (
              <View style={styles.legalRow}>
                <Pressable onPress={() => router.push('/privacy')} hitSlop={6}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </Pressable>
                <Text style={styles.legalSep}>·</Text>
                <Pressable onPress={() => router.push('/terms')} hitSlop={6}>
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </Pressable>
                <Text style={styles.legalSep}>·</Text>
                <Pressable onPress={() => router.push('/guidelines')} hitSlop={6}>
                  <Text style={styles.legalLink}>Community Guidelines</Text>
                </Pressable>
                {profile?.role === 'agent' && (
                  <>
                    <Text style={styles.legalSep}>·</Text>
                    <Pressable onPress={() => router.push('/agent-agreement')} hitSlop={6}>
                      <Text style={styles.legalLink}>Agent Agreement</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            <Pressable style={styles.logoutButton} onPress={handleLogOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </Pressable>
          </>
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
  savedRowSubtext: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
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
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', letterSpacing: 0.4 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.4 },
  suspendedNote: { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offlineBannerText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted },
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
  boostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  boostBannerText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },
  boostBannerButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gold },
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
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  legalLink: { fontSize: fontSize.xs, color: colors.textSecondary, textDecorationLine: 'underline' },
  legalSep: { fontSize: fontSize.xs, color: colors.textMuted },
});
