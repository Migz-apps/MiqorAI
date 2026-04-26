import * as Haptics from 'expo-haptics'
import { FileText, Home, Share2, User, Users } from 'lucide-react-native'
import React, { ReactNode, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useResponsive } from '../../responsive'
import { colors, radius, shadows, spacing } from '../../theme'
import { getInitials } from '../../utils'

export type TabId = 'home' | 'records' | 'share' | 'family' | 'profile'

interface ScreenContainerProps {
  children: ReactNode
  noPadding?: boolean
}

export function ScreenContainer({ children, noPadding = false }: ScreenContainerProps) {
  const { contentMaxWidth, horizontalPadding, isTablet } = useResponsive()

  return (
    <SafeAreaView edges={['top']} style={styles.screenSafeArea}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingHorizontal: noPadding ? 0 : horizontalPadding,
            paddingTop: noPadding ? 0 : isTablet ? spacing.lg : spacing.md,
          },
          noPadding ? styles.screenContentNoPadding : styles.screenContentCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {noPadding ? children : <View style={[styles.screenInner, { maxWidth: contentMaxWidth }]}>{children}</View>}
      </ScrollView>
    </SafeAreaView>
  )
}

interface HeaderProps {
  title?: string
  subtitle?: string
  avatar?: ReactNode
  actions?: ReactNode
  showLogo?: boolean
}

export function Header({ title, subtitle, avatar, actions, showLogo = false }: HeaderProps) {
  const { isSmallPhone } = useResponsive()

  return (
    <View style={[styles.header, isSmallPhone ? styles.headerCompact : null]}>
      <View style={[styles.headerLeft, isSmallPhone ? styles.headerLeftCompact : null]}>
        {showLogo ? (
          <>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>M+</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>Med-Pass</Text>
              <Text style={styles.logoSubtitle}>Patient Portal</Text>
            </View>
          </>
        ) : (
          <View>
            {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        )}
      </View>

      <View style={[styles.headerActions, isSmallPhone ? styles.headerActionsCompact : null]}>
        {actions}
        {avatar}
      </View>
    </View>
  )
}

export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: { label: string; onPress: () => void }
}) {
  const { isSmallPhone } = useResponsive()

  return (
    <View style={[styles.sectionHeader, isSmallPhone ? styles.sectionHeaderCompact : null]}>
      <Text style={[styles.sectionTitle, isSmallPhone ? styles.sectionTitleCompact : null]}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function Avatar({
  name,
  size = 'md',
  onPress,
}: {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  onPress?: () => void
}) {
  const { isCompact } = useResponsive()
  const sizes = {
    sm: isCompact ? 32 : 36,
    md: isCompact ? 38 : 42,
    lg: isCompact ? 50 : 56,
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.avatar, { width: sizes[size], height: sizes[size], borderRadius: sizes[size] / 2 }]}
    >
      <Text style={[styles.avatarText, size === 'lg' ? styles.avatarTextLarge : null]}>
        {getInitials(name || 'MP')}
      </Text>
    </Pressable>
  )
}

export function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId
  onTabChange: (value: TabId) => void
}) {
  const insets = useSafeAreaInsets()
  const { contentMaxWidth, horizontalPadding, isTablet, isCompact } = useResponsive()
  const tabs = useMemo(
    () => [
      { id: 'home' as const, label: 'Home', icon: Home },
      { id: 'records' as const, label: 'Records', icon: FileText },
      { id: 'share' as const, label: 'Share', icon: Share2 },
      { id: 'family' as const, label: 'Family', icon: Users },
      { id: 'profile' as const, label: 'Profile', icon: User },
    ],
    [],
  )

  return (
    <View
      style={[
        styles.tabBarWrap,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={[styles.tabBar, { maxWidth: contentMaxWidth }, isTablet ? styles.tabBarTablet : null]}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                void Haptics.selectionAsync()
                onTabChange(tab.id)
              }}
              style={[styles.tabItem, active ? styles.tabItemActive : null]}
            >
              <Icon color={active ? colors.primary : colors.mutedForeground} size={20} />
              <Text style={[styles.tabLabel, isCompact ? styles.tabLabelCompact : null, active ? styles.tabLabelActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screenSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenScroll: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 112,
    gap: spacing.xl,
    alignItems: 'center',
  },
  screenContentNoPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
    alignItems: 'stretch',
  },
  screenContentCentered: {
    alignItems: 'center',
  },
  screenInner: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCompact: {
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  headerLeftCompact: {
    paddingRight: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionsCompact: {
    flexShrink: 0,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  logoTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  logoSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeaderCompact: {
    alignItems: 'flex-start',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  sectionTitleCompact: {
    fontSize: 16,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  avatar: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarTextLarge: {
    fontSize: 18,
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingVertical: spacing.sm,
    ...shadows.strong,
    alignSelf: 'center',
    width: '100%',
  },
  tabBarTablet: {
    paddingHorizontal: spacing.md,
  },
  tabItem: {
    minWidth: 62,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  tabItemActive: {
    backgroundColor: colors.primaryLight,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelCompact: {
    fontSize: 10,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
})
