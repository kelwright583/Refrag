/**
 * Cases tab - stack for case list, detail, evidence, mandate
 */
import { Stack } from 'expo-router';

export default function CasesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/evidence" />
      <Stack.Screen name="[id]/mandate" />
    </Stack>
  );
}
