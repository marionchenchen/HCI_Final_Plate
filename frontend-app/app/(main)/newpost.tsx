// frontend-app/app/(main)/newpost.tsx

import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, 
  TouchableOpacity, Alert, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ⭐️ 修正 1: 提取基礎輸入框樣式
const baseInputStyle = {
	borderWidth: 1,
	borderColor: '#E0E0E0',
	padding: 12,
	borderRadius: 8,
	fontSize: 16,
	backgroundColor: '#F9F9F9',
};

// ⭐️ 修正 2: 將 styles 定義提前，並使用 baseInputStyle 進行繼承
const styles = StyleSheet.create({
	scrollContainer: {
		paddingBottom: 40,
		backgroundColor: '#FAF9F6', 
		minHeight: Dimensions.get('window').height,
	},
	header: {
		paddingTop: 50,
		paddingBottom: 20,
		alignItems: 'center',
		backgroundColor: '#FAF9F6',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 20,
	},
	imagePlaceholder: {
		width: width * 0.25,
		height: width * 0.25,
		borderWidth: 2,
		borderColor: '#BDBDBD',
		borderStyle: 'dashed',
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
	},
	imageText: {
		marginTop: 5,
		color: '#BDBDBD',
	},
	
	formCard: {
		backgroundColor: 'white',
		marginHorizontal: 15,
		borderRadius: 15,
		padding: 20,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 5,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 15,
		marginBottom: 8,
		color: '#333',
	},
	// 使用提取的基礎樣式
	input: baseInputStyle, 
	
	noteInput: {
		height: 80,
		textAlignVertical: 'top',
	},

	foodItemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	foodNameInput: {
		flex: 2,
		marginRight: 10,
	},
	quantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	// 繼承時改為使用 baseInputStyle
	quantityInput: {
		...baseInputStyle, 
		flex: 1,
		padding: 12,
		marginRight: 5,
	},
	deleteButton: {
		padding: 5,
	},
	addFoodButton: {
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderStyle: 'dashed',
		borderRadius: 8,
		padding: 10,
		alignItems: 'center',
		marginTop: 5,
		marginBottom: 10,
	},
	addFoodText: {
		fontSize: 20,
		color: '#666',
	},

	ruleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
	},
	ruleText: {
		flex: 1,
		fontSize: 14,
		color: '#666',
	},
	// 繼承時改為使用 baseInputStyle
	ruleInput: {
		...baseInputStyle, 
		width: 50,
		textAlign: 'center',
		padding: 8,
		marginHorizontal: 5,
	},
	unitText: {
		fontSize: 14,
		color: '#666',
	},

	publishButton: {
		backgroundColor: '#333',
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 30,
	},
	publishButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
});


// 單一剩食資訊區塊的元件 (使用 styles)
const FoodItemInput = ({ index, foodItem, onFoodItemChange, onDelete }) => (
	<View style={styles.foodItemContainer}>
		<TextInput
		style={[styles.input, styles.foodNameInput]} 
		placeholder="請輸入剩食名稱 (例如：小木屋抹茶鬆餅)"
		value={foodItem.name}
		onChangeText={(text) => onFoodItemChange(index, 'name', text)}
		/>
		
		<View style={styles.quantityContainer}>
		<TextInput
			style={styles.quantityInput}
			placeholder="數量"
			keyboardType="numeric"
			value={foodItem.quantity}
			onChangeText={(text) => onFoodItemChange(index, 'quantity', text)}
		/>
		{index > 0 && (
			<TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(index)}>
			<Ionicons name="close-circle" size={24} color="#D32F2F" />
			</TouchableOpacity>
		)}
		</View>
	</View>
);


export default function NewPostScreen() {
	const router = useRouter();
	const [address, setAddress] = useState('工三一樓大廳');
	const [foodItems, setFoodItems] = useState([
		{ name: '小木屋抹茶鬆餅', quantity: '6' } 
	]);
	const [note, setNote] = useState('要自己帶容器喔！');
	const [reserveTime, setReserveTime] = useState('10');
	const [reserveDistance, setReserveDistance] = useState('2');

	const handleFoodItemChange = (index, key, value) => {
		const newFoodItems = [...foodItems];
		newFoodItems[index][key] = value;
		setFoodItems(newFoodItems);
	};

	const handleAddFoodItem = () => {
		setFoodItems([...foodItems, { name: '', quantity: '' }]);
	};

	const handleDeleteFoodItem = (index) => {
		const newFoodItems = foodItems.filter((_, i) => i !== index);
		setFoodItems(newFoodItems);
	};

	const handlePublish = async () => {
		if (!address || foodItems.length === 0 || !foodItems.every(f => f.name && f.quantity)) {
			Alert.alert('錯誤', '請至少填寫地點、剩食名稱和數量。');
			return;
		}
		
		console.log('--- 準備發布數據 ---');
		
		Alert.alert('發布成功 (模擬)', `已準備發布 ${foodItems.length} 筆剩食。`);
		router.back(); 
	};

	return (
		<KeyboardAvoidingView 
		style={{ flex: 1 }} 
		behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
		<ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
			<View style={styles.header}>
				<View style={styles.imagePlaceholder}>
					<FontAwesome name="plus" size={36} color="#BDBDBD" />
					<Text style={styles.imageText}>Add Food Image</Text>
				</View>
			</View>

			<View style={styles.formCard}>
			
			<Text style={styles.label}><Ionicons name="location" size={18} color="#333" /> 詳細地點</Text>
			<TextInput style={styles.input} value={address} onChangeText={setAddress} />

			<Text style={styles.label}><Ionicons name="document-text" size={18} color="#333" /> 剩食數量</Text>
			
			{foodItems.map((item, index) => (
				<FoodItemInput 
				key={index}
				index={index}
				foodItem={item}
				onFoodItemChange={handleFoodItemChange}
				onDelete={handleDeleteFoodItem}
				/>
			))}

			<TouchableOpacity style={styles.addFoodButton} onPress={handleAddFoodItem}>
				<Text style={styles.addFoodText}>+</Text>
			</TouchableOpacity>

			<Text style={styles.label}><Ionicons name="create" size={18} color="#333" /> 備註</Text>
			<TextInput 
				style={[styles.input, styles.noteInput]} 
				value={note} 
				onChangeText={setNote} 
				multiline 
				placeholder="請輸入備註"
			/>

			<Text style={[styles.label, { marginTop: 20 }]}>預約規則設定</Text>
			
			<View style={styles.ruleContainer}>
				<Ionicons name="time" size={24} color="#666" style={{ marginRight: 10 }} />
				<Text style={styles.ruleText}>領取者若未在此時限內抵達，預約會被取消</Text>
				<TextInput 
				style={styles.ruleInput} 
				keyboardType="numeric" 
				value={reserveTime} 
				onChangeText={setReserveTime} 
				/>
				<Text style={styles.unitText}>分鐘</Text>
			</View>
			
			<View style={styles.ruleContainer}>
				<Ionicons name="map" size={24} color="#666" style={{ marginRight: 10 }} />
				<Text style={styles.ruleText}>僅開放此範圍內的預約</Text>
				<TextInput 
				style={styles.ruleInput} 
				keyboardType="numeric" 
				value={reserveDistance} 
				onChangeText={setReserveDistance} 
				/>
				<Text style={styles.unitText}>公里</Text>
			</View>
			
			<TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
				<Text style={styles.publishButtonText}>確定發布剩食</Text>
			</TouchableOpacity>
			</View>
		</ScrollView>
		</KeyboardAvoidingView>
	);
}