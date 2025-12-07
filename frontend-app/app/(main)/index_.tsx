// frontend-app/app/(main)/index.tsx

import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

// 主畫面
export default function MapPlaceholderScreen() {
  	const router = useRouter();

	const handleNewPost = () => {
		router.push('/(main)/newpost'); 
	};

	return (
		<View style={styles.container}>
		
		{/* @李芫 地圖加在這裡 */}
		<View style={styles.mapPlaceholder}>
			<Text style={styles.placeholderText}>
			[地圖區塊 Placeholder]
			</Text>
		</View>

		{/* 新增剩食 */}
		<TouchableOpacity 
			style={styles.addButton}
			onPress={handleNewPost}>
			<Text style={styles.addButtonText}>+</Text>
		</TouchableOpacity>
		
		</View>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#fff',
	},
	
	// 地圖
	mapPlaceholder: {
		width: '100%',
		height: '100%', 
		backgroundColor: 'white', //現在是白的
		justifyContent: 'center',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	placeholderText: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#ccc',
	},
	subText: {
		fontSize: 16,
		color: '#ccc',
		marginTop: 10,
	},
	
	// 新增剩食
	addButton: { 
		position: 'absolute', 
		bottom: 40,
		left: 0,
		right: 0,
		marginLeft: 'auto',
		marginRight: 'auto',
		backgroundColor: '#576238',
		width: 60, 
		height: 60, 
		borderRadius: 30, 
		justifyContent: 'center', 
		alignItems: 'center', 
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	addButtonText: { 
		color: 'white', 
		fontSize: 30, 
		lineHeight: 30,
	}
});