import {
  AlertCircle,
  Building2,
  Clock3,
  Eye,
  FlaskConical,
  History,
  Pill,
  Plus,
  QrCode,
  Share2,
  Shield,
  Stethoscope,
} from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { isPast, parseISO } from 'date-fns'

import {
  ActivityCard,
  BottomSheet,
  ConfirmSheet,
  EmptyState,
  Header,
  OptionCards,
  PrimaryButton,
  ScreenContainer,
  SearchInput,
  SegmentedControl,
  SectionHeader,
} from '../components/ui'
import { useResponsive } from '../responsive'
import { AccessGrant, usePatientStore } from '../store'
import { colors, radius, shadows, spacing } from '../theme'
import { formatDateTime, formatDistanceText } from '../utils'

type ViewMode = 'grants' | 'log'
type GrantMethod = 'qr' | 'manual'

const providerIcons = {
  hospital: Building2,
  clinic: Building2,
  pharmacy: Pill,
  laboratory: FlaskConical,
  doctor: Stethoscope,
}

export function ShareScreen() {
  const { grants, activityLog, revokeGrant, addGrant } = usePatientStore()
  const { isCompact } = useResponsive()

  const [viewMode, setViewMode] = useState<ViewMode>('grants')
  const [showNewGrantSheet, setShowNewGrantSheet] = useState(false)
  const [showGrantDetail, setShowGrantDetail] = useState(false)
  const [selectedGrant, setSelectedGrant] = useState<AccessGrant | null>(null)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [grantToRevoke, setGrantToRevoke] = useState<AccessGrant | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [grantMethod, setGrantMethod] = useState<GrantMethod>('qr')
  const [providerId, setProviderId] = useState('')
  const [accessDuration, setAccessDuration] = useState('7d')
  const [isGranting, setIsGranting] = useState(false)

  const activeGrants = useMemo(
    () => grants.filter((entry) => !isPast(parseISO(entry.expiresAt))),
    [grants],
  )
  const expiredGrants = useMemo(
    () => grants.filter((entry) => isPast(parseISO(entry.expiresAt))),
    [grants],
  )
  const sortedActivityLog = useMemo(
    () => [...activityLog].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [activityLog],
  )

  const handleGrantAccess = async () => {
    if (!providerId.trim()) {
      return
    }

    setIsGranting(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const durationMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    }[accessDuration] ?? 7 * 24 * 60 * 60 * 1000

    addGrant({
      id: `grant-${Date.now()}`,
      providerName: providerId.trim(),
      providerType: 'hospital',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
      accessLevel: 'full',
    })

    setIsGranting(false)
    setShowNewGrantSheet(false)
    setProviderId('')
    setAccessDuration('7d')
  }

  const handleRevoke = async () => {
    if (!grantToRevoke) {
      return
    }

    setIsRevoking(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    revokeGrant(grantToRevoke.id)
    setIsRevoking(false)
    setShowRevokeConfirm(false)
    setGrantToRevoke(null)
  }

  return (
    <ScreenContainer>
      <Header title="Access Control" subtitle="Manage who can see your records" />

      <View style={styles.headerSpacing}>
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grants', label: `Active Grants (${activeGrants.length})` },
            { value: 'log', label: 'Access Log' },
          ]}
        />
      </View>

      <View style={styles.contentSection}>

      {viewMode === 'grants' ? (
        <View style={styles.stack}>
          {activeGrants.length ? (
            activeGrants.map((grant) => {
              const Icon = providerIcons[grant.providerType]
              return (
                <Pressable
                  key={grant.id}
                  style={[styles.grantCard, isCompact ? styles.grantCardCompact : null]}
                  onPress={() => {
                    setSelectedGrant(grant)
                    setShowGrantDetail(true)
                  }}
                >
                  <View style={styles.grantIconWrap}>
                    <Icon color={colors.primary} size={24} />
                  </View>
                  <View style={styles.grantBody}>
                    <View style={[styles.grantTop, isCompact ? styles.grantTopCompact : null]}>
                      <View>
                        <Text style={styles.grantTitle}>{grant.providerName}</Text>
                        <Text style={styles.grantSubtitle}>{grant.providerType}</Text>
                      </View>
                      <View
                        style={[
                          styles.levelBadge,
                          grant.accessLevel === 'full'
                            ? styles.levelBadgeSuccess
                            : grant.accessLevel === 'partial'
                            ? styles.levelBadgeWarning
                            : styles.levelBadgeDanger,
                        ]}
                      >
                        <Text
                          style={[
                            styles.levelBadgeText,
                            grant.accessLevel === 'full'
                              ? styles.levelBadgeSuccessText
                              : grant.accessLevel === 'partial'
                              ? styles.levelBadgeWarningText
                              : styles.levelBadgeDangerText,
                          ]}
                        >
                          {grant.accessLevel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.grantMetaRow}>
                      <View style={styles.inlineMeta}>
                        <Clock3 color={colors.mutedForeground} size={12} />
                        <Text style={styles.metaText}>Expires {formatDistanceText(grant.expiresAt)}</Text>
                      </View>
                      {grant.lastUsed ? (
                        <View style={styles.inlineMeta}>
                          <Eye color={colors.mutedForeground} size={12} />
                          <Text style={styles.metaText}>Used {formatDistanceText(grant.lastUsed)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )
            })
          ) : (
            <EmptyState
              icon={<Shield color={colors.mutedForeground} size={26} />}
              title="No active grants"
              message="You haven't granted access to any providers yet."
            />
          )}

          {expiredGrants.length ? (
            <View style={styles.stack}>
              <SectionHeader title={`Expired (${expiredGrants.length})`} />
              {expiredGrants.map((grant) => {
                const Icon = providerIcons[grant.providerType]
                return (
                  <View key={grant.id} style={[styles.expiredCard, isCompact ? styles.expiredCardCompact : null]}>
                    <View style={styles.expiredIconWrap}>
                      <Icon color={colors.mutedForeground} size={20} />
                    </View>
                    <View style={styles.expiredCopy}>
                      <Text style={styles.expiredTitle}>{grant.providerName}</Text>
                      <Text style={styles.metaText}>Expired {formatDistanceText(grant.expiresAt)}</Text>
                    </View>
                    <View style={styles.expiredBadge}>
                      <Text style={styles.expiredBadgeText}>Expired</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : null}

          <Pressable style={styles.newGrantCard} onPress={() => setShowNewGrantSheet(true)}>
            <View style={styles.newGrantIcon}>
              <Plus color={colors.primary} size={22} />
            </View>
            <Text style={styles.newGrantTitle}>Grant New Access</Text>
            <Text style={styles.newGrantText}>Scan hospital QR code or enter provider ID</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stack}>
          {sortedActivityLog.length ? (
            sortedActivityLog.map((entry) => (
              <ActivityCard
                key={entry.id}
                action={entry.action}
                provider={entry.provider}
                details={entry.details}
                timestamp={entry.timestamp}
              />
            ))
          ) : (
            <EmptyState
              icon={<History color={colors.mutedForeground} size={26} />}
              title="No activity yet"
              message="Access logs will appear here when providers view your records."
            />
          )}
        </View>
      )}
      </View>

      <BottomSheet
        isOpen={showNewGrantSheet}
        onClose={() => setShowNewGrantSheet(false)}
        title="Grant Access"
        subtitle="Allow a provider to view your records"
        height="half"
      >
        <View style={styles.sheetStack}>
          <SegmentedControl
            value={grantMethod}
            onChange={setGrantMethod}
            options={[
              { value: 'qr', label: 'Scan QR Code' },
              { value: 'manual', label: 'Enter Provider ID' },
            ]}
          />

          {grantMethod === 'qr' ? (
            <View style={styles.qrPlaceholder}>
              <QrCode color={colors.mutedForeground} size={42} />
              <Text style={styles.qrPlaceholderTitle}>Camera access required</Text>
              <Text style={styles.qrPlaceholderText}>Point your camera at the provider&apos;s QR code.</Text>
              <PrimaryButton variant="outline">Open Camera</PrimaryButton>
            </View>
          ) : (
            <View style={styles.sheetStack}>
              <SearchInput
                value={providerId}
                onChangeText={setProviderId}
                placeholder="e.g., MediClinic Hospital"
              />

              <OptionCards
                value={accessDuration}
                onChange={setAccessDuration}
                options={[
                  { value: '24h', label: '24 Hours' },
                  { value: '7d', label: '7 Days' },
                  { value: '30d', label: '30 Days' },
                  { value: '1y', label: '1 Year' },
                ]}
              />

              <View style={styles.infoCard}>
                <AlertCircle color={colors.info} size={18} />
                <Text style={styles.infoCardText}>
                  The provider will only be able to view your records during this time period. You can revoke access at any time.
                </Text>
              </View>

              <PrimaryButton fullWidth onPress={handleGrantAccess} isLoading={isGranting} disabled={!providerId.trim()}>
                Grant Access
              </PrimaryButton>
            </View>
          )}
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showGrantDetail}
        onClose={() => setShowGrantDetail(false)}
        title={selectedGrant?.providerName || 'Grant Details'}
        height="half"
      >
        {selectedGrant ? (
          <View style={styles.sheetStack}>
            <DetailRow label="Provider Type" value={selectedGrant.providerType} />
            <DetailRow label="Access Level" value={selectedGrant.accessLevel} />
            <DetailRow label="Granted On" value={formatDateTime(selectedGrant.grantedAt)} />
            <DetailRow label="Expires On" value={formatDateTime(selectedGrant.expiresAt)} />
            <DetailRow label="Last Accessed" value={selectedGrant.lastUsed ? formatDateTime(selectedGrant.lastUsed) : undefined} />

            {selectedGrant.recordsAccessed?.length ? (
              <View style={styles.recordsAccessed}>
                <Text style={styles.detailLabel}>Records Accessed</Text>
                <View style={styles.recordsAccessedRow}>
                  {selectedGrant.recordsAccessed.map((record) => (
                    <View key={record} style={styles.recordPill}>
                      <Text style={styles.recordPillText}>{record}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <PrimaryButton
              fullWidth
              variant="danger"
              onPress={() => {
                setGrantToRevoke(selectedGrant)
                setShowGrantDetail(false)
                setShowRevokeConfirm(true)
              }}
            >
              Revoke Access
            </PrimaryButton>
          </View>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        isOpen={showRevokeConfirm}
        onClose={() => {
          setShowRevokeConfirm(false)
          setGrantToRevoke(null)
        }}
        onConfirm={handleRevoke}
        title="Revoke Access?"
        message={`${grantToRevoke?.providerName} will no longer be able to view your medical records.`}
        confirmLabel="Revoke"
        variant="danger"
        isLoading={isRevoking}
      />
    </ScreenContainer>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  headerSpacing: {
    marginTop: spacing.xl,
  },
  contentSection: {
    marginTop: spacing.xl,
  },
  stack: {
    gap: spacing.md,
  },
  grantCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.card,
  },
  grantCardCompact: {
    flexDirection: 'column',
  },
  grantIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantBody: {
    flex: 1,
    gap: spacing.sm,
  },
  grantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  grantTopCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  grantTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  grantSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  levelBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  levelBadgeSuccess: {
    backgroundColor: '#E8F7EF',
  },
  levelBadgeWarning: {
    backgroundColor: '#FFF4E1',
  },
  levelBadgeDanger: {
    backgroundColor: '#FDECE8',
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  levelBadgeSuccessText: {
    color: colors.success,
  },
  levelBadgeWarningText: {
    color: colors.secondary,
  },
  levelBadgeDangerText: {
    color: colors.error,
  },
  grantMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  expiredCard: {
    borderRadius: radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    opacity: 0.72,
  },
  expiredCardCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  expiredIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredCopy: {
    flex: 1,
    gap: 2,
  },
  expiredTitle: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  expiredBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  expiredBadgeText: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: '700',
  },
  newGrantCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#A9D5CC',
    backgroundColor: '#F5FCFB',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  newGrantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGrantTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  newGrantText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  sheetStack: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  qrPlaceholder: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  qrPlaceholderTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  qrPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    borderRadius: radius.md,
    backgroundColor: '#EAF4FB',
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoCardText: {
    flex: 1,
    color: colors.info,
    fontSize: 13,
    lineHeight: 20,
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
    textTransform: 'capitalize',
  },
  recordsAccessed: {
    gap: spacing.sm,
  },
  recordsAccessedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recordPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  recordPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
})
