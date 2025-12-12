// frontend-app/app/(main)/_layout.tsx

import { Stack } from 'expo-router';
import { UserProvider } from "../../context/UserContext"


export default function MainLayout() {
	return (
		<UserProvider>
		<Stack screenOptions={{ 
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
		</Stack>
		</UserProvider>
	);
}