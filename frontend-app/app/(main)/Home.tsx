import React, { useState, useEffect, useCallback } from "react";
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
import { useFocusEffect } from '@react-navigation/native';

const LocalFoodImage = require('../../assets/pizza.jpg'); 
const LocalTreeImage = require('../../assets/tree.png'); 

const { width, height } = Dimensions.get("window");
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const MAX_SHEET_HEIGHT = 400;

const CircleColors = [ "#76AE2C", "#D8B850", "#4B55BC", "#8E8F8E"]

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
    verification_icon: number; // **
    gps_latitude: number;
    gps_longitude: number;
    
    food_items: FoodItem[]; // * 
    image: ImageSourcePropType; // * 
    
    color: string; 
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

// notification start
const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
// notification end

export default function Home() {

    const router = useRouter();
    const { userId, loading } = useUser();
    // console.log("目前這台裝置的 user_id =", userId);
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

    // notification start
    const [incomingPost, setIncomingPost] = useState<PostData | null>(null);
    const seenPostIdsRef = React.useRef<Set<number>>(new Set());

    // find new post
    useEffect(() => {
        if (posts.length === 0) return;

        posts.forEach(p => seenPostIdsRef.current.add(p.food_id));
    }, [posts]);
    
    // 5 秒後自動消失
    useEffect(() => {
        if (!incomingPost) return;

        const timer = setTimeout(() => {
            setIncomingPost(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [incomingPost]);
    // notification end

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

    const loadPosts = useCallback(async (isPolling = false) => {
        if (!isPolling) {
             setIsLoading(true);
        }
        setError(null);
        
        try {
            
            const apiPosts = await fetchPosts(); 
            
            // 資料格式轉換
            const transformedPosts = apiPosts.map(post => {
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
                    color: getPostColor(apiPost)
                    
                };
            });
            
            setPosts(transformedPosts);
            // console.log(posts);
            
        } catch (err) {
            console.error("Failed to load posts:", err);
            setError("無法加載貼文，請檢查網絡或伺服器狀態。");
            if (!isPolling) { 
                Alert.alert("加載失敗", "無法從伺服器取得貼文。");
            }
        } finally {
            if (!isPolling) {
                setIsLoading(false);
            }
        }
    }, [setIsLoading, setError, setPosts, fetchPosts, LocalFoodImage, userFoodId]);

    // Provider端即時更新
    useEffect(() => {
        console.log(`本地刷新事件觸發 (Key: ${refreshKey})`);
        loadPosts();
    }, [refreshKey, loadPosts]);

    // Receiver端定時重抓
    useEffect(() => {
        const pollingInterval = setInterval(() => {
            loadPosts(true); 
            //loadUserFood();
        }, 5000);

        return () => {
            console.log("輪詢計時器已清除。");
            clearInterval(pollingInterval);
        };

    }, [loadPosts, userFoodId]);


    //獲取所有預約剩食(呼叫 API)
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
    }, [loadPosts, userId]);

    // const loadUserFood = useCallback(async () => {
    //     if (!userId) {
    //         // 這裡不需要 return，因為外面調用前可能就已經檢查了，
    //         // 但為了函式的健壯性，可以保留這個檢查
    //         return; 
    //     }

    //     try {
    //         // ⭐️ 實際的 API 呼叫邏輯 ⭐️
    //         const foodId = await fetchFoodIdByUser(userId);
            
    //         // 狀態更新
    //         setUserFoodId(foodId); 
            
    //         console.log("User's reserved food_id:", foodId);
    //     } catch (err) {
    //         console.error("Failed to fetch user's reservation:", err);
    //     }
    // }, [
    //     userId, 
    //     fetchFoodIdByUser, // 如果這是一個外部傳入或在元件外部定義的函式
    //     setUserFoodId       // 狀態設定器 (Setter) 必須放入依賴
    // ]);
    // notification start
    useEffect(() => {
        if (!userRegion) return;

        const interval = setInterval(async () => {
            if (incomingPost) return;
            try {
                const apiPosts = await fetchPosts();

                const transformed: PostData[] = apiPosts.map(post => {
                    const apiPost = post as any;
                    return {
                        ...apiPost,
                        food_items: (apiPost.items || []).map(i => ({
                            item_name: i.item,
                            quantity: i.number_online,
                        })),
                        image:
                            apiPost.pictures?.length > 0
                                ? { uri: `data:image/jpeg;base64,${apiPost.pictures[0].picture}` }
                                : LocalFoodImage,
                    };
                });

                // 找「新 post」
                for (const post of transformed) {
                    if (seenPostIdsRef.current.has(post.food_id)) continue;

                    seenPostIdsRef.current.add(post.food_id);

                    const distanceKm = getDistanceKm(
                        userRegion.latitude,
                        userRegion.longitude,
                        post.gps_latitude,
                        post.gps_longitude
                    );

                    if (distanceKm <= post.distance_restriction) {
                        setIncomingPost(post); // 觸發小通知
                        break;
                    }
                }

                // setPosts(transformed);
            } catch (e) {
                console.error(e);
            }
        }, 1000); // 每 3 秒



        return () => clearInterval(interval);
    }, [userRegion, incomingPost]);
    // notification end
    

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

    const getPostColor = (post: PostData) => {
        if (post.user_id === userId) return CircleColors[1];    
        if (post.food_id === userFoodId) return CircleColors[2]; 
        if (post.food_items?.every(i => i.quantity === 0)) return CircleColors[3];
        return CircleColors[0];                               
    };

    // --- Render ---

    // 處理載入和錯誤狀態
    if (isLoading) {
        return (
            <View>
                <Text>正在加載貼文...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View>
                <Text>錯誤: {error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* notification start */}
            {incomingPost && (
                <TouchableOpacity
                    style={styles.inAppNotification}
                    onPress={() => {
                        setIncomingPost(null);
                        handleMarkerPress(incomingPost);
                    }}
                >
                    <Image source={incomingPost.image} style={styles.notifyImage} />
                    <View style={{ flex: 1 }}>
                    <Text style={styles.notifyTitle}>附近有新的剩食!</Text>
                    <Text style={styles.notifyText}>
                        {incomingPost.address}
                    </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                </TouchableOpacity>
            )}
            {/* notification end */}
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

                    // let colorIndex = 0;
                    // if (post.user_id === userId) colorIndex = 1;
                    // else if (post.food_id === userFoodId) colorIndex = 2;
                    // else if (isTrack) colorIndex = 3;
                    // post.color = CircleColors[colorIndex];
                    const isReserve = userFoodId === post.food_id;

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
                            borderColor: getPostColor(post),
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
                        radius={selectedPost.distance_restriction * 1000}
                        strokeColor={`${getPostColor(selectedPost)}AA`}
                        fillColor={`${getPostColor(selectedPost)}33`}
                    />
                )}
            </MapView>

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
                        onToggleShowMarkers={handleToggleReservationMarkers}
                    />
                </Animated.View>
            )}

            {!selectedPost && ( // ⭐️ 關鍵：只有在 selectedPost 為 null 時才顯示按鈕
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push('/(main)/newpost')}>
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        bottom: 30,
        left: 0, 
        right: 0,
        alignItems: 'center',
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
    // notification start
    inAppNotification: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        zIndex: 999,
    },
    notifyImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 10,
    },
    notifyTitle: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    notifyText: {
        fontSize: 12,
        color: '#666',
    },
    // notification end
});