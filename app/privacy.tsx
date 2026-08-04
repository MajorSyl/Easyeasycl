import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../constants/theme';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 2025</Text>

        <Section title="1. Introduction">
          Easyfen ("we", "our", or "us") is committed to protecting your personal information. This
          Privacy Policy explains how we collect, use, disclose, and safeguard your information when
          you use the Easyfen mobile application and website (collectively, the "Platform").
        </Section>

        <Section title="2. Information We Collect">
          {`We collect the following categories of information:\n\n` +
            `• Account information: name, email address, phone number, and profile photo.\n` +
            `• Listing content: property descriptions, photos, pricing, and location details you upload.\n` +
            `• Usage data: pages visited, search queries, listings viewed, and interactions on the Platform.\n` +
            `• Device information: device type, operating system, and unique device identifiers.\n` +
            `• Location: approximate location when you search for nearby listings (only with your permission).`}
        </Section>

        <Section title="3. How We Use Your Information">
          {`We use your information to:\n\n` +
            `• Create and maintain your account.\n` +
            `• Display and facilitate transactions for listings, hotels, and services.\n` +
            `• Send service notifications and updates relevant to your account.\n` +
            `• Improve the Platform through analytics and user feedback.\n` +
            `• Comply with legal obligations and enforce our Terms of Service.`}
        </Section>

        <Section title="4. Sharing of Information">
          {`We do not sell your personal information. We may share your information with:\n\n` +
            `• Other users, to the extent necessary to facilitate a transaction (e.g. contact details shared after a booking is confirmed).\n` +
            `• Service providers who assist us in operating the Platform (e.g. hosting, analytics, payment processing), under strict confidentiality agreements.\n` +
            `• Law enforcement or regulatory bodies when required by law.`}
        </Section>

        <Section title="5. Data Retention">
          We retain your personal information for as long as your account is active or as needed to provide
          you services. You may request deletion of your account and associated data at any time by
          contacting us at support@easyfen.com.
        </Section>

        <Section title="6. Security">
          We implement industry-standard technical and organizational measures to protect your data against
          unauthorised access, alteration, disclosure, or destruction. No method of transmission over the
          internet is 100% secure; we cannot guarantee absolute security.
        </Section>

        <Section title="7. Your Rights">
          {`Depending on your jurisdiction, you may have the right to:\n\n` +
            `• Access the personal information we hold about you.\n` +
            `• Request correction of inaccurate data.\n` +
            `• Request deletion of your data.\n` +
            `• Object to or restrict certain processing.\n\n` +
            `To exercise these rights, contact us at support@easyfen.com.`}
        </Section>

        <Section title="8. Cookies and Tracking">
          Our web platform uses cookies and similar technologies to maintain session state and collect
          analytics. You can control cookie preferences through your browser settings.
        </Section>

        <Section title="9. Children's Privacy">
          The Platform is not directed at children under the age of 13. We do not knowingly collect
          personal information from children. If you believe a child has provided us with personal
          information, please contact us immediately.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of material changes
          via email or an in-app notification at least 14 days before the changes take effect.
        </Section>

        <Section title="11. Contact Us">
          {`If you have questions about this Privacy Policy, please contact:\n\nEasyfen Support\nsupport@easyfen.com`}
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
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  sectionBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
});
