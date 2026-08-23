import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../constants/theme';

export default function AgentAgreementScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Agent Onboarding Agreement</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: August 2026</Text>

        <Text style={styles.intro}>
          This Agent Onboarding Agreement ("Agreement") sets out the terms under which real estate
          agents, brokers, and property professionals ("Agent") may list properties and offer services
          on the Easyfen Platform ("Platform"). By registering as an agent, you agree to be bound
          by this Agreement.
        </Text>

        <Section title="1. Eligibility">
          {`To register as an agent on Easyfen, you must:\n\n` +
            `• Be a licensed real estate agent, broker, or property professional in your jurisdiction, where such licensing is required.\n` +
            `• Be at least 18 years of age.\n` +
            `• Provide accurate information about your qualifications and professional status during registration.`}
        </Section>

        <Section title="2. Agent Obligations">
          {`As an agent, you agree to:\n\n` +
            `• Only list properties for which you hold a valid mandate or written authorisation from the owner.\n` +
            `• Ensure all listing information is accurate, current, and compliant with applicable advertising standards.\n` +
            `• Respond to enquiries from potential clients within a reasonable timeframe.\n` +
            `• Maintain all required professional licences and comply with applicable laws and regulations.\n` +
            `• Disclose your professional capacity clearly to clients.`}
        </Section>

        <Section title="3. Listing Standards">
          {`Agent listings must:\n\n` +
            `• Include accurate photos that genuinely represent the property.\n` +
            `• State clearly whether a property is for sale or rent, and at what price.\n` +
            `• Disclose the agent's commission structure or fees to clients upon request.\n` +
            `• Be removed promptly when a property is no longer available.`}
        </Section>

        <Section title="4. Platform Fees">
          {`Standard listings are free of charge. Easyfen offers optional paid features — a featured listing boost, an agent subscription that keeps all your listings featured, and paid agent verification — priced in the app before purchase.\n\n` +
            `These are purchased via mobile money (see Terms of Service, Section 7), not automated card billing. A feature activates only after Easyfen manually confirms your payment.`}
        </Section>

        <Section title="5. Conduct">
          {`Agents must adhere to Easyfen's Community Guidelines at all times. In addition, agents must not:\n\n` +
            `• Engage in price manipulation or collusion with other agents.\n` +
            `• Solicit clients from other agents on the Platform.\n` +
            `• Make false or misleading claims about properties, their value, or market conditions.`}
        </Section>

        <Section title="6. Verification">
          {`Easyfen currently offers two optional verification steps, reviewed manually by an administrator:\n\n` +
            `• Phone verification, at no cost.\n` +
            `• Verified Agent review, a paid feature (Section 4) after which your profile and listings display a Verified Agent badge if approved.\n\n` +
            `Neither step currently requires submitting a professional licence or registration document. Easyfen may introduce document-based verification in the future, in which case this Agreement will be updated first.`}
        </Section>

        <Section title="7. Intellectual Property">
          By uploading listing photos and content to the Platform, you grant Easyfen a non-exclusive,
          royalty-free licence to display that content on the Platform and in promotional materials.
          You retain ownership of all content you upload.
        </Section>

        <Section title="8. Termination">
          {`Either party may terminate this Agreement at any time.\n\n` +
            `Easyfen may immediately suspend or terminate your agent account if you:\n\n` +
            `• Provide false or misleading information during registration.\n` +
            `• Violate this Agreement, the Terms of Service, or Community Guidelines.\n` +
            `• Allow your professional licence to lapse (where required).`}
        </Section>

        <Section title="9. Liability">
          Easyfen is a marketplace and is not a party to any transaction between agents and clients.
          Agents are solely responsible for the accuracy of their listings and for compliance with
          all applicable laws. Easyfen is not liable for any loss arising from an agent's listings
          or conduct.
        </Section>

        <Section title="10. Governing Law">
          This Agreement is governed by the laws of the Republic of Sierra Leone. Disputes shall be
          resolved in accordance with the dispute resolution process set out in the Terms of Service
          (good-faith negotiation, then the courts of Sierra Leone).
        </Section>

        <Section title="11. Contact">
          {`Questions about this Agreement?\n\nEasyfen Agent Support\nagents@easyfen.com`}
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
