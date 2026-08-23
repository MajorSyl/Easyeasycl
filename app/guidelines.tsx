import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../constants/theme';

export default function GuidelinesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: August 2026</Text>

        <Text style={styles.intro}>
          Easyfen is built on trust between property seekers, owners, and agents.
          These guidelines help everyone have a safe, respectful, and productive experience on our
          platform. Violations may result in content removal, account suspension, or a permanent ban.
        </Text>

        <Section title="Be Honest">
          {`• Post accurate property descriptions, photos, and pricing. Misleading listings damage trust and will be removed.\n` +
            `• Disclose any known issues or limitations with a property or service before a transaction.\n` +
            `• Do not impersonate another person or business.`}
        </Section>

        <Section title="Be Respectful">
          {`• Treat every user with courtesy and professionalism, regardless of background or circumstances.\n` +
            `• Do not post offensive, discriminatory, or harassing content.\n` +
            `• Do not contact other users unsolicited outside the context of a legitimate transaction.`}
        </Section>

        <Section title="Post Legitimate Listings Only">
          {`• Only list properties or services you have the legal right to offer.\n` +
            `• Do not post duplicate or spam listings.\n` +
            `• Photos must accurately represent the listed property — stock images or misleading photos are not permitted.\n` +
            `• Pricing must be realistic and honest; hidden fees are not allowed.`}
        </Section>

        <Section title="Keep Transactions on Platform">
          {`• Use Easyfen's messaging system to communicate with potential renters, buyers, or clients.\n` +
            `• Avoid moving negotiations off-platform before a transaction is agreed, as this reduces buyer and seller protection.`}
        </Section>

        <Section title="Protect Privacy">
          {`• Do not share other users' personal information without their consent.\n` +
            `• Do not screenshot or redistribute private messages.\n` +
            `• Do not post content that could identify a private individual without their permission.`}
        </Section>

        <Section title="No Illegal Activity">
          {`• Do not use Easyfen to facilitate fraud, money laundering, or any other illegal activity.\n` +
            `• Do not list properties that are not legally available for rent or sale.\n` +
            `• Comply with all applicable local laws and regulations.`}
        </Section>

        <Section title="Reporting Violations">
          {`If you see content that violates these guidelines, use the Report button on the listing or profile, ` +
            `or contact us at support@easyfen.com. Reporting a listing suspends it immediately while we review it. ` +
            `We aim to review reports as quickly as possible.`}
        </Section>

        <Section title="Enforcement">
          {`Depending on the severity and frequency of a violation, we may:\n\n` +
            `• Remove the offending content.\n` +
            `• Issue a warning to the account holder.\n` +
            `• Temporarily suspend the account.\n` +
            `• Permanently ban the account.\n\n` +
            `Easyfen reserves the right to take any action necessary to maintain a safe and trustworthy community.`}
        </Section>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  body: { padding: spacing.xl, maxWidth: 720, alignSelf: 'center', width: '100%' },
  updated: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xl },
  intro: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  sectionBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
});
