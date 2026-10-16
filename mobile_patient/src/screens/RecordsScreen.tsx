import {
  AlertTriangle,
  ExternalLink,
  FileText,
  FlaskConical,
  Minus,
  Pill,
  Scissors,
  Share2,
  Stethoscope,
  Syringe,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  AllergyBadge,
  BottomSheet,
  EmptyState,
  Header,
  HealthCard,
  MedicationCard,
  PrimaryButton,
  ScreenContainer,
  SearchInput,
} from '../components/ui'
import { useTranslation } from '../i18n'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { colors, radius, spacing } from '../theme'
import { formatDate } from '../utils'

type RecordTab = 'conditions' | 'medications' | 'allergies' | 'labs' | 'immunizations' | 'procedures'
type Translate = ReturnType<typeof useTranslation>['t']

export function RecordsScreen() {
  const { conditions, medications, allergies, labResults, immunizations, procedures } = usePatientStore()
  const { isCompact, isLargePhone, isTablet, stackedActions } = useResponsive()
  const { t } = useTranslation()
  const tabChipWidth = isTablet ? '31.5%' : '48.2%'

  const [activeTab, setActiveTab] = useState<RecordTab>('conditions')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<unknown>(null)
  const [selectedType, setSelectedType] = useState<RecordTab | null>(null)

  const tabs = [
    { id: 'conditions' as const, label: t('tabs.records_conditions'), icon: Stethoscope, count: conditions.length },
    { id: 'medications' as const, label: t('tabs.records_medications'), icon: Pill, count: medications.length },
    { id: 'allergies' as const, label: t('tabs.records_allergies'), icon: AlertTriangle, count: allergies.length },
    { id: 'labs' as const, label: t('records.tabLabs'), icon: FlaskConical, count: labResults.length },
    { id: 'immunizations' as const, label: t('records.tabVaccines'), icon: Syringe, count: immunizations.length },
    { id: 'procedures' as const, label: t('tabs.records_procedures'), icon: Scissors, count: procedures.length },
  ]

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      switch (activeTab) {
        case 'conditions':
          return conditions
        case 'medications':
          return medications
        case 'allergies':
          return allergies
        case 'labs':
          return labResults
        case 'immunizations':
          return immunizations
        case 'procedures':
          return procedures
      }
    }

    switch (activeTab) {
      case 'conditions':
        return conditions.filter((entry) => entry.name.toLowerCase().includes(query) || entry.notes?.toLowerCase().includes(query))
      case 'medications':
        return medications.filter((entry) => entry.name.toLowerCase().includes(query) || entry.prescribedBy.toLowerCase().includes(query))
      case 'allergies':
        return allergies.filter((entry) => entry.name.toLowerCase().includes(query) || entry.reaction?.toLowerCase().includes(query))
      case 'labs':
        return labResults.filter((entry) => entry.testName.toLowerCase().includes(query) || entry.facility.toLowerCase().includes(query))
      case 'immunizations':
        return immunizations.filter((entry) => entry.vaccineName.toLowerCase().includes(query) || entry.facility.toLowerCase().includes(query))
      case 'procedures':
        return procedures.filter((entry) => entry.name.toLowerCase().includes(query) || entry.facility.toLowerCase().includes(query))
    }
  }, [activeTab, allergies, conditions, immunizations, labResults, medications, procedures, searchQuery])

  const openDetail = (item: unknown, type: RecordTab) => {
    setSelectedItem(item)
    setSelectedType(type)
  }

  return (
    <ScreenContainer>
      <Header title={t('records.title')} subtitle={t('records.subtitle')} />

      <View style={styles.headerSpacing}>
        <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('records.searchPlaceholder')} />
      </View>

      <View style={styles.tabSection}>
        {isLargePhone ? (
          <View style={styles.tabGrid}>
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            const Icon = tab.icon
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabChip, styles.tabChipGrid, { flexBasis: tabChipWidth }, active ? styles.tabChipActive : null]}
                accessibilityRole="tab"
                accessibilityLabel={t('records.tabA11y', { label: tab.label, count: tab.count })}
                accessibilityHint={t('records.tabHint')}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
              >
                <Icon color={active ? '#FFFFFF' : colors.mutedForeground} size={16} />
                <Text style={[styles.tabChipText, active ? styles.tabChipTextActive : null]}>{tab.label}</Text>
                {tab.count ? (
                  <View style={[styles.tabCount, active ? styles.tabCountActive : null]}>
                    <Text style={[styles.tabCountText, active ? styles.tabCountTextActive : null]}>{tab.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map((tab) => {
            const active = tab.id === activeTab
            const Icon = tab.icon
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabChip, active ? styles.tabChipActive : null]}
                accessibilityRole="tab"
                accessibilityLabel={t('records.tabA11y', { label: tab.label, count: tab.count })}
                accessibilityHint={t('records.tabHint')}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
              >
                <Icon color={active ? '#FFFFFF' : colors.mutedForeground} size={16} />
                <Text style={[styles.tabChipText, active ? styles.tabChipTextActive : null]}>{tab.label}</Text>
                {tab.count ? (
                  <View style={[styles.tabCount, active ? styles.tabCountActive : null]}>
                    <Text style={[styles.tabCountText, active ? styles.tabCountTextActive : null]}>{tab.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
          </ScrollView>
        )}
      </View>

      <View style={styles.contentSection}>
        <View style={styles.list}>
          {activeTab === 'conditions' ? (
            filteredData.length ? (
              (filteredData as typeof conditions).map((condition) => (
                <HealthCard
                  key={condition.id}
                  title={condition.name}
                  subtitle={condition.treatingDoctor}
                  timestamp={condition.diagnosedDate}
                  icon={<Stethoscope color={colors.primary} size={20} />}
                  badge={{
                    label: t(`records.conditionStatus.${condition.status}`),
                    variant: condition.status === 'resolved' ? 'success' : 'warning',
                  }}
                  onPress={() => openDetail(condition, 'conditions')}
                />
              ))
            ) : (
              <EmptyState
                icon={<Stethoscope color={colors.mutedForeground} size={26} />}
                title={searchQuery ? t('records.empty.conditionsNotFound') : t('records.empty.conditionsNone')}
                message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.conditionsMessage')}
              />
            )
          ) : null}

        {activeTab === 'medications' ? (
          filteredData.length ? (
            (filteredData as typeof medications).map((medication) => (
              <MedicationCard
                key={medication.id}
                name={medication.name}
                dosage={medication.dosage}
                frequency={medication.frequency}
                prescribedBy={medication.prescribedBy}
                status={medication.status}
                instructions={medication.instructions}
                onPress={() => openDetail(medication, 'medications')}
              />
            ))
          ) : (
            <EmptyState
              icon={<Pill color={colors.mutedForeground} size={26} />}
              title={searchQuery ? t('records.empty.medicationsNotFound') : t('records.empty.medicationsNone')}
              message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.medicationsMessage')}
            />
          )
        ) : null}

        {activeTab === 'allergies' ? (
          filteredData.length ? (
            (filteredData as typeof allergies).map((allergy) => (
              <AllergyBadge
                key={allergy.id}
                name={allergy.name}
                severity={allergy.severity}
                type={allergy.type}
                reaction={allergy.reaction}
                onPress={() => openDetail(allergy, 'allergies')}
              />
            ))
          ) : (
            <EmptyState
              icon={<AlertTriangle color={colors.mutedForeground} size={26} />}
              title={searchQuery ? t('records.empty.allergiesNotFound') : t('records.empty.allergiesNone')}
              message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.allergiesMessage')}
            />
          )
        ) : null}

        {activeTab === 'labs' ? (
          filteredData.length ? (
            (filteredData as typeof labResults).map((lab) => (
              <HealthCard
                key={lab.id}
                title={lab.testName}
                subtitle={lab.facility}
                timestamp={lab.date}
                icon={<FlaskConical color={colors.primary} size={20} />}
                badge={{
                  label: t(`records.labStatus.${lab.status}`),
                  variant: lab.status === 'normal' ? 'success' : lab.status === 'abnormal' ? 'warning' : 'error',
                }}
                onPress={() => openDetail(lab, 'labs')}
              >
                <View style={[styles.resultRow, isCompact ? styles.resultRowCompact : null]}>
                  <Text style={styles.resultValue}>{lab.result}</Text>
                  {lab.unit ? <Text style={styles.resultUnit}>{lab.unit}</Text> : null}
                  {lab.status === 'normal' ? (
                    <Minus color={colors.success} size={16} />
                  ) : lab.status === 'abnormal' ? (
                    <TrendingUp color={colors.secondary} size={16} />
                  ) : (
                    <TrendingDown color={colors.error} size={16} />
                  )}
                </View>
              </HealthCard>
            ))
          ) : (
            <EmptyState
              icon={<FlaskConical color={colors.mutedForeground} size={26} />}
              title={searchQuery ? t('records.empty.labsNotFound') : t('records.empty.labsNone')}
              message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.labsMessage')}
            />
          )
        ) : null}

        {activeTab === 'immunizations' ? (
          filteredData.length ? (
            (filteredData as typeof immunizations).map((immunization) => (
              <HealthCard
                key={immunization.id}
                title={immunization.vaccineName}
                subtitle={immunization.facility}
                timestamp={immunization.dateAdministered}
                icon={<Syringe color={colors.primary} size={20} />}
                badge={immunization.nextDoseDate ? { label: t('records.nextDoseScheduled'), variant: 'info' } : undefined}
                onPress={() => openDetail(immunization, 'immunizations')}
              >
                {immunization.nextDoseDate ? (
                  <Text style={styles.helperText}>{t('records.nextDoseOn', { date: formatDate(immunization.nextDoseDate) })}</Text>
                ) : null}
              </HealthCard>
            ))
          ) : (
            <EmptyState
              icon={<Syringe color={colors.mutedForeground} size={26} />}
              title={searchQuery ? t('records.empty.immunizationsNotFound') : t('records.empty.immunizationsNone')}
              message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.immunizationsMessage')}
            />
          )
        ) : null}

        {activeTab === 'procedures' ? (
          filteredData.length ? (
            (filteredData as typeof procedures).map((procedure) => (
              <HealthCard
                key={procedure.id}
                title={procedure.name}
                subtitle={procedure.facility}
                timestamp={procedure.date}
                icon={<Scissors color={colors.primary} size={20} />}
                badge={{
                  label: t(`records.procedureStatus.${procedure.status}`),
                  variant:
                    procedure.status === 'completed'
                      ? 'success'
                      : procedure.status === 'scheduled'
                      ? 'info'
                      : 'error',
                }}
                onPress={() => openDetail(procedure, 'procedures')}
              >
                {procedure.surgeon ? <Text style={styles.helperText}>{t('records.surgeonName', { name: procedure.surgeon })}</Text> : null}
              </HealthCard>
            ))
          ) : (
            <EmptyState
              icon={<Scissors color={colors.mutedForeground} size={26} />}
              title={searchQuery ? t('records.empty.proceduresNotFound') : t('records.empty.proceduresNone')}
              message={searchQuery ? t('records.empty.tryDifferent') : t('records.empty.proceduresMessage')}
            />
          )
        ) : null}
      </View>
      </View>

      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => {
          setSelectedItem(null)
          setSelectedType(null)
        }}
        title={getDetailTitle(selectedItem, selectedType, t)}
        height="half"
      >
        {selectedItem && selectedType ? (
          <View style={styles.detailSheetContent}>
            {renderDetailContent(selectedItem, selectedType, t)}
            <View style={[styles.detailActions, stackedActions ? styles.detailActionsStacked : null]}>
              <SecondaryAction label={t('records.shareWithProvider')} icon={<Share2 color={colors.primary} size={16} />} />
              <PrimaryButton fullWidth leftIcon={<ExternalLink color="#FFFFFF" size={16} />}>
                {t('records.viewFullReport')}
              </PrimaryButton>
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </ScreenContainer>
  )
}

function SecondaryAction({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <PrimaryButton fullWidth variant="outline" leftIcon={icon}>
      {label}
    </PrimaryButton>
  )
}

function getDetailTitle(item: unknown, type: RecordTab | null, t: Translate) {
  if (!item || !type) {
    return t('common.details')
  }

  switch (type) {
    case 'labs':
      return (item as { testName: string }).testName
    case 'immunizations':
      return (item as { vaccineName: string }).vaccineName
    default:
      return (item as { name: string }).name
  }
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }

  return (
    <View style={styles.detailRow} accessible>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

function renderDetailContent(item: unknown, type: RecordTab, t: Translate) {
  switch (type) {
    case 'conditions': {
      const entry = item as {
        diagnosedDate: string
        notes?: string
        status: string
        treatingDoctor?: string
      }
      return (
        <View style={styles.detailContent}>
          <DetailRow label={t('records.detail.status')} value={t(`records.conditionStatus.${entry.status}`)} />
          <DetailRow label={t('records.detail.diagnosed')} value={formatDate(entry.diagnosedDate)} />
          <DetailRow label={t('records.detail.treatingDoctor')} value={entry.treatingDoctor} />
          {entry.notes ? (
            <View>
              <Text style={styles.detailLabel}>{t('records.detail.notes')}</Text>
              <Text style={styles.detailParagraph}>{entry.notes}</Text>
            </View>
          ) : null}
        </View>
      )
    }
    case 'medications': {
      const entry = item as {
        dosage: string
        endDate?: string
        frequency: string
        instructions?: string
        prescribedBy: string
        prescribedDate: string
        status: string
      }
      return (
        <View style={styles.detailContent}>
          <DetailRow label={t('records.detail.dosage')} value={entry.dosage} />
          <DetailRow label={t('records.detail.frequency')} value={entry.frequency} />
          <DetailRow label={t('records.detail.status')} value={t(`records.medicationStatus.${entry.status}`)} />
          <DetailRow label={t('records.detail.prescribedBy')} value={entry.prescribedBy} />
          <DetailRow label={t('records.detail.startDate')} value={formatDate(entry.prescribedDate)} />
          <DetailRow label={t('records.detail.endDate')} value={entry.endDate ? formatDate(entry.endDate) : undefined} />
          {entry.instructions ? (
            <View>
              <Text style={styles.detailLabel}>{t('records.detail.instructions')}</Text>
              <Text style={styles.detailParagraph}>{entry.instructions}</Text>
            </View>
          ) : null}
        </View>
      )
    }
    case 'allergies': {
      const entry = item as {
        diagnosedDate: string
        reaction?: string
        severity: string
        type: string
      }
      return (
        <View style={styles.detailContent}>
          <DetailRow label={t('records.detail.severity')} value={t(`records.severity.${entry.severity}`)} />
          <DetailRow label={t('records.detail.type')} value={t(`records.allergyType.${entry.type}`)} />
          <DetailRow label={t('records.detail.diagnosed')} value={formatDate(entry.diagnosedDate)} />
          {entry.reaction ? (
            <View>
              <Text style={styles.detailLabel}>{t('records.detail.reaction')}</Text>
              <Text style={styles.detailParagraph}>{entry.reaction}</Text>
            </View>
          ) : null}
        </View>
      )
    }
    case 'labs': {
      const entry = item as {
        date: string
        facility: string
        orderedBy: string
        referenceRange?: string
        result: string
        status: string
        unit?: string
      }
      return (
        <View style={styles.detailContent}>
          <View style={styles.resultHero}>
            <Text style={styles.resultHeroValue}>
              {entry.result}
              {entry.unit ? ` ${entry.unit}` : ''}
            </Text>
          </View>
          <DetailRow label={t('records.detail.status')} value={t(`records.labStatus.${entry.status}`)} />
          <DetailRow label={t('records.detail.referenceRange')} value={entry.referenceRange} />
          <DetailRow label={t('records.detail.date')} value={formatDate(entry.date)} />
          <DetailRow label={t('records.detail.orderedBy')} value={entry.orderedBy} />
          <DetailRow label={t('records.detail.facility')} value={entry.facility} />
        </View>
      )
    }
    case 'immunizations': {
      const entry = item as {
        administeredBy?: string
        dateAdministered: string
        facility: string
        lotNumber?: string
        nextDoseDate?: string
      }
      return (
        <View style={styles.detailContent}>
          <DetailRow label={t('records.detail.administered')} value={formatDate(entry.dateAdministered)} />
          <DetailRow label={t('records.detail.facility')} value={entry.facility} />
          <DetailRow label={t('records.detail.administeredBy')} value={entry.administeredBy} />
          <DetailRow label={t('records.detail.lotNumber')} value={entry.lotNumber} />
          <DetailRow label={t('records.detail.nextDose')} value={entry.nextDoseDate ? formatDate(entry.nextDoseDate) : undefined} />
        </View>
      )
    }
    case 'procedures': {
      const entry = item as {
        date: string
        facility: string
        notes?: string
        status: string
        surgeon?: string
      }
      return (
        <View style={styles.detailContent}>
          <DetailRow label={t('records.detail.status')} value={t(`records.procedureStatus.${entry.status}`)} />
          <DetailRow label={t('records.detail.date')} value={formatDate(entry.date)} />
          <DetailRow label={t('records.detail.facility')} value={entry.facility} />
          <DetailRow label={t('records.detail.surgeon')} value={entry.surgeon} />
          {entry.notes ? (
            <View>
              <Text style={styles.detailLabel}>{t('records.detail.notes')}</Text>
              <Text style={styles.detailParagraph}>{entry.notes}</Text>
            </View>
          ) : null}
        </View>
      )
    }
  }
}

const styles = StyleSheet.create({
  headerSpacing: {
    marginTop: spacing.xl,
  },
  tabSection: {
    marginTop: spacing.lg,
  },
  contentSection: {
    marginTop: spacing.xl,
  },
  tabRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabChipGrid: {
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  tabCount: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26,43,60,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabCountText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  resultRowCompact: {
    gap: spacing.xs,
  },
  resultValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  resultUnit: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  helperText: {
    color: colors.info,
    fontSize: 13,
    fontWeight: '600',
  },
  detailSheetContent: {
    gap: spacing.xl,
    paddingBottom: spacing.md,
  },
  detailContent: {
    gap: spacing.md,
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  detailParagraph: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  detailActions: {
    gap: spacing.md,
  },
  detailActionsStacked: {
    gap: spacing.md,
  },
  resultHero: {
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    paddingVertical: 20,
    alignItems: 'center',
  },
  resultHeroValue: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
})
