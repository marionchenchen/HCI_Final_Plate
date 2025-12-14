import React, { useState, useEffect, useMemo } from "react";
import { 
    View, Text, StyleSheet, ScrollView, 
    TouchableOpacity, Image, Alert, Dimensions, TextInput, FlatList 
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share, ImageSourcePropType } from 'react-native';
import { usePostRefresh } from "../../context/PostRefreshContext";
import { fetchReservationsByFood, fetchReserveInfoByUser, BASE_URL, fetchWarningTimes,
    pickupSuccess
} from "../../api";
import * as Location from 'expo-location'; // here

const PADDING_HORIZONTAL = 18;

const verificationIcons = [
    { id: 1, icon: '🎄' },
    { id: 2, icon: '😜' },
    { id: 3, icon: '😺' },
];

// 查找函式：根據 ID 獲取圖標 (或直接使用 map 進行查找)
const getVerificationIcon = (id: number): string | null => {
    if (id === undefined || id === null) return null;
    const numericId = Number(id);
    const item = verificationIcons.find(v => v.id === numericId);
    return item ? item.icon : null;
};

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
    verification_icon: number; // **
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
    onToggleShowMarkers: (show: boolean, reservationData: ReservationGroup[]) => void;
}

interface ProviderFoodStatusProps {
    location: PostData;
    reservations: ReservationGroup[];
    handleClose: () => void;
}

// 原始 API 回傳的單筆預約介面 (用於從 API 數據轉換)
interface ReservationUserItem { 
    reservation_id: number;
    user_id: number;
    food_id: number;
    item_id: number;
    item_name: string; 
    gps_latitude: number;
    gps_longitude: number;
    number_book: number;
    reserve_at: string;
}

// 內部品項的簡化結構
interface GroupedReservedItem {
    reservation_id: number;
    item_name: string;
    number_book: number;
}

// 🌟 最終狀態使用的使用者群組介面 (簡化且優化)
interface ReservationGroup {
    user_id: number;
    time_left_seconds: number; 
    reserved_items: GroupedReservedItem[]; 
    is_collected: boolean; 
    reserve_at: string;
}

// --- 模擬狀態 (實務上應從 API 獲取) ---

// 為了展示多種畫面，我們模擬一個已預約的 Food ID
const RESERVED_FOOD_ID = 2; 

// --- 共享函式 ---

const handleShare = async (location: PostData) => {
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

// 輔助函式：根據您提供的單一用戶邏輯，計算初始剩餘秒數
const calculateInitialTimeLeft = (
    reserveAtTimestamp: string, 
    timeRestrictionMinutes: number
): number => {
    // 1. 處理時間戳記 (加上 'Z' 確保它被視為 UTC 時間)
    const reserveDate = new Date(reserveAtTimestamp + 'Z'); 
    const now = new Date();

    // 2. 計算已經流逝的秒數 (passedSeconds)
    const passedSeconds = Math.max(
        Math.floor((now.getTime() - reserveDate.getTime()) / 1000),
        0
    );

    // 3. 計算總保留秒數 (limitSeconds)
    const limitSeconds = timeRestrictionMinutes * 60;
    
    // 4. 計算剩餘秒數 (remainingSeconds)
    const remainingSeconds =
        passedSeconds >= limitSeconds
            ? 0
            : limitSeconds - passedSeconds;

    return remainingSeconds;
};

const ProviderFoodStatusView = ({ 
    location, 
    reservations, 
    handleClose
}: ProviderFoodStatusProps) => {
    const currentIcon = getVerificationIcon(location.verification_icon);
    
    const [localReservations, setLocalReservations] = useState(reservations);
    const { triggerRefresh } = usePostRefresh();

    // 計算剩餘秒數
    useEffect(() => {
        const timeRestriction = location.time_restriction; // 獲取保留時間 (分鐘)
        const processedReservations = reservations.map(userGroup => {
            const reserveAt = userGroup.reserve_at; 

            if (!reserveAt || timeRestriction === undefined) {
                 return userGroup;
            }
            
            // 計算剩餘秒數 (每個預約都獨立計算)
            const initialTimeLeftSeconds = calculateInitialTimeLeft(
                reserveAt, 
                timeRestriction
            );
            
            return {
                ...userGroup,
                time_left_seconds: initialTimeLeftSeconds,
            };
        });
        setLocalReservations(processedReservations);
    }, [reservations, location.time_restriction]); // 確保數據和時間限制變動時重算

    // 倒數計時器 (每秒遞減)
    useEffect(() => {
        if (localReservations.length === 0) return;

        const timer = setInterval(() => {
            setLocalReservations(prevReservations => {
                
                // 更新每個項目的時間
                const newReservations = prevReservations.map(userGroup => {
                    
                    if (userGroup.is_collected || userGroup.time_left_seconds <= 0) {
                        return userGroup;
                    }

                    const newTimeLeft = userGroup.time_left_seconds - 1;

                    return {
                        ...userGroup,
                        time_left_seconds: newTimeLeft,
                    };
                });
                
                return newReservations;
            });
        }, 1000); 

        return () => clearInterval(timer);
        
    }, [localReservations.length]); // 列表長度，確保列表載入/清空時正確啟動/停止定時器

    // 打勾
    const handleCollect = (userId: number, foodId: number) => { 
        Alert.alert(
            "確認領取", 
            "確定這位使用者預約的所有食物都已經領取了嗎？",
            [
                { text: "取消", style: "cancel" },
                { 
                    text: "確認", 
                    onPress: async () => { // ⭐️ 變成非同步函式 (async)
                        try {
                            // ⭐️ 呼叫 API 通知後端。Provider 不留言，所以 comment 留空。
                            const result = await pickupSuccess(userId, foodId, ""); 

                            // 成功後才更新本地狀態，視覺上標記為已領取
                            setLocalReservations(prev => 
                                prev.filter(userGroup => userGroup.user_id !== userId)
                            );
                            
                            // 根據後端回傳的訊息給予使用者回饋
                            if (result.message && result.message.includes("post removed")) {
                                Alert.alert("領取成功", "恭喜！所有食物已清空，貼文已自動刪除。");
                                // 這裡可能需要一個 callback 函式來通知父元件 (foodDetailSheet) 關閉或刷新，
                                // 假設您有一個名為 onPostRemoved 的 prop:
                                // onPostRemoved();
                                handleClose();
                                triggerRefresh();
                            } else {
                                Alert.alert("領取成功", `使用者 ID ${userId} 的預約已完成領取。`);
                            }

                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : "未知錯誤";
                            Alert.alert("領取操作失敗", errorMessage);
                        }
                    }
                }
            ]
        );
    };

    const router = useRouter();
    
    const handleEdit = () => {
        if (location && location.food_id) {
            router.push({
                pathname: '/(main)/editpost',
                params: { 
                    id: location.food_id,
                }
            });
        } else {
            Alert.alert("錯誤", "無法找到食物 ID，無法編輯。");
        }
    };

    const renderHeaderContent = () => (
        <View>
            {/* 1. 貼文基本資訊 (地址與編輯按鈕) */}
            <View style={styles.providerHeader}>
                <View style={styles.addressContainer}>
                    <Text style={styles.verificationIconText}>
                        {currentIcon}
                        <Text style={listStyles.emptyText}>請於前來領取者頁面點選此符號</Text>
                    </Text>
                </View>

                {/* 編輯按鈕 (保持在右側) */}
                <TouchableOpacity 
                    onPress={handleEdit}
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

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>預約列表</Text>
        </View>
    );

    return (
        <FlatList
            data={localReservations}
            keyExtractor={item => item.user_id.toString()}
            
            ListHeaderComponent={
                <>
                    {renderHeaderContent()}
                    <View style={listStyles.listHeaderRow}>
                        <Text style={listStyles.headerCell}>#</Text>
                        <Text style={listStyles.headerCellUser}>品項(份數)</Text>
                        <Text style={listStyles.headerCellTime}>剩餘時間</Text>
                        <Text style={listStyles.headerCellAction}>領取</Text>
                    </View>
                </>
            }
            
            renderItem={({ item: userGroup }) => {
                const itemDetails = userGroup.reserved_items
                    .map(item => `${item.item_name} (${item.number_book} 份)`)
                    .join(', ');
                        
                return (
                    <View 
                        style={[listStyles.reservationRow, userGroup.is_collected && listStyles.collectedRow]}
                        key={userGroup.user_id}
                    >
                        
                        {/* 號碼 (顯示使用者 ID) */}
                        <Text style={listStyles.cellNumber}>
                            {userGroup.user_id}
                        </Text>
                        
                        {/* 使用者/品項 (顯示合併後的文字) */}
                        <View style={listStyles.cellUserContent}>
                            <Text style={listStyles.itemText}>
                                {itemDetails} 
                            </Text>
                        </View>
                        
                        {/* 剩餘時間 (單一倒數) */}
                        <Text style={listStyles.cellTime}>
                            {userGroup.is_collected 
                                ? '已領取' 
                                : formatTime(userGroup.time_left_seconds)}
                        </Text>
                        
                        {/* 打勾按鈕 (單一按鈕) */}
                        <TouchableOpacity 
                            style={listStyles.collectButton}
                            onPress={() => handleCollect(userGroup.user_id, location.food_id)}
                            disabled={userGroup.is_collected}
                        >
                            <MaterialIcons 
                                name={userGroup.is_collected ? "check-circle" : "done"} 
                                size={28} 
                                color={userGroup.is_collected ? '#386641' : '#fff'}
                                style={listStyles.collectedIcon}
                            />
                        </TouchableOpacity>
                    </View>
                );
            }}
            
            ListEmptyComponent={() => <Text style={listStyles.emptyText}>目前沒有進行中的預約。</Text>}
        />
    );
};

// --- Receiver 端顯示畫面 ---

interface ReservedFoodViewProps 
{
    location: PostData;
    defaultTime: number | null; // 或 number，如果你有預設值
    bookNum: number | null;
    user_id: number | null;
}

const ReservedFoodView = ({ location, defaultTime, user_id }: ReservedFoodViewProps ) => {
    const [status, setStatus] = useState<'reserved' | 'arrived' | 'finish'>('reserved');
    const [comment, setComment] = useState('');
    const [timeLeft, setTimeLeft] = useState(defaultTime);
    useEffect(() => {
        if (defaultTime != null) {
            setTimeLeft(defaultTime);
        }
    }, [defaultTime]);
    console.log("defaultTime"+defaultTime);

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
    const handleFinish = (verificationId: number) => {
        // TODO: 呼叫 API 提交評論和完成狀態
        if (verificationId === location.verification_icon)
        {
            Alert.alert('恭喜你已完成取餐');
            setStatus('finish');
        }
        else
        {
             Alert.alert('驗證碼錯誤');
        }
    }

    const verificationIcons = [
        { id: 1, icon: '🎄' },
        { id: 2, icon: '😜' },
        { id: 3, icon: '😺' },
    ];

    const [reservationItems, setReservationItems] = useState([]);
    const [originalReservationItems, setOriginalReservationItems] = useState([]);
    const [isEditing, setIsEditing] = useState(false);



    async function pickupSuccess(userId, foodId, comments) 
    {
        try {
            const response = await fetch(`${BASE_URL}/pickup/pickup/success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    food_id: foodId,
                    comment: comments,
                }),
            });

            const result = await response.json();
            console.log(result);
        } catch (error) {
            console.error(error);
        }
        Alert.alert("謝謝您的評論，已完成本次預約")
    }

    async function pickupFailed(userId, foodId) 
    {

        try {
            const response = await fetch(`${BASE_URL}/pickup/pickup/fail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    food_id: foodId,
                }),
            });

            const result = await response.json();
            console.log(result);
        } catch (error) {
            console.error(error);
        }
        Alert.alert("已取消本次預約")
    }

    const handleSave = async () => {
    // 驗證每個 item 數量不超過庫存
        for (let item of reservationItems) {
            const foodItem = location.food_items.find(
                f => f.item_name === item.item_name
            );
            if (!foodItem) continue;

            const originalItem = originalReservationItems.find(
                o => o.item_id === item.item_id
            );
            if (!originalItem) continue;

            const maxAllowed =
                originalItem.number_book + foodItem.quantity;

            if (item.number_book > maxAllowed) {
                Alert.alert(
                '數量錯誤',
                `${item.item_name} 最多只能預約 ${maxAllowed} 份`
                );
                return;
            }
        }

        // 準備要送到後端的資料
        const payload = {
            items: reservationItems.map(item => ({
                item_id: item.item_id,
                new_amount: Number(item.number_book),
            })),
        };

        console.log('payload:', JSON.stringify(payload, null, 2));
        try {
            const response = await fetch(
                `${BASE_URL}/reservations/food/${location.food_id}/user/${user_id}/modify`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );
            if (!response.ok) throw new Error('Failed to update reservations');

            const updated = await response.json();
            Alert.alert(
            "已成功更改預約數量!",
            // JSON.stringify(updated, null, 2)
            );


            setIsEditing(false); // 完成編輯
            setReservationItems(updated.map(r => ({
                item_id: r.item_id,
                item_name: r.item_name,
                number_book: r.number_book
            })));
        } catch (error) {
            console.error(error);
            Alert.alert('更新失敗', error.message);
        }
    };


   useEffect(() => {
    // 只在狀態為 reserved 時抓資料
    if (status === 'reserved') {
      async function fetchFirstReservation() {
        try {
          const response = await fetch(`${BASE_URL}/reservations/user/${user_id}`);
          if (!response.ok) throw new Error('Failed to fetch reservations');

          const data = await response.json();
          console.log('All reservations:', data);

          if (data.length > 0) {
            const firstFood = data[0];
            const items = firstFood.reservations.map(r => ({
              item_id: r.item_id,
              item_name: r.item_name,
              number_book: r.number_book
            }));

            setReservationItems(items); // 自動更新 state
            setOriginalReservationItems(items);
            console.log('Item names and number booked:', items);
          }
        } catch (error) {
          console.error(error);
        }
      }

      fetchFirstReservation(); // 立即呼叫
    }
  }, [user_id, status]);

    let content;
    if (status === 'reserved') {
        // 畫面 1: 已預約 / 剩餘時間 / Arrived / Cancel
        content = (
            <>
                <Text style={styles.reservedStatus}>已預約</Text>
                {/* 顯示 item_name 和 number_book */}
                <View style={{ marginVertical: 8 }}>
                    {reservationItems.map((item, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text>{item.item_name} x </Text>

                            {isEditing ? (
                                <TextInput
                                    style={{ borderWidth: 1, width: 50, padding: 4 }}
                                    keyboardType="numeric"
                                    value={item.number_book.toString()}
                                    onChangeText={(text) => {
                                        const newItems = [...reservationItems];
                                        newItems[index].number_book = parseInt(text) || 0;
                                        setReservationItems(newItems);
                                    }}
                                />
                            ) : (
                                <Text>{item.number_book}</Text>
                            )}
                        </View>
                    ))}
                </View>
                <TouchableOpacity
                    onPress={isEditing ? handleSave : () => setIsEditing(true)}
                    style={{ backgroundColor: 'lightblue', padding: 6, borderRadius: 4, marginBottom: 8 }}
                >
                    <Text>{isEditing ? 'Save' : 'Edit'}</Text>
                </TouchableOpacity>


                <Text style={styles.reservedTimeText}>剩餘時間</Text>
                <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
                <View style={styles.reservedActions}>
                    <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived}>
                        <Text style={styles.arrivedButtonText}>Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => pickupFailed(user_id, location.food_id)}>
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
                        {verificationIcons.map(icon => ( // 模擬圖案
                            <TouchableOpacity key={icon.id} onPress={() => handleFinish(icon.id)} style={styles.verificationIcon}>
                                <Text style={styles.verificationIconText}>{icon.icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.foodListText}>
                        {reservationItems.map((item, index) => `${item.item_name} ${item.number_book}份`).join('\n')}
                    </Text>
                </View>
                <View style={styles.reservedActions}>
                    <TouchableOpacity style={styles.arrivedButtonDisabled} disabled>
                        <Text style={styles.arrivedButtonText}>Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => fetchFirstReservation()}>
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
                            <TouchableOpacity
                            key={tag}
                            style={styles.commentTag}
                            onPress={() => setComment(tag)} // 點擊時設置 comment
                            >
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
                    <TouchableOpacity style={styles.finishButton} onPress={() => pickupSuccess(user_id, location.food_id, comment)}>
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

// here start
// 計算兩點距離（km）
const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
    ) => {
const toRad = (value: number) => (value * Math.PI) / 180;
const R = 6371; // 地球半徑 km

const dLat = toRad(lat2 - lat1);
const dLon = toRad(lon2 - lon1);

const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
return R * c;
};
//here end

// --- FoodDetailSheet ---

export default function FoodDetailSheet({ location, handleClose, myUserId, IsReserved, onToggleShowMarkers }: FoodDetailSheetProps) {
    const router = useRouter();

    // 檢查是否為自己發布的食物
    const isMyFood = myUserId === location.user_id;
    // const isMyFood = 1;

    // 檢查是否已預約 (模擬：如果 ID 是 2 則視為已預約)
    // const isReserved = !isMyFood && location.user_id === RESERVED_FOOD_ID;
    const isReserved = IsReserved;
    console.log(isReserved);

    // 狀態：延遲加載預約列表
    const [reservations, setReservations] = useState<ReservationGroup[]>([]);
    const [isLoadingReservations, setIsLoadingReservations] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [timeDefault, setTimeDefault] = useState<number | null>(null);
    const [numBook, setNumBook] = useState<number | null>(null);

    // GPS 狀態 here
    const [userLocation, setUserLocation] = useState<{latitude: number;longitude: number;} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);    
    const [warningTimes, setWarningTimes] = useState<number>(0);
    
    useEffect(() => {
        const fetchAndCalculateTime = async () => {
            if (!IsReserved || !myUserId) return;

            try {
                const info = await fetchReserveInfoByUser(myUserId);
                console.log("reserve info:", info);
                if (!info) return;

                const { reserve_at, number_book } = info;
                setNumBook(number_book);
                //console.log("resesrveAt"+reserve_at);


                const reserveDate = new Date(reserve_at + 'Z');
                const now = new Date();

                const passedSeconds = Math.max(
                    Math.floor((now.getTime() - reserveDate.getTime()) / 1000),
                    0
                );

                const limitSeconds = location.time_restriction * 60;
                const remainingSeconds =
                    passedSeconds >= limitSeconds
                        ? 0
                        : limitSeconds - passedSeconds;

                console.log("numberBook:", number_book);
                console.log("passedSeconds:", passedSeconds);
                console.log("remainingSeconds:", remainingSeconds);

                setTimeDefault(remainingSeconds);

            } catch (err) {
                console.error("Failed to fetch reservation:", err);
            }
        };

        fetchAndCalculateTime();
    }, [IsReserved, myUserId]);


    // 假設這個 useEffect 在外層元件中
    useEffect(() => {
        if (isMyFood && location.food_id) {
            const foodId = location.food_id;
            setIsLoadingReservations(true);

            fetchReservationsByFood(foodId)
                // 🚨 rawReservations 預期是 { user_id: number, reservations: ReservationUserItem[] } 的陣列
                .then((rawReservations: { user_id: number, reservations: ReservationUserItem[] }[]) => { 
                    
                    const mappedReservations: ReservationGroup[] = rawReservations.map((userGroup) => {
                    const firstReservation = userGroup.reservations[0];
                    
                    // 1. 儲存原始的時間戳記字串
                    const reserveAtString = firstReservation ? firstReservation.reserve_at : '';
                    
                    // 2. 處理並提取該使用者群組內的所有品項資訊 (不變)
                    const reservedItems: GroupedReservedItem[] = userGroup.reservations.map((resItem) => {
                        return {
                            reservation_id: resItem.reservation_id,
                            item_name: resItem.item_name,
                            number_book: resItem.number_book,
                        };
                    });
                    
                    // 3. 返回合併後的使用者群組
                    return {
                        user_id: userGroup.user_id,
                        reserved_items: reservedItems,
                        
                        reserve_at: reserveAtString, 
                        
                        time_left_seconds: 0, 
                        
                        is_collected: false, // 預設未領取
                    };
                });
                
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
    }, [isMyFood, location.food_id]);

    const reservedAtStr = reservations.time_left_seconds;

    // 4. Tab View 邏輯 (使用 reservations 狀態)
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'info', title: '剩食資訊' },
        { key: 'reservations', title: '預約列表' },
    ]);

    // here start
    // check distance
    useEffect(() => {
        if (isMyFood) return;
        
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
            setLocationError('需要定位權限才能判斷是否在預約範圍內');
            return;
            }

            try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            setLocationError(null);
            } catch (e) {
            setLocationError('無法取得 GPS 位置，請確認定位已開啟');
            }
        })();
    }, [isMyFood]);

    const distanceToPost = useMemo(() => {
        if (isMyFood) return null;
        if (!userLocation) return null;
        return getDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            location.gps_latitude,
            location.gps_longitude
        );
    }, [isMyFood, userLocation, location]);

    const isWithinDistance = useMemo(() => {
        if (isMyFood) return true;
        if (distanceToPost == null) return false;
        
        return distanceToPost <= location.distance_restriction;
    }, [isMyFood, distanceToPost, location.distance_restriction]);

    // check warnings
    useEffect(() => {
        if (isMyFood) return;
        if (!myUserId || !location.food_id) return;

        fetchWarningTimes(myUserId, location.food_id)
            .then(times => {
                setWarningTimes(times);
            })
            .catch(console.error);
    }, [isMyFood, myUserId, location.food_id]);
    // here end

    const canReserve = userLocation &&isWithinDistance &&warningTimes < 2;

    return (
        <View style={{ paddingBottom: 16 }}>
            {isMyFood ? (
                // 渲染 Provider 介面
                <ProviderFoodStatusView
                    location={location}
                    reservations={reservations}
                    handleClose={handleClose}
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
                        <ReservedFoodView location={location} defaultTime={timeDefault} bookNum={numBook} user_id={myUserId}/> 
                    ) : (
                        // here start
                        <View style={{ marginTop: 12 }}>
                            {userLocation &&!isWithinDistance && (
                                <Text style={styles.outOfRangeText}>
                                不在預約範圍內
                                </Text>
                            )}
                            {warningTimes === 1 && (
                                <Text style={{ color: '#E67E22', fontSize: 12, marginBottom: 6 }}>
                                    ⚠️ 你已有 1 次未取餐紀錄，請準時領取以免被限制預約
                                </Text>
                            )}
                            {warningTimes >= 2 && (
                                <Text style={{ color: 'red', fontSize: 12 }}>
                                    你已被限制預約此食物
                                </Text>
                            )}

                            <TouchableOpacity
                                style={[
                                styles.reserveButton,
                                !canReserve && styles.reserveButtonDisabled
                                ]}
                                disabled={!canReserve}
                                onPress={() => {
                                router.push({
                                    pathname: '/(main)/reserve',
                                    params: { food_id: location.food_id.toString() }
                                });
                                }}
                            >
                                <Text style={styles.reserveButtonText}>
                                    預約剩食
                                </Text>
                            </TouchableOpacity>

                        </View>
                        // here end
                    )}
                </View>
            )}
        </View>
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

    // here start
    outOfRangeText: {
        color: '#E74C3C',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 6,
    },

    reserveButtonDisabled: {
        backgroundColor: '#CCC',
    },
    // here end
    
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
    addressContainer: {
        flexDirection: 'row', // 讓地址和驗證圖案並排
        alignItems: 'center',
        flex: 1, 
    },
    verificationIconText: {
        fontSize: 18, // 確保與地址文字大小相匹配
        lineHeight: 22, // 確保垂直對齊
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