import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { Logo } from '../components/Logo';
import type { Profile } from '../lib/auth-context';

const roleChoices: { role: Profile['role']; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { role: 'user', icon: 'home-outline', title: 'Renter / Buyer', subtitle: 'Looking for a place or land' },
  { role: 'agent', icon: 'business-outline', title: 'Agent / Landlord', subtitle: 'Listing properties for rent or sale' },
];

export default function SelectRoleScreen() {
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useAuth();
  const [savingRole, setSavingRole] = useState<Profile['role'] | null>(null);

  async function choose(role: Profile['role']) {
    if (!session || savingRole) return;
    setSavingRole(role);
    await supabase.from('profiles').update({ role }).eq('id', session.user.id);
    await refreshProfile();
    setSavingRole(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Logo size={28} showWordmark={false} style={styles.logo} />
      <Text style={styles.title}>What brings you to Easyfen?</Text>
      <Text style={styles.subtitle}>This helps us tailor the app for you. You can change it anytime in your profile.</Text>

      <View style={styles.choices}>
        {roleChoices.map((choice) => (
          <Pressable key={choice.role} style={styles.choice} onPress={() => choose(choice.role)}>
            <View style={styles.choiceIcon}>
              {savingRole === choice.role ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Ionicons name={choice.icon} size={22} color={colors.accent} />
              )}
            </View>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceTitle}>{choice.title}</Text>
              <Text style={styles.choiceSubtitle}>{choice.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  logo: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  choices: { gap: spacing.md },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBody: { flex: 1 },
  choiceTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  choiceSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  skip: { textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xl },
});
