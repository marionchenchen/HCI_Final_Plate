// frontend-app/app/(main)/_layout.tsx

import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: '#576238' }, 
        headerTintColor: '#fff',
        headerTitleAlign: 'center', 
      }}
    >
      
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '剩食地圖 (主頁)',
          headerShown: false, 
        }} 
      /> 
      
      <Stack.Screen 
        name="newpost" 
        options={{ 
            title: '發布剩食資訊',
        }} 
      />

      {/* ⭐️ 新增 Provider 頁面設定 */}
      <Stack.Screen
        name="food-provider"
        options={{
            title: '剩食資訊 (發布者)',
            headerShown: false,
        }}
      />

      {/* ⭐️ 新增 Receiver 頁面設定 */}
      <Stack.Screen
        name="food-receiver"
        options={{
            title: '剩食資訊',
            headerShown: false, // 由於設計風格自帶 Header (如圖片所示)，這裡隱藏系統 Header
        }}
      />

      {/* ⭐️ 新增 預約數量 頁面設定 */}
      <Stack.Screen
        name="reserve-quantity"
        options={{
            title: '預約剩食',
            headerShown: false, // 由於設計風格自帶 Header，這裡隱藏系統 Header
        }}
      />
    </Stack>
  );
}