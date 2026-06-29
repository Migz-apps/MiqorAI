import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View } from 'react-native'

import { LoadingOverlay, OfflineBanner, SplashScreen, TabBar, ToastProvider, type TabId } from './src/components/ui'
import { usePatientStore } from './src/store'
import { colors } from './src/theme'
import { FamilyScreen } from './src/screens/FamilyScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { LoginScreen } from './src/screens/LoginScreen'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { RecordsScreen } from './src/screens/RecordsScreen'
import { ShareScreen } from './src/screens/ShareScreen'

function MiqorAIApp() {
  const {
    isAuthenticated,
    hasCompletedOnboarding,
    isOnline,
    offlineQueueCount,
    lastSyncTime,
    activePatient,
    refreshDerivedState,
    syncRemoteData,
  } = usePatientStore()

  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [isHydrated, setIsHydrated] = useState(usePatientStore.persist.hasHydrated())
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const unsubscribe = usePatientStore.persist.onFinishHydration(() => {
      refreshDerivedState()
      setIsHydrated(true)
    })

    if (usePatientStore.persist.hasHydrated()) {
      refreshDerivedState()
      setIsHydrated(true)
    }

    return unsubscribe
  }, [refreshDerivedState])

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return
    }

    void syncRemoteData().catch(() => undefined)
  }, [isAuthenticated, isHydrated, syncRemoteData])

  if (!isHydrated) {
    return <LoadingOverlay fullScreen message="Loading MiqorAI..." />
  }

  if (showSplash) {
    return <SplashScreen />
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {!isOnline ? (
        <OfflineBanner
          queueCount={offlineQueueCount}
          lastSync={lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : undefined}
        />
      ) : null}

      {activeTab === 'home' ? <HomeScreen onNavigate={setActiveTab} /> : null}
      {activeTab === 'records' ? <RecordsScreen /> : null}
      {activeTab === 'share' ? <ShareScreen /> : null}
      {activeTab === 'family' ? <FamilyScreen /> : null}
      {activeTab === 'profile' ? <ProfileScreen /> : null}

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="dark" translucent />
        <MiqorAIApp />
      </ToastProvider>
    </SafeAreaProvider>
  )
}
