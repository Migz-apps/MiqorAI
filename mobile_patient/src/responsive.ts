import { useWindowDimensions } from 'react-native'

export function useResponsive() {
  const { width, height } = useWindowDimensions()
  const shortestSide = Math.min(width, height)
  const isCompact = width < 360
  const isSmallPhone = width < 390
  const isPhone = width < 600
  const isLargePhone = width >= 480
  const isTablet = width >= 768
  const isDesktopLike = width >= 1024
  const horizontalPadding = isCompact ? 14 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktopLike ? 920 : isTablet ? 760 : 560
  const modalMaxWidth = isDesktopLike ? 760 : isTablet ? 680 : Math.max(320, width - horizontalPadding * 2)
  const cardColumns = isTablet ? 3 : isLargePhone ? 2 : 1
  const recoveryColumns = isTablet ? 4 : isLargePhone ? 3 : 2
  const stackedActions = width < 400

  return {
    width,
    height,
    shortestSide,
    isCompact,
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isDesktopLike,
    horizontalPadding,
    contentMaxWidth,
    modalMaxWidth,
    cardColumns,
    recoveryColumns,
    stackedActions,
  }
}

