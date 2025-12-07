import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions 
} from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

const LocalFoodImage = require('../../assets/pizza.jpg'); 

// 模擬剩食資料
const DUMMY_FOOD_INFO = {
    imageSource: LocalFoodImage, 
    title: '女二路易莎前桌子',
    details: '建議自備容器/衛生紙',
    note: '此食物限定在10分鐘內領取',
    food_items: [
      { name: '蒜香起司燻雞培根披薩', remaining: 3 },
      { name: '香濃蒔蔬海鮮披薩', remaining: 5 },
    ],
};

export default function FoodReceiverScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                <Image source={DUMMY_FOOD_INFO.imageSource} style={styles.foodImage}/>
                
                <View style={styles.receiverContentCard}>
                    <View style={styles.receiverContentTitle}>
                        <Text style={styles.receiverTitle}>{DUMMY_FOOD_INFO.title}</Text>
                        <Text style={styles.receiverDistance}>
                            <Ionicons name="walk" size={18} color="#576238" /> 7 mins
                        </Text>
                    </View>
                    
                    <Text style={styles.receiverDetailText}>{DUMMY_FOOD_INFO.details}</Text>
                    <Text style={styles.receiverRuleText}>{DUMMY_FOOD_INFO.note}</Text>
                    
                    <View style={styles.divider} />
                    
                    {/* 剩食列表 */}
                    {DUMMY_FOOD_INFO.food_items.map((item, index) => (
                        <View key={index} style={styles.receiverFoodItemRow}>
                            <Text style={styles.receiverFoodItemName}>{item.name}</Text>
                            <Text style={styles.receiverFoodItemRemaining}>剩餘 {item.remaining} 份</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* 預約剩食 */}
            <View style={styles.receiverFixedFooter}>
                <TouchableOpacity 
                    style={styles.reserveButton}
                    onPress={() => router.push('/(main)/reserve')}> 
                    <Text style={styles.reserveButtonText}>預約剩食</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
    scrollContainer: { padding: 20,},

    foodImage: {
        width: 180,
        height: 180,
        borderRadius: 10,
        marginBottom: 15,
        resizeMode: 'cover',
    },

    receiverContentCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 15,
        marginTop: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    receiverContentTitle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    receiverTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    receiverDistance: {
        fontSize: 16,
        color: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    receiverDetailText: { fontSize: 16, color: '#666', marginBottom: 5 },
    receiverRuleText: { fontSize: 14, color: '#333', marginBottom: 15 },
    divider: { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 10 },
    receiverFoodItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    receiverFoodItemName: { fontSize: 16, fontWeight: '500' },
    receiverFoodItemRemaining: { fontSize: 16, color: 'gray' },
    receiverNote: { fontSize: 12, color: 'gray', marginTop: 15, textAlign: 'center' },
    
    // 固定底部按鈕
    receiverFixedFooter: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#eee',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    reserveButton: {
        backgroundColor: '#576238', 
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    reserveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});