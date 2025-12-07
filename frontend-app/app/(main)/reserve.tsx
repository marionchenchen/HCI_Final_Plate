import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, Alert 
} from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const LocalFoodImage = require('../../assets/pizza.jpg'); 

// 模擬剩食資料
const DUMMY_FOOD_INFO = {
    imageSource: LocalFoodImage, 
    title: '女二路易莎前桌子',
    details: '建議自備容器/衛生紙',
    food_items: [
      { name: '蒜香起司燻雞培根披薩', remaining: 3 },
      { name: '香濃蒔蔬海鮮披薩', remaining: 5 },
    ],
};

export default function ReserveQuantityScreen() {
    const router = useRouter();
    const [reserveQuantities, setReserveQuantities] = useState({});

    const handleQuantityChange = (foodName, quantity) => {
        setReserveQuantities(prev => ({
            ...prev,
            [foodName]: quantity.replace(/[^0-9]/g, ''), 
        }));
    };

    const handleReservationSubmit = () => {
        console.log('提交的預約數量:', reserveQuantities);
        Alert.alert('預約成功 (模擬)', '已向發布者送出您的預約訂單。');
        router.back(); // 提交後返回前一頁 (Receiver Info Screen)
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.quantityBody}>
                
                {/* 圖片與主要資訊 */}
                <View style={styles.quantityInfo}>
                    <Image 
                        source={DUMMY_FOOD_INFO.imageSource} 
                        style={styles.quantityInfoImage}
                    />
                    <Text style={styles.quantityInfoTitle}>{DUMMY_FOOD_INFO.title}</Text>
                    <Text style={styles.quantityInfoDetail}>{DUMMY_FOOD_INFO.details}</Text>
                    <View style={styles.quantityInfoDistance}>
                        <Ionicons name="walk" size={18} color="#333" />
                        <Text style={{marginLeft: 5, color: '#333'}}>7 mins</Text>
                    </View>
                </View>
                
                {/* 評論區 */}
                <Text style={styles.commentLabel}>其他人對這份食物的評論</Text>
                <View style={styles.commentBox}>
                    <Ionicons name="caret-back" size={24} color="#333" />
                    <TextInput style={styles.commentInput} value="還是溫的" editable={false} />
                    <Ionicons name="caret-forward" size={24} color="#333" />
                </View>

                {/* 預約數量區塊 */}
                <View style={styles.quantityFormCard}>
                    <View style={styles.quantityFormTitle}>
                        <Ionicons name="document-text" size={24} color="#576238" />
                        <Text style={styles.quantityFormTitleText}>預約數量</Text>
                    </View>
                    
                    {DUMMY_FOOD_INFO.food_items.map((item, index) => (
                        <View key={index} style={styles.quantityInputRow}>
                            <Text style={styles.quantityFoodName}>{item.name}</Text>
                            <Text style={styles.quantityRemaining}>剩餘 {item.remaining} 份</Text>
                            <TextInput
                                style={styles.quantityTextInput}
                                keyboardType="numeric"
                                placeholder="0"
                                value={reserveQuantities[item.name]}
                                onChangeText={(text) => handleQuantityChange(item.name, text)}
                            />
                        </View>
                    ))}
                </View>
            </ScrollView>
            
            {/* 提交按鈕 */}
            <View style={styles.quantityFixedFooter}>
                <TouchableOpacity style={styles.quantitySubmitButton} onPress={handleReservationSubmit}>
                    <Text style={styles.quantitySubmitButtonText}>送出預約訂單</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4F7942' },
    quantityBody: {
        flexGrow: 1,
        backgroundColor: '#FAF9F6',
        padding: 20,
        paddingBottom: 100, // 確保 ScrollView 底部不會被 Footer 遮擋
    },
    
    // 資訊區塊
    quantityInfo: {
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    quantityInfoImage: {
        width: '90%',
        height: 150,
        borderRadius: 10,
        resizeMode: 'cover',
        marginBottom: 10,
    },
    quantityInfoTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    quantityInfoDetail: { fontSize: 16, color: '#666', marginTop: 5 },
    quantityInfoDistance: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    
    // 評論區
    commentLabel: { fontSize: 14, color: '#333', textAlign: 'center', marginBottom: 10 },
    commentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    commentInput: {
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 10,
        width: width * 0.6,
        textAlign: 'center',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },

    // 預約數量表單
    quantityFormCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    quantityFormTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    quantityFormTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    quantityInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    quantityFoodName: { flex: 3, fontSize: 16 },
    quantityRemaining: { flex: 1.5, fontSize: 14, color: 'gray', textAlign: 'right', marginRight: 10 },
    quantityTextInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 8,
        textAlign: 'center',
        fontSize: 16,
        height: 40,
    },
    
    // 固定底部按鈕
    quantityFixedFooter: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#eee',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    quantitySubmitButton: {
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    quantitySubmitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});