import { ChevronLeft } from 'lucide-react-native'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useResponsive } from '../responsive'
import { colors, spacing } from '../theme'

export function TermsScreen({ onBack }: { onBack: () => void }) {
  const { horizontalPadding, contentMaxWidth } = useResponsive()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding + spacing.md, maxWidth: Math.min(contentMaxWidth, 560) },
        ]}
      >
        <Pressable style={styles.backLink} onPress={onBack}>
          <ChevronLeft color={colors.textSecondary} size={18} />
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Terms of Service</Text>

        <Text style={styles.paragraph}>
          MiqorAI gives you mobile access to your health records. Your records are stored on
          MiqorAI servers and shown in this app when you sign in.
        </Text>
        <Text style={styles.paragraph}>
          You are responsible for keeping your account credentials and your device PIN private.
          Anyone who can unlock this app on your device can view the records stored in it.
        </Text>
        <Text style={styles.paragraph}>
          The information in this app is a record of your care. It does not replace professional
          medical advice, diagnosis or treatment from a qualified health provider.
        </Text>
        <Text style={styles.paragraph}>
          You control who can access your records. Grants you give to hospitals, pharmacies and
          other providers can be revoked at any time from the app.
        </Text>
        <Text style={styles.paragraph}>
          You can delete your account from the Profile screen. Deleting your account permanently
          removes your data from MiqorAI servers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  paragraph: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
})
