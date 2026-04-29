import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { fetchMerchantInsights } from "../../lib/ai";
import type { MerchantInsights, MerchantStatusBreakdown } from "../../types";

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatChange(value: number | null): string {
  if (value === null) return "New this week";
  if (value === 0) return "No change";
  return value > 0 ? `+${value}%` : `${value}%`;
}

function getChangeTone(value: number | null) {
  if (value === null || value === 0) return "#109669";
  return value > 0 ? "#109669" : "#e14c4c";
}

export default function MerchantInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<MerchantInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMerchantInsights();
      setAnalytics(data);
    } catch (err: any) {
      setError(err?.message || "Could not load merchant insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient colors={["#f0fff7", "#f6fff9", "#eefcf5"]} style={styles.background} />
        <View style={styles.glowTop} />
        <View style={styles.glowRight} />
        <View style={styles.glowBottom} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#109669" />
          <Text style={styles.loadingText}>Loading merchant AI insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={["#f0fff7", "#f6fff9", "#eefcf5"]} style={styles.background} />
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />
      <View style={styles.glowBottom} />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Merchant Insights</Text>
          <Text style={styles.headerSub}>Weekly collections with AI guidance</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadInsights();
            }}
            tintColor="#109669"
          />
        }
      >
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Insights unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadInsights}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {analytics ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>THIS WEEK</Text>
              <Text style={styles.heroAmount}>{formatCurrency(analytics.totalReceivedWeek)}</Text>
              <Text style={styles.heroBody}>
                {analytics.topPayer
                  ? `Top payer ${analytics.topPayer.name} contributed ${formatCurrency(analytics.topPayer.amount)}`
                  : "Receive payments this week to unlock payer trends"}
              </Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroFooterLabel}>vs last week</Text>
                <Text style={[styles.heroFooterValue, { color: getChangeTone(analytics.weekChangePct) }]}>
                  {formatChange(analytics.weekChangePct)}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Transactions"
                value={`${analytics.totalTransactionsWeek}`}
                hint="Processed this week"
              />
              <StatCard
                label="Pending Sync"
                value={`${analytics.pendingCount}`}
                hint={analytics.pendingCount > 0 ? formatCurrency(analytics.pendingAmount) : "All clear"}
              />
              <StatCard
                label="Failed"
                value={`${analytics.failedCount}`}
                hint={analytics.failedCount > 0 ? formatCurrency(analytics.failedAmount) : "No failures"}
              />
              <StatCard
                label="Top Payer"
                value={analytics.topPayer ? analytics.topPayer.name : "No data"}
                hint={analytics.topPayer ? formatCurrency(analytics.topPayer.amount) : "No customer trends"}
              />
            </View>

            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>AI Weekly Report</Text>
              <Text style={styles.aiBody}>{analytics.narrative}</Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Action Tip</Text>
              <Text style={styles.tipBody}>{analytics.actionTip}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Status Breakdown</Text>
            </View>
            <View style={styles.card}>
              {analytics.statusBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>No transaction status data yet for this week.</Text>
              ) : (
                analytics.statusBreakdown.map((statusItem) => (
                  <StatusRow key={statusItem.key} statusItem={statusItem} />
                ))
              )}
            </View>
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function StatusRow({ statusItem }: { statusItem: MerchantStatusBreakdown }) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryHeader}>
        <View>
          <Text style={styles.categoryLabel}>{statusItem.label}</Text>
          <Text style={styles.categoryHint}>{statusItem.count} payment{statusItem.count === 1 ? "" : "s"}</Text>
        </View>
        <Text style={styles.categoryAmount}>{formatCurrency(statusItem.amount)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(statusItem.share, 6)}%` }]} />
      </View>
      <Text style={styles.progressText}>{statusItem.share}% of weekly collection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fff7" },
  background: { ...StyleSheet.absoluteFillObject },
  glowTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#d9fbe8",
    top: -170,
    left: -100,
    opacity: 0.9,
  },
  glowRight: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#e3fced",
    top: 120,
    right: -120,
    opacity: 0.7,
  },
  glowBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#e8fff2",
    bottom: -160,
    left: -80,
    opacity: 0.7,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12,
    color: "#6f8a7d",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#b6e8cf",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  backArrow: { fontSize: 20, color: "#1f2433", fontWeight: "700" },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#1f2433" },
  headerSub: { fontSize: 12, color: "#6f8a7d", marginTop: 2, fontWeight: "600" },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991b1b",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#7f1d1d",
    fontWeight: "600",
  },
  retryBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#109669",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#8dc9ab",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#109669",
  },
  heroAmount: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "800",
    color: "#1f2433",
  },
  heroBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#4d6f61",
    fontWeight: "600",
  },
  heroFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroFooterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f8a7d",
  },
  heroFooterValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 14,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f8a7d",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2433",
  },
  statHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#546c63",
    fontWeight: "600",
  },
  aiCard: {
    backgroundColor: "#109669",
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
  },
  aiBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#ebfff4",
    fontWeight: "600",
  },
  tipCard: {
    backgroundColor: "#eef8f2",
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 8,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#166534",
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2433",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: "#6f8a7d",
    fontWeight: "600",
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2433",
    textTransform: "capitalize",
  },
  categoryHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6f8a7d",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#d9fbe8",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#109669",
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#546c63",
  },
});
