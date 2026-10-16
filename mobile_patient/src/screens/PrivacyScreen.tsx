import { ChevronLeft } from 'lucide-react-native'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useResponsive } from '../responsive'
import { colors, spacing } from '../theme'

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
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

        <Text style={styles.title}>Privacy Policy</Text>

        <Text style={styles.paragraph}>
          Your health records are stored on MiqorAI servers and synced to this device so you can
          view them. Data saved on this device is encrypted at rest, and data sent between the app
          and MiqorAI servers is encrypted in transit.
        </Text>
        <Text style={styles.paragraph}>
          Hospitals, pharmacies and other providers can only see your records while you have
          granted them access. Every access is recorded in your activity log.
        </Text>
        <Text style={styles.paragraph}>
          We collect the information needed to run the service: your profile details, your medical
          records as submitted by your care providers, and access logs. We do not sell your data.
        </Text>
        <Text style={styles.paragraph}>
          You can export a copy of your data or delete your account at any time from the Profile
          screen. Deleting your account permanently removes your data from MiqorAI servers.
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
