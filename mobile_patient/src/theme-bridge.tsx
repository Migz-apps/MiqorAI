import { vars } from "nativewind";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { useThemeColors } from "./theme";

interface ThemeBridgeProps {
    children: ReactNode;
}

export function ThemeBridge({ children }: ThemeBridgeProps) {
    const colors = useThemeColors();

    const themeVars = vars({
        "--color-primary": colors.primary,
        "--color-primary-light": colors.primaryLight,
        "--color-primary-fg": colors.primaryForeground,
        "--color-secondary": colors.secondary,
        "--color-secondary-fg": colors.secondaryForeground,
        "--color-success": colors.success,
        "--color-success-fg": colors.successForeground,
        "--color-error": colors.error,
        "--color-error-fg": colors.errorForeground,
        "--color-info": colors.info,
        "--color-info-fg": colors.infoForeground,
        "--color-background": colors.background,
        "--color-background-grey": colors.backgroundGrey,
        "--color-foreground": colors.foreground,
        "--color-text-primary": colors.textPrimary,
        "--color-text-secondary": colors.textSecondary,
        "--color-border": colors.border,
        "--color-input": colors.input,
        "--color-ring": colors.ring,
        "--color-overlay": colors.overlay,
        "--color-allergy-bg": colors.allergyBg,
        "--color-allergy-text": colors.allergyText,
        "--color-card": colors.card,
        "--color-muted": colors.muted,
        "--color-muted-fg": colors.mutedForeground,
        "--color-accent": colors.accent,
        "--color-accent-fg": colors.accentForeground,
    });

    return (
        <View style={[themeVars, { flex: 1 }]}>
            {children}
        </View>
    );
}
