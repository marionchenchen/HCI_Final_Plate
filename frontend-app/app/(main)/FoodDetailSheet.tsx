import React, { useState, useEffect } from "react";
import { 
    View, Text, StyleSheet, ScrollView, 
    TouchableOpacity, Image, Alert, Dimensions, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share, ImageSourcePropType } from 'react-native';

const LocalFoodImage = require('../../assets/pizza.jpg'); 
const { height } = Dimensions.get("window");
const MAX_SHEET_HEIGHT = 400;

interface FoodItem {
    item_name: string;
    quantity: number;
}

interface PostData {
    food_id: number;
    user_id: number;
    address: string; // *
    tags: string[]; // * // TODO
    note: string; // * 
    time_restriction: number; // *
    distance_restriction: number;
    created_at: string;
    updated_at: number; // * 
    verification_icon: ImageSourcePropType; // **
    gps_latitude: number;
    gps_longitude: number;
    
    food_items: FoodItem[]; // * 
    image: ImageSourcePropType; // * 
    
    color: `#${string}`; 
}

interface FoodDetailSheetProps {
    location: PostData; 
    handleClose: () => void;
    myUserId: number;
}

// --- 模擬狀態 (實務上應從 API 獲取) ---

// 為了展示多種畫面，我們模擬一個已預約的 Food ID
const RESERVED_FOOD_ID = 2; 

// --- 共享函式 ---

const handleShare = async (location: LocationData) => {
    try {
        await Share.share({
            message: `${location.address}\n剩食: ${(location.foods ?? []).map(f => f.item).join(', ')}`,
        });
    } catch (error) {
        Alert.alert("分享失敗", String(error));
    }
};

// --- Provider 端顯示頁面 ---

const MyFoodAccessView = () => {
    // 驗證碼 TODO: 到時候應該會傳一個數字進來，再套進去路徑就好
    const verificationIcon = require('../../assets/tree.png'); 

    return (
        <View style={styles.noAccessContainer}>
            {/* 左邊按鈕：預約列表 */}
            <TouchableOpacity style={styles.disabledButton} onPress={() => Alert.alert("待實作", "導向預約列表")}>
                <Text style={styles.disabledButtonText}>預約列表</Text>
            </TouchableOpacity>

            {/* 右邊：驗證碼區塊 */}
            <View style={styles.noAccessRightContent}>
                <Text style={styles.noAccessTitle}>您的驗證碼為</Text>
                <Image 
                    source={verificationIcon} 
                    style={styles.noAccessImage}
                />
                <Text style={styles.noAccessNote}>請在領取者螢幕上點選相同符號</Text>
            </View>
        </View>
    );
};

// --- Receiver 端顯示畫面 ---

const ReservedFoodView = ({ location }) => {
    const [status, setStatus] = useState<'reserved' | 'arrived' | 'finish'>('reserved');
    const [comment, setComment] = useState('');

    // 模擬剩餘時間 (實務上應計算)
    const [timeLeft, setTimeLeft] = useState(4 * 60 + 58); // 4:58

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (status !== 'reserved') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    Alert.alert("時間到", "您的預約已自動取消");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    // 領取者點擊 "Arrived"
    const handleArrived = () => {
        setStatus('arrived');
    }
    // 領取者完成領取 (提交評論)
    const handleFinish = () => {
        // TODO: 呼叫 API 提交評論和完成狀態
        Alert.alert('領取完成', `感謝您的評論: ${comment}`);
        setStatus('finish');
    }

    let content;
    if (status === 'reserved') {
        // 畫面 1: 已預約 / 剩餘時間 / Arrived / Cancel
        content = (
            <>
                <Text style={styles.reservedStatus}>已預約</Text>
                <Text style={styles.reservedTimeText}>剩餘時間</Text>
                <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
                <View style={styles.reservedActions}>
                    <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived}>
                        <Text style={styles.arrivedButtonText}>Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => Alert.alert("取消預約", "確定要取消此預約嗎？")}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    } else if (status === 'arrived') {
        // 畫面 2: 點選驗證碼 / 剩餘時間 / Arrived / Cancel
        content = (
            <>
                <Text style={styles.reservedTimeText}>剩餘時間</Text>
                <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
                <View style={styles.verificationPrompt}>
                    <Text style={styles.verificationTitle}>請讓Provider點選驗證碼</Text>
                    <View style={styles.verificationIcons}>
                        {['🎄', '😜', '😺'].map(icon => ( // 模擬圖案
                            <TouchableOpacity key={icon} onPress={() => handleFinish()} style={styles.verificationIcon}>
                                <Text style={styles.verificationIconText}>{icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.foodListText}>
                        {location.foods.map((f, i) => `${f.item} ${f.quantity}份`).join('\n')}
                    </Text>
                </View>
                <View style={styles.reservedActions}>
                    <TouchableOpacity style={styles.arrivedButtonDisabled} disabled>
                        <Text style={styles.arrivedButtonText}>Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    } else if (status === 'finish') {
        // 畫面 3: 領取成功 / 評論 / Finish
        content = (
            <>
                <Text style={styles.reservedTimeText}>剩餘時間</Text>
                <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
                <View style={styles.commentSection}>
                    <Text style={styles.commentTitle}>領取成功~ 食物如何？</Text>
                    <View style={styles.commentEmojis}>
                        {['Still hot', '好吃', 'fresh'].map(tag => (
                            <TouchableOpacity key={tag} style={styles.commentTag}>
                                <Text style={styles.commentTagText}>{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Leave some comments..."
                        multiline
                        value={comment}
                        onChangeText={setComment}
                    />
                    <TouchableOpacity style={styles.finishButton} onPress={() => Alert.alert("完成", "感謝您的回饋!")}>
                        <Text style={styles.finishButtonText}>Finish</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.reservedActions}>
                    <TouchableOpacity style={styles.arrivedButtonDisabled} disabled>
                        <Text style={styles.arrivedButtonText}>Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    return <View style={styles.reservedContentWrapper}>{content}</View>;
}

// --- FoodDetailSheet ---

export default function FoodDetailSheet({ location, handleClose, myUserId }: FoodDetailSheetProps) {
    const router = useRouter();
    
    // 檢查是否為自己發布的食物
    const isMyFood = myUserId === location.user_id;

    // 檢查是否已預約 (模擬：如果 ID 是 2 則視為已預約)
    const isReserved = !isMyFood && location.user_id === RESERVED_FOOD_ID;

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.receiverContentCard}>
                {/* 1. 頂部資訊區塊 (左圖右文) */}
                <View style={styles.topRow}>
                    <Image source={location.image} style={styles.foodImage} />
                    <View style={styles.infoRight}>
                        {/* 關閉按鈕 */}
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close-outline" size={30} color="#333" />
                        </TouchableOpacity>

                        {/* 右上角編輯/分享按鈕 */}
                        <View style={styles.topRightButtonContainer}>
                            {isMyFood ? (
                                <TouchableOpacity 
                                    onPress={() => router.push('/(main)/newpost')} 
                                    style={styles.iconButton}
                                >
                                    <Ionicons name="create-outline" size={24} color="#333" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => handleShare(location)} style={styles.iconButton}>
                                    <Ionicons name="share-social-outline" size={24} color="#333" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.receiverTitle}>{location.address}</Text>
                        <Text style={styles.receiverDetailText}>{location.note}</Text>
                        <Text style={styles.receiverRuleText}>{`此食物規定在${location.time_restriction}分鐘內領取`}</Text>
                        <Text style={styles.receiverDetailText}>{`(${location.updated_at} 分鐘前編輯)`}</Text>
                    </View>
                </View>

                {/* 2. 食物列表 */}
                {(location.food_items ?? []).map((food, index) => (
                    <View key={index} style={styles.receiverFoodItemRow}>
                        <Text style={styles.receiverFoodItemName}>{food.item_name}</Text>
                        <Text style={styles.receiverFoodItemRemaining}>剩餘 {food.quantity} 份</Text>
                    </View>
                ))}

                <Text style={styles.receiverDetailTextNote}>數量僅供參考，剩餘數量以實際情況為主</Text>

                {/* 3. 底部動作區塊 (根據狀態條件渲染) */}
                {isMyFood ? (
                    <MyFoodAccessView /> // 發布者專屬畫面
                ) : isReserved ? (
                    <ReservedFoodView location={location} /> // 預約者專屬畫面
                ) : (
                    // 未預約者畫面：預約按鈕 (如圖一底部)
                    <TouchableOpacity
                        style={styles.reserveButton}
                        onPress={() => router.push({ pathname: '/(main)/reserve', params: { foodId: location.user_id.toString() } })} 
                    >
                        <Text style={styles.reserveButtonText}>預約剩食</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
}

// --- 樣式定義 ---

const styles = StyleSheet.create({
    receiverContentCard: {
        paddingTop: 10,
    },
    topRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    foodImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 15,
    },
    infoRight: {
        flex: 1,
        paddingRight: 35, // 避免被右上角的關閉按鈕擋住
    },
    closeButton: {
        position: 'absolute',
        top: -5,
        right: -15,
        zIndex: 10,
        backgroundColor: 'white',
        borderRadius: 15,
    },
    topRightButtonContainer: {
        position: 'absolute',
        top: 0,
        right: 20,
    },
    iconButton: {
        padding: 5,
    },
    receiverTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    receiverDetailText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    receiverRuleText: {
        fontSize: 14,
        color: 'red',
        marginTop: 5,
    },
    receiverFoodItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        // 模擬圖中的樣式，可能不需要邊線
        // borderBottomWidth: 1,
        // borderBottomColor: '#EEE',
    },
    receiverFoodItemName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    receiverFoodItemRemaining: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },
    receiverDetailTextNote: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 5,
        marginBottom: 15,
    },
    reserveButton: {
        backgroundColor: '#576238', 
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    reserveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    
    // --- 發布者專屬樣式 (MyFoodAccessView) ---
    noAccessContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#F7F7F7',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    disabledButton: {
        backgroundColor: '#CCC',
        padding: 15,
        borderRadius: 8,
        width: '35%',
        alignItems: 'center',
    },
    disabledButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
    noAccessRightContent: {
        alignItems: 'center',
        width: '60%',
    },
    noAccessTitle: {
        fontSize: 14,
        color: '#333',
    },
    noAccessImage: {
        width: 60,
        height: 60,
        marginVertical: 5,
        opacity: 0.8, // 模擬圖中的 QR Code 效果，這裡用圖片替代
    },
    noAccessNote: {
        fontSize: 12,
        color: '#999',
    },
    
    // --- 預約者專屬樣式 (ReservedFoodView) ---
    reservedContentWrapper: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    reservedStatus: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#576238',
        marginBottom: 10,
    },
    reservedTimeText: {
        fontSize: 18,
        color: '#333',
        fontWeight: 'bold',
    },
    timer: {
        fontSize: 48,
        fontWeight: '900',
        color: '#576238',
        marginVertical: 10,
    },
    reservedActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    arrivedButton: {
        backgroundColor: '#576238',
        padding: 15,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    arrivedButtonDisabled: {
        backgroundColor: '#A0A0A0',
        padding: 15,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    arrivedButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#D32F2F',
        padding: 15,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    
    // -- 驗證畫面 (arrived status) --
    verificationPrompt: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 2,
        borderColor: '#576238',
    },
    verificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    verificationIcons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
        marginBottom: 15,
    },
    verificationIcon: {
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
    },
    verificationIconText: {
        fontSize: 30,
    },
    foodListText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    
    // -- 評論畫面 (finish status) --
    commentSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    commentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    commentEmojis: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 10,
    },
    commentTag: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    commentTagText: {
        fontSize: 14,
        color: '#576238',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 8,
        width: '90%',
        height: 70,
        padding: 10,
        marginTop: 10,
        textAlignVertical: 'top',
    },
    finishButton: {
        backgroundColor: '#D32F2F', // 圖中是紅色
        padding: 10,
        borderRadius: 8,
        marginTop: 15,
    },
    finishButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});