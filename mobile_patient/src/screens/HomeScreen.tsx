import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  ChevronRight,
  Pill,
  Share2,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { format, parseISO } from 'date-fns'

import {
  ActivityCard,
  AllergyAlertCard,
  Avatar,
  CardSkeleton,
  EmptyState,
  Header,
  QRDisplay,
  QuickAction,
  ScreenContainer,
  SectionHeader,
  type TabId,
} from '../components/ui'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { colors, radius, shadows, spacing } from '../theme'
import { getAppointmentLabel } from '../utils'

export function HomeScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { activePatient, allergies, appointments, activityLog, healthInsights } = usePatientStore()
  const { isCompact, isLargePhone, isTablet, cardColumns } = useResponsive()
  const quickActionWidth = isTablet ? '23%' : cardColumns >= 2 ? '31.5%' : '48.2%'
  
  // State for expandable sections
  const [showAllAllergies, setShowAllAllergies] = useState(false)
  const [showAllAppointments, setShowAllAppointments] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)

  if (!activePatient) {
    return (
      <ScreenContainer>
        <CardSkeleton />
      </ScreenContainer>
    )
  }

  const upcomingAppointments = appointments
    .filter((appointment) => appointment.status === 'upcoming')
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime())
    .slice(0, showAllAppointments ? appointments.filter(a => a.status === 'upcoming').length : 2)

  const recentActivity = [...activityLog]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, showAllActivity ? activityLog.length : 3)

  const latestInsight = healthInsights[0]

  return (
    <ScreenContainer>
      <Header
        showLogo
        avatar={<Avatar name={`${activePatient.firstName} ${activePatient.lastName}`} onPress={() => onNavigate('profile')} />}
      />

      <View style={styles.qrSection}>
        <QRDisplay />
      </View>

      <View style={styles.quickActionsSection}>
        {isLargePhone ? (
          <View style={[styles.quickActionsGrid, { gap: spacing.md }]}>
            {[
              { icon: <Pill color={colors.primary} size={20} />, label: 'Medications', variant: 'default' as const, tab: 'records' as const },
              { icon: <Share2 color={colors.primary} size={20} />, label: 'Share', variant: 'default' as const, tab: 'share' as const },
              { icon: <Calendar color={colors.primary} size={20} />, label: 'Appointments', variant: 'default' as const, tab: 'records' as const },
              { icon: <Activity color={colors.primary} size={20} />, label: 'Lab Results', variant: 'default' as const, tab: 'records' as const },
            ].map((action) => (
              <View key={action.label} style={{ width: quickActionWidth }}>
                <QuickAction icon={action.icon} label={action.label} variant={action.variant} onPress={() => onNavigate(action.tab)} />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsRow}>
            <QuickAction
              icon={<Pill color={colors.primary} size={20} />}
              label="Medications"
              onPress={() => onNavigate('records')}
            />
            <QuickAction
              icon={<Share2 color={colors.primary} size={20} />}
              label="Share"
              onPress={() => onNavigate('share')}
            />
            <QuickAction
              icon={<Calendar color={colors.primary} size={20} />}
              label="Appointments"
              onPress={() => onNavigate('records')}
            />
            <QuickAction
              icon={<Activity color={colors.primary} size={20} />}
              label="Lab Results"
              onPress={() => onNavigate('records')}
            />
          </ScrollView>
        )}
      </View>

      {allergies.length ? <View style={styles.allergySection}><AllergyAlertCard allergies={allergies.slice(0, showAllAllergies ? allergies.length : 3)} onViewAll={() => setShowAllAllergies(!showAllAllergies)} showAll={showAllAllergies} /></View> : null}

      <View style={styles.upcomingSection}>
        <SectionHeader
          title="Upcoming"
          action={upcomingAppointments.length ? { label: showAllAppointments ? 'View Less' : 'View All', onPress: () => setShowAllAppointments(!showAllAppointments) } : undefined}
        />

        {upcomingAppointments.length ? (
          <View style={styles.sectionList}>
            {upcomingAppointments.map((appointment) => (
              <Pressable key={appointment.id} style={[styles.appointmentCard, isCompact ? styles.appointmentCardCompact : null]}>
                <View style={[styles.appointmentLeft, isCompact ? styles.appointmentLeftCompact : null]}>
                  <View style={[styles.appointmentDateBox, isCompact ? styles.appointmentDateBoxCompact : null]}>
                    <Text style={styles.appointmentDateLabel}>{getAppointmentLabel(appointment.dateTime)}</Text>
                    <Text style={styles.appointmentTimeLabel}>{format(parseISO(appointment.dateTime), 'h:mm a')}</Text>
                  </View>
                  <View style={styles.appointmentCopy}>
                    <Text style={styles.appointmentTitle}>{appointment.title}</Text>
                    <Text style={styles.appointmentMeta}>{appointment.facility}</Text>
                    <Text style={styles.appointmentMeta}>{appointment.doctorName}</Text>
                  </View>
                </View>
                <ChevronRight color={colors.mutedForeground} size={18} style={isCompact ? styles.appointmentChevronCompact : null} />
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Calendar color={colors.mutedForeground} size={26} />}
            title="No upcoming appointments"
            message="Schedule your next checkup"
          />
        )}
      </View>

      <View style={styles.activitySection}>
        <SectionHeader
          title="Recent Activity"
          action={recentActivity.length ? { label: showAllActivity ? 'View Less' : 'View All', onPress: () => setShowAllActivity(!showAllActivity) } : undefined}
        />
        {recentActivity.length ? (
          <View style={styles.sectionList}>
            {recentActivity.map((entry) => (
              <ActivityCard
                key={entry.id}
                action={entry.action}
                provider={entry.provider}
                details={entry.details}
                timestamp={entry.timestamp}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Activity color={colors.mutedForeground} size={26} />}
            title="No recent activity"
            message="Your access log will appear here"
          />
        )}
      </View>

      {latestInsight ? (
        <View style={styles.insightSection}>
          <SectionHeader title="Health Insights" />
          <View
            style={[
              styles.insightCard,
              isCompact ? styles.insightCardCompact : null,
              latestInsight.type === 'improvement'
                ? styles.insightImprovement
                : latestInsight.type === 'alert'
                ? styles.insightAlert
                : latestInsight.type === 'reminder'
                ? styles.insightReminder
                : styles.insightMilestone,
            ]}
          >
            <View
              style={[
                styles.insightIcon,
                isCompact ? styles.insightIconCompact : null,
                latestInsight.type === 'improvement'
                  ? styles.insightIconImprovement
                  : latestInsight.type === 'alert'
                  ? styles.insightIconAlert
                  : latestInsight.type === 'reminder'
                  ? styles.insightIconReminder
                  : styles.insightIconMilestone,
              ]}
            >
              {latestInsight.type === 'improvement' ? (
                <TrendingUp color={colors.success} size={20} />
              ) : latestInsight.type === 'alert' ? (
                <AlertTriangle color={colors.error} size={20} />
              ) : latestInsight.type === 'reminder' ? (
                <Bell color={colors.secondary} size={20} />
              ) : (
                <Sparkles color={colors.info} size={20} />
              )}
            </View>

            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>{latestInsight.title}</Text>
              <Text style={styles.insightDescription}>{latestInsight.description}</Text>
              {latestInsight.previousValue && latestInsight.currentValue ? (
                <View style={styles.insightMetricRow}>
                  <Text style={styles.insightPrevious}>{latestInsight.previousValue}</Text>
                  <ChevronRight color={colors.mutedForeground} size={14} />
                  <Text style={styles.insightCurrent}>{latestInsight.currentValue}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  qrSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  quickActionsSection: {
    marginBottom: spacing.xxxl,
  },
  quickActionsRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  allergySection: {
    marginBottom: spacing.xxxl,
  },
  upcomingSection: {
    marginBottom: spacing.xxxl,
  },
  activitySection: {
    marginBottom: spacing.xxxl,
  },
  insightSection: {
    marginBottom: spacing.xl,
  },
  sectionList: {
    gap: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  appointmentCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  appointmentLeftCompact: {
    flexDirection: 'column',
  },
  appointmentDateBox: {
    width: 68,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  appointmentDateBoxCompact: {
    width: 82,
  },
  appointmentCardCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  appointmentChevronCompact: {
    alignSelf: 'flex-end',
  },
  appointmentDateLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  appointmentTimeLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  appointmentCopy: {
    flex: 1,
    gap: 4,
  },
  appointmentTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  appointmentMeta: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  insightCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightCardCompact: {
    flexDirection: 'column',
  },
  insightImprovement: {
    backgroundColor: '#F1FBF5',
    borderColor: '#BFE8CF',
  },
  insightAlert: {
    backgroundColor: colors.allergyBg,
    borderColor: '#F3B6B1',
  },
  insightReminder: {
    backgroundColor: '#FFF7E5',
    borderColor: '#F5D7A7',
  },
  insightMilestone: {
    backgroundColor: '#EAF4FB',
    borderColor: '#B7D6ED',
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  insightIconImprovement: {
    backgroundColor: '#E0F5E8',
  },
  insightIconAlert: {
    backgroundColor: '#FDECE8',
  },
  insightIconReminder: {
    backgroundColor: '#FFF1D4',
  },
  insightIconMilestone: {
    backgroundColor: '#DCECF8',
  },
  insightCopy: {
    flex: 1,
    gap: 6,
  },
  insightTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  insightDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  insightMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightPrevious: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  insightCurrent: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
})
