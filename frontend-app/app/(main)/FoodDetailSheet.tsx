import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
    View, Text, StyleSheet, ScrollView, 
    TouchableOpacity, Image, Alert, Dimensions, TextInput, FlatList, Modal 
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share, ImageSourcePropType } from 'react-native';
import { usePostRefresh } from "../../context/PostRefreshContext";
import { fetchReservationsByFood, fetchReserveInfoByUser, fetchWarningTimes,
    pickupSuccess, pickupFail, modifyReservation, fetchUsersLocations
} from "../../api";
import * as Location from 'expo-location'; // here
import * as FileSystem from 'expo-file-system'; // here2

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
    myUserId: number | null;
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
    item_id: number;
    item_name: string;
    number_book: number;
}

// 🌟 最終狀態使用的使用者群組介面 (簡化且優化)
interface ReservationGroup {
    user_id: number;
    time_left_seconds: number; 
    reserve_at: string;
    reserved_items: GroupedReservedItem[]; 
    is_collected: boolean; 
}

async function sharePost({
  address,
  foodItems,
}: {
  address: string;
  foodItems: { item_name: string }[];
}) {
  try {
    // 1. 組合分享文字
    const itemsText = foodItems.map(f => f.item_name).join('、');
    const message = `我在「${address}」發現了 ${itemsText}，快來一決剩 food！`;

    // 2. 直接分享文字
    await Share.share({
      message,
    });
  } catch (err) {
    Alert.alert('分享失敗', String(err));
  }
}

// --------------------------
// --- Provider 端顯示頁面 ---
// --------------------------

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
                    onPress: async () => {
                        try {
                            const result = await pickupSuccess(userId, foodId, ""); 

                            setLocalReservations(prev => 
                                prev.filter(userGroup => userGroup.user_id !== userId)
                            );
                            
                            if (result.message && result.message.includes("post removed")) {
                                Alert.alert("領取成功", "恭喜！所有食物已清空，貼文已自動刪除。");
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
                pathname: './editpost',
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
                        <Text style={styles.TitleText}>請於前來領取者頁面點選此符號</Text>
                    </Text>
                </View>

                {/* 編輯按鈕 (保持在右側) */}
                <TouchableOpacity 
                    onPress={handleEdit}
                    style={styles._editButton}
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
                                color={userGroup.is_collected ? '#576238' : '#fff'}
                                style={listStyles.collectedIcon}
                            />
                        </TouchableOpacity>
                    </View>
                );
            }}
            
            ListEmptyComponent={() => <Text style={listStyles.emptyText}>目前沒有預約資訊</Text>}
        />
    );
};

// --- ----------------------
// --- Receiver 端顯示畫面 ---
// --- ----------------------

interface ReservedFoodViewProps 
{
    location: PostData;
    user_id: number | null;
    reservations: ReservationGroup[];
    handleClose: () => void;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
    const R = 6371000; // meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(x));
}

const ReservedFoodView = ({ location, user_id, reservations, handleClose }: ReservedFoodViewProps) => {

    // 完整預約資訊
    const currentUserReservationGroup = useMemo(() => {
        return reservations.find(
            (group) => group.user_id === user_id
        );
    }, [reservations, user_id]);

    // 預約品項
    const reservationItems = currentUserReservationGroup?.reserved_items || [];

    // 可編輯品項(copy of 預約品項)
    const [editableReservationItems, setEditableReservationItems] = useState(reservationItems);

    // 時間&狀態
    const initialTime = location.time_restriction * 60;
    const [timeLeft, setTimeLeft] = useState<number>(initialTime); 
    const [status, setStatus] = useState<'reserved' | 'arrived' | 'finish'>('reserved');
    const [isEditing, setIsEditing] = useState(false);
    const [comment, setComment] = useState('');

    // 把原本的預約複製到可編輯的預約
    useEffect(() => {
        if (!isEditing) {
            setEditableReservationItems(reservationItems);
        }
    }, [reservationItems]);

    // 計算時間
    useEffect(() => {
        if (!currentUserReservationGroup) {
            setTimeLeft(0);
            return;
        }

        const initialTime = calculateInitialTimeLeft(
            currentUserReservationGroup.reserve_at,
            location.time_restriction 
        );
        
        setTimeLeft(initialTime);

    }, [currentUserReservationGroup, location.time_restriction]);
    
    
    // 倒數計時
    useEffect(() => {
        if (timeLeft <= 0 || status !== 'reserved') {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    handleCancel();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        
    }, [status]); 

    // 未移動檢查邏輯
    const [showNoMoveModal, setShowNoMoveModal] = useState(false);
    const hasCheckedRef = useRef(false);
    useEffect(() => {
        console.log("[NO_MOVE_CHECK] timeLeft =", timeLeft);
        console.log("[NO_MOVE_CHECK] hasChecked =", hasCheckedRef);

        if (timeLeft == null) return;
        if (timeLeft > 30) return;
        if (hasCheckedRef.current) return;

        hasCheckedRef.current = true;

        (async () => {
            try {
                // 1) 預約起點
                const groups = await fetchReservationsByFood(location.food_id);

                const myGroup = groups.find(g => g.user_id === user_id);

                const myRes = myGroup?.reservations?.[0];

                if (!myRes?.gps_latitude || !myRes?.gps_longitude) {
                    console.warn("❌ no reservation gps");
                    return;
                }

                // 2) 目前位置
                const locs = await fetchUsersLocations([user_id]);
                console.log("[NO_MOVE_CHECK] locs =", locs);

                if (!Array.isArray(locs) || locs.length === 0) {
                    console.warn("[NO_MOVE_CHECK] no location record");
                    return;
                }

                const me = locs[0];
                if (
                    me.gps_latitude == null ||
                    me.gps_longitude == null
                ) {
                    console.warn("[NO_MOVE_CHECK] gps missing", me);
                    return;
                }

                // 3) 算距離
                const d = distanceMeters(
                    myRes.gps_latitude,
                    myRes.gps_longitude,
                    me.gps_latitude,
                    me.gps_longitude
                );

                console.log("[NO_MOVE_CHECK] distance (m) =", d);

                if (d < 200) {
                    console.log("⚠️ NO MOVE detected → show modal");
                    setShowNoMoveModal(true);
                } else {
                    console.log("✅ user moved");
                }
            } catch (e) {
                console.error("❌ NO_MOVE_CHECK failed", e);
            }
        })();
    }, [timeLeft]);

    // 抵達
    const handleArrived = () => {
        setStatus('arrived');
    };

    // 完成領取、提交驗證碼
    const handleFinish = (verificationId: number) => {
        if (verificationId === location.verification_icon) {
            setStatus('finish');
        } else {
            Alert.alert('驗證碼錯誤');
        }
    };
    
    // 儲存修改的預約數量
    const handleSave = async () => {
        const payload = {
            items: editableReservationItems.map(item => ({
                item_id: item.item_id,
                new_amount: Number(item.number_book),
            })),
        };
        try {
            await modifyReservation(location.food_id, user_id, payload);
            console.log(`預約編輯成功`);
            handleClose();
        } catch (error) {
            console.error("編輯失敗:", error);
        }
    };

    // 取消
    const handleCancel = async () => {
        try {
            await pickupFail(user_id, location.food_id); 
            handleClose();
        } catch (error) {
            console.error("取消失敗:", error);
        }
    };

    // 送出評論&完成訂單
    const handleFinalSubmission = async (comment: string) => {
        try {
            await pickupSuccess(user_id, location.food_id, comment); 
            console.log(`評論提交成功: ${comment}`);
            handleClose();
        } catch (error) {
            console.error("提交評論或完成領取失敗:", error);
        }
    };

    let content;

    if (status === 'reserved') {
        // 畫面 1: 已預約 / 剩餘時間 / Edit / Arrived / Cancel
        content = (
            <>
                {/* 1. 剩餘時間顯示 */}
                <View style={styles.timerBox}>
                    <Text style={styles.timerTitle}>請於以下時間內抵達</Text>
                    <Text style={styles.timeLeftText}>{formatTime(timeLeft)}</Text> 
                </View>

                {/* 2. 預約品項列表 (可編輯) */}
                <Text style={styles.sectionTitle}>您的預約品項</Text>
                
                <View style={styles.itemsListContainer}>
                    {editableReservationItems.length > 0 ? (
                        editableReservationItems.map((item, index) => (
                            <View key={item.reservation_id} style={styles.itemRow}>
                                {/* 品項名稱 */}
                                <Text style={styles.itemName}>{item.item_name} x </Text>

                                {/* 數量輸入框或文字 */}
                                {isEditing ? (
                                    <TextInput
                                        style={styles.quantityInput}
                                        keyboardType="numeric"
                                        value={String(item.number_book)}
                                        onChangeText={(text) => {
                                            const newAmount = parseInt(text) || 0; 
                                            setEditableReservationItems(prevItems => {
                                                return prevItems.map((currentItem, idx) => 
                                                    idx === index 
                                                        ? { ...currentItem, number_book: newAmount }
                                                        : currentItem
                                                );
                                            });
                                        }}
                                        onBlur={() => {
                                            setEditableReservationItems(prevItems => {
                                            // 修正 onBlur 邏輯：檢查 item 確保 number_book >= 1
                                            if (prevItems[index].number_book < 1) {
                                                return prevItems.map((currentItem, idx) =>
                                                    idx === index
                                                        ? { ...currentItem, number_book: 1 } // 設回 1
                                                        : currentItem
                                                );
                                            }
                                            return prevItems; // 否則返回原來的狀態
                                            });
                                        }}
                                    />
                                ) : (
                                    <Text style={styles.itemQuantity}>{item.number_book} 份</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noItemsText}>目前沒有預約品項。</Text>
                    )}
                </View>
                
                {/* 3. 編輯/儲存按鈕 */}
                <View style={styles.editButtonContainer}>
                    {isEditing ? (
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>儲存修改</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                            <Ionicons name="create-outline" size={20} color="#3498DB" />
                            <Text style={styles.editButtonText}>修改預約數量</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 4. 底部動作按鈕 (Arrive 和 Cancel) */}
                <View style={styles.actionButtonContainer}>
                    
                    {/* Arrive 按鈕 */}
                    <TouchableOpacity 
                        style={[styles.arriveButton]} 
                        onPress={handleArrived} 
                    >
                        <Text style={styles.arriveButtonText}>
                            {`抵達`}
                        </Text>
                    </TouchableOpacity>

                    {/* Cancel 按鈕 */}
                    <TouchableOpacity 
                        style={styles.cancelButton} 
                        // 這裡的取消按鈕應觸發確認對話框，然後再呼叫 pickupFail
                        onPress={() => {
                            Alert.alert(
                                "確認取消",
                                "您確定要取消本次預約嗎？",
                                [
                                    { text: "否", style: "cancel" },
                                    { text: "是", onPress: () => handleCancel() },
                                ]
                            );
                        }}
                    >
                        <Text style={styles.cancelButtonText}>取消預約</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    } else if (status === 'arrived') {
        // 畫面 2: 驗證碼
        content = (
            <View style={styles.arrivedVerificationContainer}>
                
                {/* 頂部驗證碼提示 */}
                <View>
                {/*<View style={styles.verificationPrompt}>*/}
                    <Text style={styles.verificationTitle}>請讓發食者點選驗證碼</Text>
                    
                    {/* 驗證圖案/按鈕區 */}
                    <View style={styles.verificationIcons}>
                        {verificationIcons.map(icon => ( // 模擬圖案
                            <TouchableOpacity 
                                key={icon.id} 
                                onPress={() => handleFinish(icon.id)} 
                                style={styles.verificationIcon}
                            >
                                <Text style={styles.verificationIconText_}>{icon.icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {/* 預約品項列表 */}
                    <Text style={styles.foodListText}>
                        請確認下列品項都已交給領取者
                    </Text>
                    <Text style={styles.foodListText}>
                    </Text>
                    <Text style={styles.foodListText}>
                        {reservationItems.map((item, index) => 
                            `${item.item_name} ${item.number_book}份`
                        ).join('\n')}
                    </Text>
                </View>
            </View>
        );
    } else if (status === 'finish') {
        // 畫面 3: 評論區
        content = (
            <View style={styles.finishContainer}>
                
                <View style={styles.commentSection}>
                    <Text style={styles.commentTitle}>領取成功~ 食物如何？</Text>
                    
                    {/* 評論標籤區 */}
                    <View style={styles.commentEmojis}>
                        {['🔥 還是熱的', '😋 好吃', '🌿 超出期待', '💡 cp值高']
                            .map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[styles.commentTag, comment === tag && styles.commentTagActive]}
                                    onPress={() => setComment(tag)} // 點擊時設置 comment
                                >
                                    <Text style={styles.commentTagText}>{tag}</Text>
                                </TouchableOpacity>
                            )
                        )}
                    </View>
                    
                    {/* 評論輸入框 */}
                    <TextInput
                        style={styles.commentInput}
                        placeholder="想留下什麼給發佈者..."
                        multiline
                        value={comment}
                        onChangeText={setComment}
                    />
                    
                    {/* 最終完成按鈕：觸發 API 提交評論 */}
                    <TouchableOpacity 
                        style={styles.finishButton} 
                        onPress={() => handleFinalSubmission(comment)}
                    >
                        <Text style={styles.finishButtonText}>提交評論並完成</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <>
            <View style={styles.reservedContentWrapper}>
                {content}
            </View>

            <Modal
                visible={showNoMoveModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNoMoveModal(false)}
            >
                <View style={styles.noMoveOverlay}>
                    <View style={styles.noMoveCard}>
                        <Text style={styles.noMoveTitle}>偵測到你</Text>
                        <Text style={styles.noMoveTitle}>5 分鐘內</Text>
                        <Text style={styles.noMoveTitle}>尚未移動</Text>

                        <TouchableOpacity
                            style={styles.keepButton}
                            onPress={() => {
                                setShowNoMoveModal(false);
                                // TODO: 後端加「保留但記警告」API
                            }}
                        >
                            <Text style={styles.keepButtonText}>保留預約</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelReserveButton}
                            onPress={() => {
                                setShowNoMoveModal(false);
                                pickupFailed(user_id, location.food_id);
                            }}
                        >
                            <Text style={styles.cancelReserveButtonText}>取消預約</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

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

export default function FoodDetailSheet({ location, handleClose, myUserId, onToggleShowMarkers }: FoodDetailSheetProps) {
    const router = useRouter();

    // 檢查是否為自己發布的食物
    const isMyFood = myUserId === location.user_id;

    // 加載預約列表
    const [reservations, setReservations] = useState<ReservationGroup[]>([]);
    const [isLoadingReservations, setIsLoadingReservations] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [numBook, setNumBook] = useState<number | null>(null);

    // GPS 狀態 here
    const [userLocation, setUserLocation] = useState<{latitude: number;longitude: number;} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);    
    const [warningTimes, setWarningTimes] = useState<number>(0);

    // 抓預約資料
    const fetchCurrentReservations = useCallback(async () => {
        if (location.food_id) {
            const foodId = location.food_id;
            setIsLoadingReservations(true);

            fetchReservationsByFood(foodId)
                .then((rawReservations: { user_id: number, reservations: ReservationUserItem[] }[]) => { 
                    
                    const mappedReservations: ReservationGroup[] = rawReservations.map((userGroup) => {
                    const firstReservation = userGroup.reservations[0];
                    
                    // 1. 儲存原始時間
                    const reserveAtString = firstReservation ? firstReservation.reserve_at : '';
                    
                    // 2. 儲存使用者的預約品項
                    const reservedItems: GroupedReservedItem[] = userGroup.reservations.map((resItem) => {
                        return {
                            reservation_id: resItem.reservation_id,
                            item_id: resItem.item_id,
                            item_name: resItem.item_name,
                            number_book: resItem.number_book,
                        };
                    });
                    
                    return {
                        user_id: userGroup.user_id,
                        reserved_items: reservedItems,
                        reserve_at: reserveAtString, 
                        time_left_seconds: 0, 
                        is_collected: false,
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
    }, [location.food_id]);

    useEffect(() => {
        fetchCurrentReservations(); 

        const pollingInterval = setInterval(() => {
            //console.log(`[Provider Sheet] 輪詢中，獲取 Food ID: ${location.food_id} 的最新預約`);
            fetchCurrentReservations(); 
        }, 2000);

        return () => {
            clearInterval(pollingInterval);
        };
        
    }, [fetchCurrentReservations]);

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
    const currentUserReservationGroup = reservations.find(
        (group) => group.user_id === myUserId
    );

    const isCurrentUserReserved = !!currentUserReservationGroup;

    const formatTimeTaipei = (isoString: string) => {
        if (!isoString) return '';

        try {
            const date = new Date(isoString);

            // 中原標準時間 (UTC) ➜ 台北時間 (UTC+8)
            let hours = date.getUTCHours() + 16;
            const minutes = date.getUTCMinutes();

            if (hours >= 24) hours -= 24;

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } catch (e) {
            console.error('時間轉換失敗:', e);
            return isoString.substring(11, 16);
        }
    };

    const formatTimeAgo = (isoString: string) => {
        if (!isoString) return '';

        const utcIsoString = isoString.endsWith('Z') ? isoString : isoString + 'Z';
        const postDate = new Date(utcIsoString); 
        
        const currentDate = new Date();
        
        const timeDifferenceMs = currentDate.getTime() - postDate.getTime();
        
        const seconds = Math.floor(timeDifferenceMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} 天前 (${formatTimeTaipei(isoString)})`;
        }
        if (hours > 0) {
            return `${hours} 小時前`;
        }
        if (minutes > 0) {
            return `${minutes} 分鐘前`;
        }
        // 如果小於一分鐘，顯示「剛剛」
        return '剛剛';
    };

    const unreservedContent = (
        <>
            {/* 1. 頂部資訊區塊 (左圖右文) */}
            <View style={styles.topRow}>
                <Image source={location.image} style={styles.foodImage} />
                <View style={styles.infoRight}>
                    {/* 右上角分享按鈕 */}
                    <View style={styles.topRightButtonContainer}>
                        <TouchableOpacity
                            onPress={() =>
                                sharePost({
                                    address: location.address,
                                    foodItems: location.food_items,
                                })
                            }
                        >
                            <Ionicons name="share-social-outline" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.receiverTitle}>{location.address}</Text>
                    <Text style={styles.receiverDetailText}>{location.note}</Text>
                    <Text style={styles.receiverDetailText}>{`此食物規定在${location.time_restriction}分鐘內領取`}</Text>
                    <Text style={styles.receiverDetailText}>{`於 ${formatTimeTaipei(location.created_at)} 發布 (${formatTimeAgo(location.updated_at)}編輯過)`}</Text>
                </View>
            </View>

            {/* 2. 食物列表 */}
            {(location.food_items ?? []).map((food, index) => (
                <View key={index} style={styles.receiverFoodItemRow}>
                    <Text style={styles.receiverFoodItemName}>{food.item_name}</Text>
                    <Text style={styles.receiverFoodItemRemaining}>剩餘 {food.quantity} 份</Text>
                </View>
            ))}

            {/* 3. 底部動作區塊 (未預約時的按鈕和警告) */}
            <View style={{ marginTop: 12 }}>
                {userLocation && !isWithinDistance && (
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
                            pathname: './reserve',
                            params: { food_id: location.food_id.toString() }
                        });
                    }}
                >
                    <Text style={styles.reserveButtonText}>
                        預約剩食
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <View>
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
                    {isCurrentUserReserved ? (
                        <ReservedFoodView 
                            location={location} 
                            user_id={myUserId} 
                            reservations={reservations}
                            handleClose={handleClose}
                        /> 
                    ) : (
                        unreservedContent
                    )}
                </View>
            )}
        </View>
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
        color: '#576238',
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
    
    // -- 評論畫面 (finish status) --
    _commentSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    _commentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    _commentEmojis: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 10,
    },
    _commentTag: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
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
        marginTop: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    addressContainer: {
        flexDirection: 'row', // 讓地址和驗證圖案並排
        alignItems: 'center',
        flex: 1, 
        flexWrap: 'wrap',
    },
    verificationIconText: {
        fontSize: 35, // 確保與地址文字大小相匹配
        lineHeight: 40, // 確保垂直對齊
    },
    TitleText: {
        fontSize: 18, // 確保與地址文字大小相匹配
        lineHeight: 40, // 確保垂直對齊
        textAlign: 'center',
        padding: 20,
        color: 'black',
        //fontStyle: 'italic',
    },
    _editButton: {
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
    
    //rewrite
    
    noItemsText: {
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 15,
    },

    // --- 1. 計時器區塊 (TimerBox) ---
    timerBox: {
        padding: 15,
        alignItems: 'center'
    },
    timerTitle: {
        fontSize: 14,
        color: '#A0522D',
        fontWeight: '600',
        marginBottom: 4,
    },
    timeLeftText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#D32F2F',
        letterSpacing: 1,
    },

    // --- 2. 品項列表 (Items List) ---
    itemsListContainer: {
        backgroundColor: '#FFF',
        width: '80%',
        alignContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    itemName: {
        fontSize: 15,
        color: '#555',
        fontWeight: '500',
        marginRight: 4,
        flexShrink: 1, // 防止名稱過長時 TextInput 被擠壓
    },
    itemQuantity: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: '#A0A0A0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        width: 50,
        textAlign: 'center',
        fontSize: 15,
    },

    // --- 3. 編輯/儲存按鈕 ---
    editButtonContainer: {
        alignItems: 'flex-end',
        marginTop: 10,
        marginBottom: 15,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor: '#EBF5FF', // 淺藍色背景
    },
    editButtonText: {
        color: '#3498DB',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    saveButton: {
        backgroundColor: '#2ECC71', // 綠色背景
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },

    // --- 4. 底部動作按鈕 ---
    actionButtonContainer: {
        marginTop: 15,
        paddingTop: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    
    // Arrive 按鈕
    arriveButton: {
        backgroundColor: '#576238', // 綠色
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        flex: 1, 
        marginRight: 10,
    },
    arriveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#D32F2F', 
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        flex: 1,
    },
    cancelButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // 驗證碼
    arrivedVerificationContainer: {
        alignItems: 'center',
        padding: 20,
        marginTop: 15,
        width: '100%',
        height: '100%',
        backgroundColor: '#ECF0F1',
    },
    verificationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    verificationIcons: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 20,
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verificationIcon: {
        height: 80,
        width: 80,
        backgroundColor: 'white',
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 40,
        padding: 10,
        margin: 'auto',
        justifyContent: 'center',
        alignItems: 'center',
    },
    verificationIconText_: {
        fontSize: 39,
    },
    foodListText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    
    // 評論區
    finishContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ECF0F1',
        borderRadius: 10,
        marginTop: 15,
        width: '100%',
        left: 0,
        right: 0,
    },
    commentSection: {
        alignItems: 'center',
        width: '100%',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    commentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2C3E50',
        textAlign: 'center',
    },
    commentEmojis: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 15,
    },
    commentTag: {
        backgroundColor: '#EAECEE',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        margin: 5,
    },
    commentTagActive: {
        backgroundColor: '#2ECC71', // 點擊後的顏色
    },
    commentTagText: {
        color: '#2C3E50',
        fontWeight: '500',
    },
    commentInput: {
        height: 80,
        borderColor: '#BDC3C7',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        textAlignVertical: 'top', // 讓多行輸入從頂部開始
    },
    // 底部按鈕禁用樣式 (確保它們仍然被渲染但不可點擊)
    cancelButtonDisabled: {
        flex: 1,
        backgroundColor: '#BDC3C7', 
        padding: 12,
        borderRadius: 8,
        marginLeft: 10,
        alignItems: 'center',
    },
    
    // 未移動遮罩
    // 未移動遮罩
    noMoveOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    noMoveCard: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: "#5B5F3B", // 你截圖那個綠底
        borderRadius: 24,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    noMoveTitle: {
        fontSize: 36,
        fontWeight: "800",
        color: "#F2F0E6",
        lineHeight: 42,
        textAlign: "center",
    },
    keepButton: {
        marginTop: 26,
        width: "100%",
        paddingVertical: 18,
        borderRadius: 22,
        backgroundColor: "#79B22C",
        alignItems: "center",
    },
    keepButtonText: {
        fontSize: 26,
        fontWeight: "800",
        color: "#F2F0E6",
    },
    cancelReserveButton: {
        marginTop: 18,
        width: "100%",
        paddingVertical: 18,
        borderRadius: 22,
        backgroundColor: "#B24A4A",
        alignItems: "center",
    },
    cancelReserveButtonText: {
        fontSize: 26,
        fontWeight: "800",
        color: "#F2F0E6",
    }
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