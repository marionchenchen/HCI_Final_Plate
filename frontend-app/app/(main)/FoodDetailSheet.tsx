import React, { useState, useEffect, useMemo } from "react";
import { 
    View, Text, StyleSheet, ScrollView, 
    TouchableOpacity, Image, Alert, Dimensions, TextInput, FlatList 
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share, ImageSourcePropType } from 'react-native';
import { fetchReservationsByFood } from "../../api";

const PADDING_HORIZONTAL = 18;

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
    onToggleShowMarkers: (show: boolean, reservationData: FrontendReservationItem[]) => void;
}

interface ProviderFoodStatusProps {
    location: PostData;
    reservations: FrontendReservationItem[];
    isLoadingReservations: boolean;
    loadError: string | null;
    onToggleShowMarkers: (show: boolean, reservationData: FrontendReservationItem[]) => void;
}

interface FrontendReservationItem {
    res_id: number;
    user_id: number;
    food_id: number;
    item_id: number;
    number_book: number;
    // 希望傳進來的東西是list(item_id, item_name, number_book)
    reserve_at: string;

    //res_id: number;
    //order_number: number;
    //username: string; 
    //reserved_item_name: string; 
    //reserved_quantity: number;  
    //time_left_seconds: number;
    //gps_latitude: number;       
    //gps_longitude: number;       
    //is_collected: boolean; 
}

interface ReservationListProps {
    reservations: FrontendReservationItem[];
    location: PostData;
    // 傳回 Home.tsx 控製地圖 Marker 的函式
    onToggleShowMarkers: (show: boolean, reservationData: FrontendReservationItem[]) => void; 
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

// --- 輔助函式：將秒數轉換為 分:秒 格式 ---
const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ReservationListView = ({ reservations, location, onToggleShowMarkers }: ReservationListProps) => {
    const [localReservations, setLocalReservations] = useState(reservations);

    const itemMap = useMemo(() => {
        // location.food_items 裡是 { id: 1, item_name: '麵包', ... }
        if (!location || !location.food_items) return new Map();
        return new Map(location.food_items.map(item => [item.id, item.item_name]));
    }, [location]);

    // 🚨 Marker 溝通邏輯：通知 Home.tsx 顯示或隱藏預約者位置
    useEffect(() => {
        // 在組件被渲染時，通知 Home.tsx 顯示 Marker
        onToggleShowMarkers(true, reservations); 
        
        // 組件卸載時，通知 Home.tsx 隱藏 Marker
        return () => {
            onToggleShowMarkers(false, []);
        };
    }, [reservations, onToggleShowMarkers]);

    // Provider 點擊打勾按鈕
    const handleCollect = (resId: number) => {
        Alert.alert(
            "確認領取", 
            "確定這份預約的食物已經交給這位使用者了嗎？",
            [
                { text: "取消", style: "cancel" },
                { 
                    text: "確認", 
                    onPress: () => {
                        // TODO: 呼叫 API 通知後端此筆預約已完成領取
                        
                        // 模擬更新本地狀態
                        setLocalReservations(prev => 
                            prev.map(r => 
                                r.res_id === resId ? { ...r, is_collected: true } : r
                            )
                        );
                        Alert.alert("領取成功", `已完成預約 ID ${resId} 的領取。`);
                    }
                }
            ]
        );
    };

    return (
        <View style={listStyles.listContainer}>
            <View style={listStyles.listHeaderRow}>
                <Text style={listStyles.headerCell}>#</Text>
                <Text style={listStyles.headerCellUser}>使用者/品項</Text>
                <Text style={listStyles.headerCellTime}>剩餘</Text>
                <Text style={listStyles.headerCellAction}>領取</Text>
            </View>
            
            <FlatList
                data={localReservations} 
                keyExtractor={item => item.res_id.toString()}
                renderItem={({ item }) => (
                    <View style={[listStyles.reservationRow, item.is_collected && listStyles.collectedRow]}>
                        
                        {/* 號碼 */}
                        <Text style={listStyles.cellNumber}>{item.user_id}</Text>
                        
                        {/* 使用者/品項 */}
                        <View style={listStyles.cellUserContent}>
                            <Text style={listStyles.itemText}>
                                {item.reserved_item_name} ({item.reserved_quantity} 份)
                            </Text>
                        </View>
                        
                        {/* 剩餘時間 */}
                        <Text style={listStyles.cellTime}>
                            {item.is_collected ? '已領取' : formatTime(item.time_left_seconds)}
                        </Text>
                        
                        {/* 打勾按鈕 */}
                        <TouchableOpacity 
                            style={listStyles.collectButton}
                            onPress={() => handleCollect(item.res_id)}
                            disabled={item.is_collected}
                        >
                            <MaterialIcons 
                                name="done" 
                                size={28} 
                                color={item.is_collected ? '#fff' : '#5CB85C'} 
                                style={item.is_collected ? listStyles.collectedIcon : null}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={() => <Text style={listStyles.emptyText}>目前沒有進行中的預約。</Text>}
            />
        </View>
    );
};

const ProviderFoodStatusView = ({ 
    location, 
    reservations, 
    isLoadingReservations,
    loadError,
    onToggleShowMarkers 
}: ProviderFoodStatusProps) => {

    return (
        <View style={styles.providerContentCard}>
            
            {/* 1. 貼文基本資訊 (地址與編輯按鈕) */}
            <View style={styles.providerHeader}>
                <TouchableOpacity 
                    onPress={() => Alert.alert("待實作", "導向編輯貼文頁面")}
                    style={styles.editButton}
                >
                    <Ionicons name="create-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* 2. 剩餘品項列表 (Food Items) */}
            
            <View style={styles.remainingItemsContainer}>
                {(location.food_items ?? []).map((food, index) => (
                    <View key={index} style={styles.foodItemStatusRow}>
                        <Text style={styles.foodItemStatusName}>{food.item_name}</Text>
                        <Text style={styles.foodItemStatusRemaining}>剩餘 {food.quantity} 份</Text>
                    </View>
                ))}
            </View>

            {/* 3. 預約列表標題 */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>進行中預約</Text>

            {/* 4. 預約列表內容 (根據載入狀態顯示) */}
            {isLoadingReservations ? (
                <Text style={styles.loadingText}>載入預約中...</Text>
            ) : loadError ? (
                <Text style={styles.errorText}>載入失敗: {loadError}</Text>
            ) : (
                // 🚨 渲染 ReservationListView
                <ReservationListView 
                    reservations={reservations} 
                    location={location}
                    onToggleShowMarkers={onToggleShowMarkers} 
                />
            )}
            
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

export default function FoodDetailSheet({ location, handleClose, myUserId, onToggleShowMarkers }: FoodDetailSheetProps) {
    const router = useRouter();

    // 檢查是否為自己發布的食物
    const isMyFood = myUserId === location.user_id;
    // const isMyFood = 1;

    // 檢查是否已預約 (模擬：如果 ID 是 2 則視為已預約)
    // const isReserved = !isMyFood && location.user_id === RESERVED_FOOD_ID;
    const isReserved = false;

    // 狀態：延遲加載預約列表
    const [reservations, setReservations] = useState<FrontendReservationItem[]>([]);
    const [isLoadingReservations, setIsLoadingReservations] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (isMyFood && location.food_id) {
            const foodId = location.food_id;
            setIsLoadingReservations(true);

            // 呼叫 API 並進行映射（假設 fetchReservationsByFood 已經修正）
            fetchReservationsByFood(foodId)
                .then(rawReservations => {
                    // 執行數據映射（將 item, number_book 轉為 item_name, quantity, 並計算 GPS/時間）
                    const mappedReservations: FrontendReservationItem[] = rawReservations.map((res, index) => ({
                        res_id: res.reservation_id,
                        order_number: index + 1,
                        username: `預約者 ${res.user_id}`, 
                        reserved_item_name: `預約 ItemID ${res.item_id} (數量: ${res.number_book})`, 
                        reserved_quantity: res.number_book,
                        time_left_seconds: 60 * 5, 
                        gps_latitude: 24.78 + Math.random() * 0.005, 
                        gps_longitude: 120.99 + Math.random() * 0.005, 
                        is_collected: false, 
                    }));
                    setReservations(mappedReservations);
                })
                .catch(err => {
                    console.error("Failed to load reservations:", err);
                    setLoadError("無法載入預約列表。");
                })
                .finally(() => {
                    setIsLoadingReservations(false);
                });
        }
        
        // 🚨 關鍵清理：當 Provider 視圖關閉或切換時，確保地圖上的 Marker 被移除
        // 當 isMyFood 變為 false 或組件卸載時，通知父組件隱藏 Marker
        return () => {
             // 只有在是 Provider 且組件即將卸載時才調用
             if(isMyFood) {
                onToggleShowMarkers(false, []);
             }
        }
    }, [isMyFood, location.food_id]);

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {isMyFood ? (
                // 渲染 Provider 介面
                <ProviderFoodStatusView
                    location={location}
                    reservations={reservations}
                    isLoadingReservations={isLoadingReservations}
                    loadError={loadError}
                    onToggleShowMarkers={onToggleShowMarkers}
                />
            ) : (
                // 渲染 Receiver 介面
                <View style={styles.receiverContentCard}>
                    
                    {/* 1. 頂部資訊區塊 (左圖右文) */}
                    <View style={styles.topRow}>
                        <Image source={location.image} style={styles.foodImage} />
                        <View style={styles.infoRight}>
                            {/* 右上角編輯/分享按鈕 */}
                            <View style={styles.topRightButtonContainer}>
                                <TouchableOpacity onPress={() => handleShare(location)} style={styles.iconButton}>
                                        <Ionicons name="share-social-outline" size={24} color="#333" />
                                    </TouchableOpacity>
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
                    
                    {/* 3. 底部動作區塊 */}
                    {isReserved ? (
                        <ReservedFoodView location={location} /> 
                    ) : (
                        <TouchableOpacity 
                            style={styles.reserveButton}
                            onPress={() => router.push({ pathname: '/(main)/reserve', params: { foodId: location.user_id.toString() } })} 
                        >
                            <Text style={styles.reserveButtonText}>預約剩食</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

// --- 樣式定義 ---

const styles = StyleSheet.create({
    receiverContentCard: {
        paddingTop: 20,
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
    topRightButtonContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
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
    },

    providerContentCard: {
        paddingHorizontal: PADDING_HORIZONTAL,
        paddingTop: 10,
        backgroundColor: '#fff',
        // 確保內容能夠在 ScrollView 中展開
    },
    providerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    providerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        padding: 5,
    },

    // --- 剩餘品項列表樣式 ---
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        marginTop: 15,
        marginBottom: 10,
    },
    remainingItemsContainer: {
        padding: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 10,
    },
    foodItemStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    foodItemStatusName: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    foodItemStatusRemaining: {
        fontSize: 14,
        color: '#888',
        fontWeight: '600',
    },

    // --- 載入和錯誤狀態樣式 ---
    loadingText: {
        textAlign: 'center',
        padding: 20,
        color: '#888',
    },
    errorText: {
        textAlign: 'center',
        padding: 20,
        color: 'red',
        fontWeight: 'bold',
    },
});

// --- ReservationListView 專用樣式 (listStyles) ---
const listStyles = StyleSheet.create({
    listContainer: {
        flex: 1,
        paddingBottom: 20,
        minHeight: 100, // 確保列表在 ScrollView 中有最小高度
    },
    listHeaderRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 5,
        paddingHorizontal: 10,
    },
    headerCell: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        flex: 1,
    },
    headerCellUser: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        flex: 2,
    },
    headerCellTime: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        flex: 1.5,
        textAlign: 'center',
    },
    headerCellAction: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        flex: 1.2,
        textAlign: 'center',
    },
    
    reservationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingHorizontal: 10,
    },
    collectedRow: {
        backgroundColor: '#FAFAFA', // 已領取變淡色
    },
    
    // Cell 樣式
    cellNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF', // 號碼突出顯示
        flex: 0.8,
        textAlign: 'center',
    },
    cellUserContent: {
        flex: 2,
    },
    userNameText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    itemText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    cellTime: {
        flex: 1.5,
        fontSize: 14,
        color: '#FF6347', // 剩餘時間突出
        fontWeight: '600',
        textAlign: 'center',
    },

    // 打勾按鈕樣式
    collectButton: {
        flex: 1.2,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    collectedIcon: {
        backgroundColor: '#5CB85C',
        borderRadius: 15,
        padding: 4,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#888',
        fontStyle: 'italic',
    },
});