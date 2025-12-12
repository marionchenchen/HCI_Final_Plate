// // frontend-app/app/_layout.tsx (修改後 - 暫時跳過登入)

// import { Stack } from 'expo-router';
// import React from 'react';
// import { View, ActivityIndicator } from "react-native";
// import { UserProvider, useUser } from "../context/UserContext";

// // 移除 useAuth 模擬 Hook，直接使用簡化的 RootLayout

// export default function RootLayout() {
//     return (
//         // 使用 Stack Navigator 來管理頁面群組
//         <Stack screenOptions={{ headerShown: false }}>

//             {/* 1. 確保 (main) 群組可以被直接訪問 */}
//             <Stack.Screen
//                 name="(main)"
//                 options={{
//                     headerShown: false,
//                     // ⚠️ 關鍵：移除 redirect 屬性，不強制導向 (auth)
//                 }}
//             />

//             {/* 2. 移除 (auth) 群組的 redirect 邏輯，讓它可以被當作一個普通的 Stack 使用 */}
//             <Stack.Screen
//                 name="(auth)"
//                 options={{
//                     headerShown: false,
//                     // ⚠️ 關鍵：移除 redirect 屬性，不強制登入
//                 }}
//             />

//             {/* 根路徑 index.tsx 仍保留 */}
//             <Stack.Screen name="index" />
//         </Stack>
//     );
// }
// frontend-app/app/_layout.tsx

import { Stack } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator } from "react-native";
import { UserProvider, useUser } from "../context/UserContext";

// 用來在 user_id 尚未初始化時顯示 Loading
function UserInitWrapper() {
    const { loading } = useUser();

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="(main)"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="(auth)"
                options={{ headerShown: false }}
            />
            <Stack.Screen name="index" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <UserProvider>
            <UserInitWrapper />
        </UserProvider>
    );
}
