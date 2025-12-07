// frontend-app/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

// 認證流程的導航堆疊
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* login.tsx 對應的頁面 */}
      <Stack.Screen name="login" /> 
      {/* register.tsx 對應的頁面 */}
      <Stack.Screen name="register" /> 
    </Stack>
  );
}