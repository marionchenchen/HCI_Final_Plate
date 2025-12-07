import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, Modal
} from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const LocalFoodImage = require('../../assets/pizza.jpg'); 

// 模擬剩食資料和驗證圖案
const DUMMY_FOOD_INFO = {
    imageSource: LocalFoodImage, 
    title: '女二路易莎前桌子',
    details: '建議自備容器/衛生紙',
    note: '此食物限定在10分鐘內領取',
    reserve_time: '15 minutes ago edited',
    food_items: [
        { name: '蒜香起司燻雞培根披薩', remaining: 3 },
        { name: '香濃蒔蔬海鮮披薩', remaining: 5 },
    ],
    verify_code: '🌲', 
};

// 模擬預約列表資料
const DUMMY_RESERVATION_LIST = [
    { id: '崔杋圭', time: '01:20', items: ['蒜香起司燻雞培根披薩 1份'] },
    { id: '崔秀彬', time: '03:50', items: ['蒜香起司燻雞培根披薩 1份', '香濃蒔蔬海鮮披薩 1份'] },
];

export default function FoodProviderScreen() {
    const router = useRouter();
    const [isReservationListVisible, setIsReservationListVisible] = useState(false);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                <Image source={DUMMY_FOOD_INFO.imageSource} style={styles.foodImage} />
                
                <View style={styles.infoTitleContainer}>
                    <Text style={styles.infoTitle}>{DUMMY_FOOD_INFO.title}</Text>
                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => router.push('/(main)/newpost')}>
                        <Ionicons name="create-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* 詳細資訊卡片 */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoDetailText}>**{DUMMY_FOOD_INFO.details}**</Text>
                    <Text style={styles.infoDetailText}>*{DUMMY_FOOD_INFO.note}*</Text>
                    <Text style={styles.infoDetailTime}>{DUMMY_FOOD_INFO.reserve_time}</Text>
                    
                    {/* 剩食列表 */}
                    {DUMMY_FOOD_INFO.food_items.map((item, index) => (
                        <View key={index} style={styles.foodItemRow}>
                            <Text style={styles.foodItemName}>{item.name}</Text>
                            <Text style={styles.foodItemRemaining}>剩餘 {item.remaining} 份</Text>
                        </View>
                    ))}
                </View>

                {/* 驗證碼與預約列表按鈕 */}
                <View style={styles.verifyContainer}>
                    <Text style={styles.verifyText}>您的驗證碼</Text>
                    <Text style={styles.verifyCode}>{DUMMY_FOOD_INFO.verify_code}</Text>
                    <Text style={styles.reservationListNote}>請在領取者螢幕上點選相同符號</Text>
                </View>
            </ScrollView>

            <View style={styles.receiverFixedFooter}>
                <TouchableOpacity 
                    style={styles.reservationListButton}
                    onPress={() => setIsReservationListVisible(true)}>
                    <Text style={styles.reservationListButtonText}>預約列表</Text>
                </TouchableOpacity>
            </View>
            
            {/* 預約列表 Modal (維持 Modal 在這個頁面內) */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={isReservationListVisible}
                onRequestClose={() => setIsReservationListVisible(false)}>
                <View style={styles.reservationContainer}>
                    <View style={styles.reservationHeader}>
                        <TouchableOpacity onPress={() => setIsReservationListVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.reservationTitle}>已確認預約</Text>
                    </View>
                    
                    <ScrollView contentContainerStyle={styles.reservationList}>
                        {DUMMY_RESERVATION_LIST.map((res, index) => (
                            <View key={index} style={styles.reservationCard}>
                                <View style={styles.reservationCardContent}>
                                    <Text style={styles.reservationCardID}>{res.id}</Text>
                                    <Text style={styles.reservationCardTime}>剩餘時間 {res.time}</Text>
                                </View>
                                {res.items.map((item, i) => (
                                    <Text key={i} style={styles.reservationCardItem}>{item}</Text>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
    scrollContainer: { padding: 20 },
    
    foodImage: {
        width: 180,
        height: 180, 
        borderRadius: 10,
        marginBottom: 15,
        resizeMode: 'cover',
    },
    
    infoTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    editButton: {
        padding: 5,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        marginVertical: 10,
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    infoDetailText: { fontSize: 14, color: '#333' },
    infoDetailTime: { fontSize: 12, color: '#666', marginTop: 5, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    foodItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        marginTop: 5,
    },
    foodItemName: { fontSize: 16 },
    foodItemRemaining: { fontSize: 16, fontWeight: 'bold', color: '#576238' },
    
    verifyContainer: {
        alignItems: 'center',
        marginTop: 25,
    },
    verifyText: { fontSize: 14, color: '#666' },
    verifyCode: { fontSize: 48, marginVertical: 10 },

    // BTN: 預約列表
    receiverFixedFooter: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#eee',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    reservationListButton: {
        backgroundColor: '#576238', 
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    reservationListButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    
    // 預約列表
    reservationContainer: {
        flex: 1,
        backgroundColor: '#576238', 
    },
    reservationHeader: {
        paddingTop: 30,
        paddingBottom: 20,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    reservationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 15,
    },
    reservationList: {
        backgroundColor: '#FAF9F6',
        flexGrow: 1,
        padding: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    reservationCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 5,
        borderLeftColor: '#576238',
    },
    reservationCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    reservationCardID: { fontWeight: 'bold', fontSize: 16 },
    reservationCardTime: { fontSize: 14, color: '#D32F2F' },
    reservationCardItem: { fontSize: 14, color: '#333' },
});