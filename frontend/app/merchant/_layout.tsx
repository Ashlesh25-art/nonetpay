import { Stack } from "expo-router";

export default function MerchantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="history" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="support" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
