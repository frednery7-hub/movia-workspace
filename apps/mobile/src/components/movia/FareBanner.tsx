import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocale } from "../../context/LocaleContext";
import { FareColors } from "../../theme/colors";
import { useAppTheme } from "../../theme/ThemeContext";

type FarePeriod = "punta" | "valle" | "bajo";

interface FareBannerProps {
  period: FarePeriod;
  timeRange: string;
  timeRangeKey?: string;
}

export function FareBanner({
  period,
  timeRange,
  timeRangeKey,
}: FareBannerProps) {
  const { t } = useLocale();
  const theme = useAppTheme();
  const color = FareColors[period];
  const fareLabel: Record<FarePeriod, string> = {
    punta: t("fare.punta"),
    valle: t("fare.valle"),
    bajo: t("fare.bajo"),
  };
  const translatedTimeRange = timeRangeKey ? t(timeRangeKey) : timeRange;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.isDark ? color + "18" : color + "0D",
          borderLeftColor: color,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
        {fareLabel[period]}
      </Text>
      <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{translatedTimeRange}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderLeftWidth: 3,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 8,
    letterSpacing: -0.1,
  },
  time: { fontSize: 12, color: "#6B7280" },
});
