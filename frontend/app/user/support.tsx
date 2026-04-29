import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { buildAiClientContext, fetchSupportReply } from "../../lib/ai";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  meta?: {
    voucherId: string;
    merchantName: string;
    status: string;
    failureReason?: string;
  } | null;
};

const DEFAULT_PROMPTS = [
  "Why was my payment rejected?",
  "Show my latest offline transactions",
  "Give my weekly spending insights",
  "How do offline payments work?",
  "Why is my balance different offline?",
  "How do I report an issue?",
  "What should I do next?",
];
const SUPPORT_EMAIL = "ashleshskumar12@gmail.com";

export default function UserSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hi, I am your NONETPAY assistant. Ask me about rejected payments, offline vouchers, sync delays, or wallet differences and I will use your app context to answer.",
      meta: null,
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  };

  const reportIssueByEmail = async () => {
    try {
      const context = await buildAiClientContext();
      const txns = (context.offlineTransactions || [])
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recent = txns.slice(0, 5);
      const pendingCount = txns.filter((transaction) => transaction.status === "pending").length;
      const failedCount = txns.filter((transaction) => transaction.status === "failed").length;
      const latestMeta =
        [...messages].reverse().find((message) => message.role === "assistant" && message.meta)?.meta || null;
      const chatSummary = messages
        .slice(-6)
        .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`)
        .join("\n");

      const lines = [
        "Hello NONETPAY Support Team,",
        "",
        "I want to report an issue from the user app.",
        "",
        `Cached wallet balance: Rs ${context.cachedBalance ?? "N/A"}`,
        `Pending offline transactions: ${pendingCount}`,
        `Failed offline transactions: ${failedCount}`,
        "",
        "Recent offline transactions:",
        recent.length
          ? recent
              .map(
                (transaction, index) =>
                  `${index + 1}. ${transaction.voucherId} | Rs ${Number(transaction.amount) || 0} | ${
                    transaction.merchantName || transaction.merchantId
                  } | ${transaction.status} | ${transaction.timestamp}`
              )
              .join("\n")
          : "No offline transactions found.",
        "",
      ];

      if (latestMeta) {
        lines.push(
          "AI matched transaction:",
          `Voucher: ${latestMeta.voucherId}`,
          `Merchant: ${latestMeta.merchantName}`,
          `Status: ${latestMeta.status}`,
          latestMeta.failureReason ? `Failure reason: ${latestMeta.failureReason}` : "Failure reason: N/A",
          ""
        );
      }

      lines.push(
        "Recent AI conversation:",
        chatSummary || "No conversation available yet.",
        "",
        "Please check and help me resolve this issue.",
        ""
      );

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        "NONETPAY User Support Report"
      )}&body=${encodeURIComponent(lines.join("\n"))}`;
      const canOpen = await Linking.canOpenURL(mailto);
      if (!canOpen) {
        throw new Error("No email app is available on this device.");
      }
      await Linking.openURL(mailto);
    } catch (error: any) {
      Alert.alert("Report Failed", error?.message || "Could not open email app right now.");
    }
  };

  const sendPrompt = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const data = await fetchSupportReply(text);
      setPrompts(data.suggestions.length > 0 ? data.suggestions : DEFAULT_PROMPTS);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.reply,
          meta: data.matchedTransaction || null,
        },
      ]);
    } catch (error: any) {
      Alert.alert("Support Unavailable", error?.message || "Could not reach support right now.");
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={["#f7f3ff", "#f9f7ff", "#f3f1ff"]} style={styles.background} />
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={[styles.keyboardWrap, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 24}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>AI Support</Text>
            <Text style={styles.headerSub}>Context-aware customer help</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>AI ASSISTED</Text>
            <Text style={styles.heroTitle}>Ask about voucher issues, sync delays, and balance mismatches</Text>
            <Text style={styles.heroBody}>
              The assistant checks your local offline queue and recent payment history before answering.
            </Text>
            <Pressable style={styles.reportBtn} onPress={reportIssueByEmail}>
              <Text style={styles.reportBtnText}>Report Issue to Support</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Try asking</Text>
          <View style={styles.promptWrap}>
            {prompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={({ pressed }) => [styles.promptChip, pressed && styles.promptChipPressed]}
                onPress={() => sendPrompt(prompt)}
                disabled={sending}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Conversation</Text>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user" ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === "user" ? styles.userText : styles.assistantText,
                  ]}
                >
                  {message.text}
                </Text>
                {message.meta ? (
                  <View style={styles.metaCard}>
                    <Text style={styles.metaTitle}>Matched transaction</Text>
                    <Text style={styles.metaText}>{message.meta.merchantName}</Text>
                    <Text style={styles.metaText}>Voucher: {message.meta.voucherId}</Text>
                    <Text style={styles.metaText}>Status: {message.meta.status}</Text>
                    {message.meta.failureReason ? (
                      <Text style={styles.metaHint}>Reason: {message.meta.failureReason}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          {sending ? (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#6f63ff" />
                <Text style={styles.typingText}>Checking your payment context...</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 18 }} />
        </ScrollView>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about a payment, voucher, or balance issue"
            placeholderTextColor="#9ca3af"
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={() => sendPrompt(input)}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f7f3ff" },
  background: { ...StyleSheet.absoluteFillObject },
  keyboardWrap: { flex: 1 },
  glowTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#efe9ff",
    top: -170,
    left: -100,
    opacity: 0.9,
  },
  glowRight: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#f3eaff",
    top: 120,
    right: -120,
    opacity: 0.7,
  },
  glowBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#f0f7ff",
    bottom: -160,
    left: -80,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#c6bff3",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  backArrow: { fontSize: 20, color: "#1f2433", fontWeight: "700" },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#1f2433" },
  headerSub: { fontSize: 12, color: "#8b8fa6", marginTop: 2, fontWeight: "600" },
  headerSpacer: { width: 40 },
  scroll: { paddingHorizontal: 18, paddingBottom: 14 },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#b8aef0",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#6f63ff",
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2433",
    lineHeight: 27,
  },
  heroBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    fontWeight: "600",
  },
  reportBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#ece9ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8d0ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reportBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4f46e5",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2433",
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  promptChip: {
    backgroundColor: "#f2efff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#dfd7ff",
  },
  promptChipPressed: {
    opacity: 0.75,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#584ccf",
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: "row",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userBubble: {
    backgroundColor: "#6f63ff",
    borderBottomRightRadius: 8,
  },
  assistantBubble: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomLeftRadius: 8,
    shadowColor: "#c6bff3",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  userText: { color: "#fff" },
  assistantText: { color: "#1f2433" },
  metaCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#f6f4ff",
    padding: 12,
  },
  metaTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6f63ff",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 3,
  },
  metaHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    fontWeight: "600",
  },
  typingRow: {
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: Platform.OS === "ios" ? 16 : 8,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 22,
    shadowColor: "#c6bff3",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 4,
    fontSize: 14,
    color: "#1f2433",
    fontWeight: "600",
  },
  sendBtn: {
    backgroundColor: "#6f63ff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
});
