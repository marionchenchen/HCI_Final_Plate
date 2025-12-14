import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet,TouchableOpacity, 
  Image, Dimensions, TextInput, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ImageSourcePropType } from 'react-native';
import { useUser } from '../../context/UserContext';
import { createReservation, getPostById, BASE_URL } from '../../api';

const { width } = Dimensions.get('window');

interface Item {
    id: number; // 🚨 item id
    item: string;
    number_online: number; // 剩餘可預約數量
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
    
    items: Item[]; // * 
    image: ImageSourcePropType; // * 
    
    color: `#${string}`; 
}

export default function ReserveQuantityScreen() {
    // 1. 獲取 food_id (來自 DetailFoodSheet 的 params)
    const { food_id } = useLocalSearchParams(); 
    const router = useRouter();
    const { userId } = useUser(); 
    
    // 2. 狀態
    const [reserveQuantities, setReserveQuantities] = useState<{ [key: number]: number | '' }>({}); 
    const [postData, setPostData] = useState<PostData | null>(null); // 貼文所有資料
    const [loading, setLoading] = useState(true);

    // 3. 使用 food_id 載入貼文資料
    useEffect(() => {
        const loadPost = async () => {
            if (!food_id) return;
            setLoading(true);
            try {
                // 確保 food_id 是字串，並傳遞給 API
                const data: PostData = await getPostById(food_id as string); 
                setPostData(data);
                
                // 初始化預約數量為 0
                const initialQuantities: { [key: number]: number | '' } = {};
                (data.items ?? []).forEach(item => {
                    const itemIdNumber = Number(item.id); 
                    if (itemIdNumber > 0) {
                        initialQuantities[itemIdNumber] = ''; 
                    } else {
                        console.error('API returned item with invalid ID:', item);
                    }
                });
                setReserveQuantities(initialQuantities);
                
            } catch (error) {
                console.error('Error loading post:', error);
                Alert.alert("載入失敗", "無法取得貼文資料，請檢查網路或後端服務。");
            } finally {
                setLoading(false);
            }
        };

        if (food_id) {
             loadPost();
        } else {
             setLoading(false);
        }
    }, [food_id]);

    // GPS 狀態
    const [gpsLocation, setGpsLocation] = useState<{ latitude: number | null, longitude: number | null }>({ latitude: null, longitude: null });
    const [locationError, setLocationError] = useState<string | null>(null);

    // --- 效果鉤子：獲取 GPS 定位 ---
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('發佈剩食需要地理位置權限，請前往設定開啟。');
                return;
            }
            
            try {
                let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setGpsLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                setLocationError(null);
            } catch (e) {
                setLocationError('無法取得 GPS 位置，請檢查您的定位服務是否開啟。');
            }
        })();
    }, []);

    const [comments, setComments] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    useEffect(() => {
        (async () => {
            try {
                const response = await fetch(`${BASE_URL}/pickup/comments/${food_id}`);
                if (!response.ok) throw new Error('Failed to fetch comments');
                const data = await response.json();
                const commentsOnly = data.map((c: any) => c.comment);
                setComments(commentsOnly);
                console.log('Fetched comments:', data); // 直接 log
            } catch (err) {
                Alert.alert('錯誤', String(err));
            }
        })();
    }, [food_id]);

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < comments.length - 1 ? prev + 1 : prev));
    };
    

    // 處理輸入數量改變
    const handleQuantityChange = (itemId: number, quantity: string) => {
        const cleanedQuantity = quantity.replace(/[^0-9]/g, '');
        const numValue: number | '' = cleanedQuantity === '' ? '' : parseInt(cleanedQuantity, 10);
        
        setReserveQuantities(prev => ({
            ...prev,
            [itemId]: numValue,
        }));
    };

    // 4. 提交預約邏輯
    const handleReservationSubmit = async () => {
        if (!userId || !postData || !postData.food_id) {
            Alert.alert('錯誤', '資料不完整，無法提交。');
            return;
        }

        if (gpsLocation.latitude === null || gpsLocation.longitude === null) {
            Alert.alert('等待定位', locationError || '正在獲取您的當前位置，請稍候再試。');
            return; // ⭐️ 這段已經可以確保 GPS 欄位不會是 null
        }
        
        // 🚀 步驟 1: 整理 Items 陣列
        const requestedItems = [];
        let totalReservedCount = 0;

        // 迭代 postData.items，只收集有預約數量的品項
        (postData.items ?? []).forEach(item => {
            const quantity = reserveQuantities[item.id] || 0;
            const numBooked = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
            
            if (numBooked > 0) {
                // 檢查是否超額 (使用 item.number_online)
                if (numBooked > item.number_online) { 
                    Alert.alert('數量錯誤', `${item.item} 預約數量 (${numBooked}) 超過剩餘數量 (${item.number_online})。`);
                    throw new Error('Quantity exceeded');
                }
                
                // 構建單一品項的請求物件
                requestedItems.push({
                    item_id: item.id,
                    number_book: numBooked,
                });
                totalReservedCount += numBooked;
            }
        });

        if (totalReservedCount === 0) {
            Alert.alert('請輸入數量', '請至少預約一份食物。');
            return;
        }

        console.log('Final Requested Items:', requestedItems);
        console.log('User ID:', userId);
        console.log('Food ID:', postData.food_id);
        
        // 🚀 步驟 2: 構建完整的單一請求物件
        const reservationPayload = {
            food_id: Number(postData.food_id),
            user_id: Number(userId),
            gps_latitude: gpsLocation.latitude as number,
            gps_longitude: gpsLocation.longitude as number,
            items: requestedItems, // 包含所有預約品項
        };

        try {
            // 🚀 步驟 3: 只呼叫一次 API
            const newReservations = await createReservation(reservationPayload);

            Alert.alert('預約成功', `已成功預約 ${newReservations.length} 個品項！`);
            // TODO: 如果有 PostRefreshContext，請在這裡呼叫 triggerRefresh()
            router.back(); 
        } catch (error) {
            console.error('Reservation failed:', error);
            Alert.alert('預約失敗', error.message || '連線錯誤或後端處理失敗，請稍後再試。');
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loadingContainer} color="#576238" />;
    }
    if (!postData) {
        return <Text style={{padding: 20}}>找不到貼文資料，請返回。</Text>;
    }

    const mainImageSource: ImageSourcePropType = postData.image;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.quantityBody}>
                
                {/* 圖片與主要資訊 */}
                <View style={styles.quantityInfo}>
                    <Image 
                        source={mainImageSource} 
                        style={styles.quantityInfoImage}
                    />
                    <Text style={styles.quantityInfoTitle}>{postData.address}</Text> 
                    <Text style={styles.quantityInfoDetail}>{postData.note}</Text>
                    <Text style={styles.quantityInfoDetail}>{`此食物規定在${postData.time_restriction}分鐘內領取`}</Text>
                </View>

                {/* 評論區 */}
                <Text style={styles.commentLabel}>其他人對這份食物的評論</Text>
                <View style={styles.commentBox}>
                    <TouchableOpacity onPress={handlePrev}>
                        <Ionicons name="caret-back" size={24} color="#333" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.commentInput}
                        value={comments[currentIndex] || ''}
                        editable={false}
                    />

                    <TouchableOpacity onPress={handleNext}>
                        <Ionicons name="caret-forward" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* 預約數量區塊 */}
                <View style={styles.quantityFormCard}>
                    <View style={styles.quantityFormTitle}>
                        <Ionicons name="document-text" size={24} color="#576238" />
                        <Text style={styles.quantityFormTitleText}>預約數量</Text>
                    </View>
                    {(postData.items ?? []).map((item) => (
                        // 🚨 使用 item.item_id 作為 key
                        <View key={Number(item.id)} style={styles.quantityInputRow}> 
                            <Text style={styles.quantityFoodName}>{item.item}</Text>
                            <Text style={styles.quantityRemaining}>剩餘 {item.number_online} 份</Text>
                            <TextInput
                                style={styles.quantityTextInput}
                                keyboardType="numeric"
                                placeholder="0"
                                value={reserveQuantities[item.id] ? String(reserveQuantities[item.id]) : ''}
                                onChangeText={(text) => handleQuantityChange(item.id, text)}
                                maxLength={2}
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
        paddingBottom: 100,
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