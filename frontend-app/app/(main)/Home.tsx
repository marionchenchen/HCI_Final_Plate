import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated,
    Alert,
    Image,
    ImageSourcePropType,
} from "react-native";
import MapView, { Marker, Circle, Region, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FoodDetailSheet from './FoodDetailSheet'; 
import { fetchPosts, fetchFoodIdByUser, fetchReservationsByUserAndFood } from "../../api";
import { useUser } from "../../context/UserContext"
import { usePostRefresh } from '../../context/PostRefreshContext';

const LocalFoodImage = require('../../assets/pizza.jpg'); 
const LocalTreeImage = require('../../assets/tree.png'); 

const { width, height } = Dimensions.get("window");
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const MAX_SHEET_HEIGHT = 400;

const FILTER_TAGS = ['中式', '日式', '西式', '甜點', '素食', '飲料', '熱食', '冷藏'];

const CircleColors = [ "#76AE2C", "#D8B850", "#4B55BC", "#8E8F8E"]

const locationOptions = {
    accuracy: Location.Accuracy.Balanced,
    // 您也可以加入 timeout 屬性來設定超時時間
    // timeout: 10000, 
};


interface FoodItem {
    item_name: string;
    quantity: number;
}

// * 代表要顯示在頁面資訊
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

interface FrontendReservationItem {
    res_id: number;
    order_number: number;
    username: string;
    reserved_item_name: string;
    reserved_quantity: number;
    time_left_seconds: number;
    gps_latitude: number;
    gps_longitude: number;
    is_collected: boolean;
}

export default function Home() {

    const router = useRouter();
    const { userId, loading } = useUser();
    console.log("目前這台裝置的 user_id =", userId);
    const { refreshKey } = usePostRefresh();

    const [posts, setPosts] = useState<PostData[]>([]); 
    const [userFoodId, setUserFoodId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true); // 新增載入狀態
    const [error, setError] = useState<string | null>(null); // 新增錯誤狀態

    const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
    const [userRegion, setUserRegion] = useState<Region | null>(null);
    const [tracksViewMap, setTracksViewMap] = useState<{ [key: number]: boolean }>({});
    const slideAnim = useState(new Animated.Value(0))[0];

    const [reservationMarkers, setReservationMarkers] = useState<FrontendReservationItem[]>([]);

	// 獲取定位資訊
    useEffect(() => {
        (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "Cannot access location");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setUserRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
        });
        })();
    }, []);

    // 獲取所有剩食資訊(呼叫 API)
    useEffect(() => {
        async function loadPosts() {
            try {
                setIsLoading(true);
                setError(null);
                
                const apiPosts = await fetchPosts(); 
                
                // 資料格式轉換
                // 後端返回的 Post 結構可能缺少 color 和 image 欄位 <- 這啥意思 (但感覺暫時沒問題，先不要管)
                const transformedPosts: PostData[] = apiPosts.map(post => {
                    const apiPost = post as any;
                    
                    const transformedFoodItems = (apiPost.items || []).map(item => ({
                        item_name: item.item, 
                        quantity: item.number_online, 
                    }));
                    
                    return {
                        ...apiPost,
                        food_items: transformedFoodItems, 
                        image: apiPost.pictures && apiPost.pictures.length > 0 
                            ? { uri: `data:image/jpeg;base64,${apiPost.pictures[0].picture}` } 
                            : LocalFoodImage, 
                    };
                });
                setPosts(transformedPosts);
            } catch (err) {
                console.error("Failed to load posts:", err);
                setError("無法加載貼文，請檢查網絡或伺服器狀態。");
                Alert.alert("加載失敗", "無法從伺服器取得貼文。");
            } finally {
                setIsLoading(false);
            }
        }

        loadPosts();
    }, [refreshKey]); 

    // 獲取所有預約剩食(呼叫 API)
    useEffect(() => {
        if (!userId) return;

        const loadUserFood = async () => {
            try {
                const foodId = await fetchFoodIdByUser(userId);
                setUserFoodId(foodId);
                console.log("User's reserved food_id:", foodId);
            } catch (err) {
                console.error("Failed to fetch user's reservation:", err);
            }
        };

        loadUserFood();
    }, [userId]);

    // const reservations = await fetchReservationsByUserAndFood(1, 2);
    // console.log(reservations);

    const handleMarkerPress = (post: PostData) => {
        setSelectedPost(post);
        Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
        }).start();
    };

    const handleClose = () => {
        Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
        }).start(() => setSelectedPost(null));
    };

    const handleMapPress = (e: MapPressEvent) => {
        if (selectedPost) handleClose();
    };

    const bottomPosition = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-MAX_SHEET_HEIGHT, 0],
    });

    // 定義控制 Marker 顯示/隱藏的函式
    const handleToggleReservationMarkers = (
        show: boolean, 
        reservationData: FrontendReservationItem[]
    ) => {
        if (show) {
            // 顯示 Marker：將預約數據儲存到狀態中
            setReservationMarkers(reservationData);
        } else {
            // 隱藏 Marker：將狀態清空
            setReservationMarkers([]);
        }
    };

    // --- Render ---

    // 處理載入和錯誤狀態 (TODO: 樣式還沒寫)
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>正在加載貼文...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>錯誤: {error}</Text>
                {/* 可以添加一個重試按鈕 */}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                showsUserLocation
                onPress={handleMapPress}
                initialRegion={
                userRegion ?? {
                    latitude: 24.787,
                    longitude: 121.005,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                }
                }
            >
                {/* 渲染所有 posts 的圈圈 */}
                {posts.map((post) => {
                    const isTracksView = tracksViewMap[post.food_id] ?? true; 
                    const isTrack = post.food_items?.every(item=>item.quantity === 0);
                    let colorIndex = 0;
                    const isReserve = userFoodId === post.food_id;
                    console.log("isReserve" + post.food_id + isReserve);
                    if (post.user_id === userId) colorIndex = 1;
                    else if (post.food_id === userFoodId) colorIndex = 2;
                    else if (isTrack) colorIndex = 3;
                    
                    
                    return (
                        <Marker
                        key={post.food_id} 
                        coordinate={{ latitude: post.gps_latitude, longitude: post.gps_longitude }}
                        onPress={() => handleMarkerPress(post)}
                        tracksViewChanges={isTracksView}
                        onLayout={() =>
                            setTimeout(() => setTracksViewMap(prev => ({ ...prev, [post.food_id]: false })), 300)
                        }
                        >
                        <View
                            style={{
                            width: 35,
                            height: 35,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: CircleColors[colorIndex],
                            backgroundColor: 'white',
                            justifyContent: 'center',
                            alignItems: 'center',
                            }}
                        >
                            <Image
                            source={post.image}
                            style={{ width: 30, height: 30, borderRadius: 15 }}
                            />
                        </View>
                        </Marker>
                    );
                })}

                {selectedPost && (
                    <Circle
                        center={{ latitude: selectedPost.gps_latitude, longitude: selectedPost.gps_longitude }}
                        radius={selectedPost.distance_restriction}
                        strokeColor={`${selectedPost.color}AA`}
                        fillColor={`${selectedPost.color}33`}
                    />
                )}
            </MapView>

			{/* 偏好設定按鈕 */}
            <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => router.push('/(main)/NotificationPreference')} 
            >
                <Ionicons name="settings" size={26} color="#333" />
            </TouchableOpacity>

            {/* 把 selectedPost 傳到 FoodDetailSheet */}
            {selectedPost && (
                <Animated.View 
                    style={[styles.bottomSheet, { bottom: bottomPosition }]}
                    pointerEvents="box-none" 
                >
                    <FoodDetailSheet
                        location={selectedPost}
                        handleClose={handleClose}
                        myUserId={userId}
                        IsReserved={userFoodId === selectedPost.food_id}
                        onToggleShowMarkers={handleToggleReservationMarkers}
                    />
                </Animated.View>
            )}

            <View style={styles.bottomBar}>
                <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push('/(main)/newpost')}>
                <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: width,
        height: height,
    },
    settingsButton: { 
        position: 'absolute',
        top: 30,
        right: 20,
        zIndex: 10,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: MAX_SHEET_HEIGHT,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 8,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        alignItems: 'flex-end',
    },
    addButton: {
        backgroundColor: '#576238',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addButtonText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
});