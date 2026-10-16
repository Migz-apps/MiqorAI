import { ChevronLeft } from 'lucide-react-native'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTranslation } from '../i18n'
import { useResponsive } from '../responsive'
import { colors, spacing } from '../theme'

export function TermsScreen({ onBack }: { onBack: () => void }) {
  const { horizontalPadding, contentMaxWidth } = useResponsive()
  const { t } = useTranslation()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding + spacing.md, maxWidth: Math.min(contentMaxWidth, 560) },
        ]}
      >
        <Pressable
          style={styles.backLink}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          accessibilityHint={t('terms.backHint')}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <ChevronLeft color={colors.textSecondary} size={18} />
          <Text style={styles.backLinkText}>{t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">{t('terms.title')}</Text>

        <Text style={styles.paragraph}>{t('terms.p1')}</Text>
        <Text style={styles.paragraph}>{t('terms.p2')}</Text>
        <Text style={styles.paragraph}>{t('terms.p3')}</Text>
        <Text style={styles.paragraph}>{t('terms.p4')}</Text>
        <Text style={styles.paragraph}>{t('terms.p5')}</Text>
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
