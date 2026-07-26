import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../constants/theme';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 2025</Text>

        <Section title="1. Acceptance of Terms">
          By accessing or using the Easyfen Platform, you agree to be bound by these Terms of Service.
          If you do not agree to these Terms, you may not use the Platform. We reserve the right to
          update these Terms at any time; continued use of the Platform after changes constitutes your
          acceptance of the revised Terms.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 18 years old and capable of entering a legally binding agreement to use
          the Platform. By registering, you represent and warrant that you meet these requirements.
        </Section>

        <Section title="3. Your Account">
          {`You are responsible for:\n\n` +
            `• Maintaining the confidentiality of your login credentials.\n` +
            `• All activity that occurs under your account.\n` +
            `• Providing accurate, current, and complete registration information.\n\n` +
            `You must notify us immediately of any unauthorised use of your account.`}
        </Section>

        <Section title="4. Listings and Content">
          {`When you post a listing, you represent and warrant that:\n\n` +
            `• You have the legal right to list and offer the property or service.\n` +
            `• All information in the listing is accurate, complete, and not misleading.\n` +
            `• The listing does not violate any applicable law or third-party rights.\n\n` +
            `Easyfen reserves the right to remove any listing that violates these Terms or our Community Guidelines without notice.`}
        </Section>

        <Section title="5. Prohibited Conduct">
          {`You agree not to:\n\n` +
            `• Post false, misleading, or fraudulent listings.\n` +
            `• Use the Platform for any illegal purpose.\n` +
            `• Harass, threaten, or harm other users.\n` +
            `• Attempt to circumvent the Platform's security or access systems you are not authorised to access.\n` +
            `• Scrape, crawl, or systematically extract data from the Platform without our written permission.\n` +
            `• Use automated bots or scripts to interact with the Platform.`}
        </Section>

        <Section title="6. Transactions">
          Easyfen is a marketplace that connects property owners, agents, hotels, and service providers
          with potential customers. We are not a party to any transaction and do not guarantee the
          quality, safety, legality, or availability of any listed property or service. All transactions
          are conducted directly between the relevant parties.
        </Section>

        <Section title="7. Fees">
          Basic use of the Platform is free. We may offer premium features for a fee. All applicable
          fees will be clearly disclosed before you are charged.
        </Section>

        <Section title="8. Intellectual Property">
          All content, trademarks, and other intellectual property on the Platform (excluding user-generated
          content) are owned by or licensed to Easyfen. You may not use our intellectual property without
          our prior written consent. By posting content on the Platform, you grant Easyfen a non-exclusive,
          royalty-free, worldwide licence to display and distribute that content in connection with the
          Platform.
        </Section>

        <Section title="9. Disclaimers">
          THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. EASYFEN
          DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR
          OTHER HARMFUL COMPONENTS.
        </Section>

        <Section title="10. Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, EASYFEN SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE
          PLATFORM.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by and construed in accordance with applicable law. Any disputes shall
          be resolved through good-faith negotiation, or if unsuccessful, through binding arbitration.
        </Section>

        <Section title="12. Contact">
          {`Questions about these Terms?\n\nEasyfen Support\nsupport@easyfen.com`}
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
