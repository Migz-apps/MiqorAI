import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { translate } from '../i18n'
import { flushPersistedState, usePatientStore } from '../store'
import { colors, radius, spacing } from '../theme'

type State = {
  error: Error | null
  // Changing the key remounts the whole tree below the boundary on retry.
  resetKey: number
  signingOut: boolean
}

// Catches render errors anywhere in the app and shows a recovery screen instead
// of a blank one. Errors are logged to the console in development only; no
// third-party crash reporting is involved.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, resetKey: 0, signingOut: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('Unhandled render error', error, info.componentStack)
    }
  }

  private retry = () => {
    this.setState((state) => ({ error: null, resetKey: state.resetKey + 1 }))
  }

  // Last resort: a corrupted session or cached record can make every render
  // throw, so drop local state (the server keeps the records) and start over.
  private signOutAndRestart = async () => {
    this.setState({ signingOut: true })
    const store = usePatientStore.getState()
    try {
      await store.logout()
    } catch {
      store.clearAllData()
    }
    await flushPersistedState().catch(() => undefined)
    this.setState((state) => ({ error: null, signingOut: false, resetKey: state.resetKey + 1 }))
  }

  render() {
    const { error, resetKey, signingOut } = this.state

    if (!error) {
      return <React.Fragment key={resetKey}>{this.props.children}</React.Fragment>
    }

    return (
      <ScrollView contentContainerStyle={styles.root} style={styles.scroll}>
        <View style={styles.mark}>
          <Text style={styles.markText}>M+</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {translate('errorBoundary.title')}
        </Text>
        <Text style={styles.message} accessibilityLiveRegion="assertive" accessibilityRole="alert">
          {translate('errorBoundary.message')}
        </Text>

        <Pressable
          style={[styles.button, styles.primary]}
          onPress={this.retry}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel={translate('errorBoundary.retry')}
          accessibilityHint={translate('errorBoundary.retryHint')}
          accessibilityState={{ disabled: signingOut }}
        >
          <Text style={styles.primaryText}>{translate('errorBoundary.retry')}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => void this.signOutAndRestart()}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel={translate('errorBoundary.signOut')}
          accessibilityHint={translate('errorBoundary.signOutHint')}
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
        >
          <Text style={styles.secondaryText}>{translate('errorBoundary.signOut')}</Text>
        </Pressable>

        {__DEV__ ? (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>{translate('errorBoundary.details')}</Text>
            <Text style={styles.detailsText}>{error.message}</Text>
          </View>
        ) : null}
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: colors.primaryForeground,
    fontSize: 22,
    fontWeight: '900',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 420,
  },
  button: {
    minHeight: 48,
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.card,
  },
  secondaryText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundGrey,
  },
  detailsTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  detailsText: {
    color: colors.textPrimary,
    fontSize: 12,
  },
})
