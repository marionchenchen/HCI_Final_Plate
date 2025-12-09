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
    ImageSourcePropType
} from "react-native";
import MapView, { Marker, Circle, Region, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FoodDetailSheet from './FoodDetailSheet'; 

const LocalFoodImage = require('../../assets/pizza.jpg'); 
const LocalTreeImage = require('../../assets/tree.png'); 
const { width, height } = Dimensions.get("window");
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const MAX_SHEET_HEIGHT = 400;
const my_user_id = 1; // 假設我是user_1!

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

export default function Home() {
    const router = useRouter();

    // 假資料，TODO: 連到table "POST"
    const posts: PostData[] = [
        {
            food_id: 101,
            user_id: 1,
            address: "女二路易莎前桌子",
            tags: ["披薩"],
            note: "建議自備容器/衛生紙",
            time_restriction: 10,
            distance_restriction: 200,
            created_at: "2025/12/9 11:00",
            updated_at: 10,
            verification_icon: LocalTreeImage,
            gps_latitude: 24.785,
            gps_longitude: 121.0,
            color: "#D8B850",
            image: LocalFoodImage,
            food_items: [
                { item_name: "蒜香起司燻雞培根披薩", quantity: 3 },
                { item_name: "香濃時蔬海鮮披薩", quantity: 5 },
            ],
        },
        {
            food_id: 102,
            user_id: 2,
            address: "工三一樓大廳旁",
            tags: ["鬆餅", "飲料"],
            note: "很好吃",
            time_restriction: 5,
            distance_restriction: 100,
            created_at: "2025/12/9 11:30",
            updated_at: 5,
            verification_icon: LocalTreeImage, 
            gps_latitude: 24.785631765168848,
            gps_longitude: 120.99699873031997,
            color: "#8E8FBE",
            image: LocalFoodImage,
            food_items: [
                { item_name: "抹茶鬆餅", quantity: 1 },
                { item_name: "黑糖奶茶", quantity: 2 },
            ],
        },
    ];

    const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
    const [userRegion, setUserRegion] = useState<Region | null>(null);
    const [tracksViewMap, setTracksViewMap] = useState<{ [key: number]: boolean }>({});
    const slideAnim = useState(new Animated.Value(0))[0];

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

    // --- Render ---
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
                {/* 遍歷 POST */}
                {posts.map((post) => {
                    const isTracksView = tracksViewMap[post.food_id] ?? true; 

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
                            borderColor: post.color,
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

            {/* 使用 selectedPost 傳到 FoodDetailSheet */}
            {selectedPost && (
                <Animated.View 
                    style={[styles.bottomSheet, { bottom: bottomPosition }]}
                    pointerEvents="box-none" 
                >
                    <FoodDetailSheet
                        location={selectedPost}
                        handleClose={handleClose}
                        myUserId={my_user_id}
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