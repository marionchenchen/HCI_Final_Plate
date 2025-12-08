import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  Image,
  Alert,
  Share,
  ImageSourcePropType
} from "react-native";
import MapView, { Marker, Circle, Region, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const LocalFoodImage = require('../../assets/pizza.jpg'); 
const { width, height } = Dimensions.get("window");
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const MAX_SHEET_HEIGHT = 400;
const my_user_id = 1;

interface FoodItem {
  item: string;
  quantity: number;
}

interface LocationData {
  user_id: number;
  address: string;
  tags?: string[];
  note: string;
  time_restriction: number;
  distance_restriction: number;
  created_at: string;
  updated_at: number;
  verification_icon: string;
  gps_latitude: number;
  gps_longitude: number;
  color: `#${string}`;
  image: ImageSourcePropType;
  foods?: FoodItem[];
}

export default function Home() {
  const router = useRouter();
  const locations: LocationData[] = [
    {
      user_id: 1,
      address: "女二路易莎前桌子",
      tags: ["披薩"],
      note: "建議自備容器/衛生紙",
      time_restriction: 10,
      distance_restriction: 200,
      created_at: "2025/12/9 11:00",
      updated_at: 10,
      verification_icon: "✔️",
      gps_latitude: 24.785,
      gps_longitude: 121.0,
      color: "#D8B850",
      image: LocalFoodImage,
      foods: [
        { item: "蒜香起司燻雞培根披薩", quantity: 3 },
        { item: "香濃蒔蔬海鮮披薩", quantity: 5 },
      ],
    },
    {
      user_id: 2,
      address: "女二路易莎前桌子",
      tags: ["披薩"],
      note: "建議自備容器/衛生紙",
      time_restriction: 10,
      distance_restriction: 200,
      created_at: "2025/12/9 11:00",
      updated_at: 10,
      verification_icon: "✔️",
      gps_latitude: 24.785631765168848,
      gps_longitude: 120.99699873031997,
      color: "#8E8FBE",
      image: LocalFoodImage,
      foods: [
        { item: "蒜香起司燻雞培根披薩", quantity: 3 },
        { item: "香濃蒔蔬海鮮披薩", quantity: 5 },
      ],
    },
  ];

  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [tracksViewMap, setTracksViewMap] = useState<{ [key: number]: boolean }>({});
  const slideAnim = useState(new Animated.Value(0))[0];

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

  const handleMarkerPress = (loc: LocationData) => {
    setSelectedLocation(loc);
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
    }).start(() => setSelectedLocation(null));
  };

  const handleMapPress = (e: MapPressEvent) => {
    if (selectedLocation) handleClose();
  };

  const handleShare = async () => {
    if (!selectedLocation) return;
    try {
      await Share.share({
        message: `${selectedLocation.address}\n`,
      });
    } catch (error) {
      Alert.alert("分享失敗", String(error));
    }
  };

  const bottomPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-MAX_SHEET_HEIGHT, 0],
  });

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
        {locations.map((loc) => {
          const isTracksView = tracksViewMap[loc.user_id] ?? true;

          return (
            <Marker
              key={loc.user_id}
              coordinate={{ latitude: loc.gps_latitude, longitude: loc.gps_longitude }}
              onPress={() => handleMarkerPress(loc)}
              tracksViewChanges={isTracksView}
              onLayout={() =>
                setTimeout(() => setTracksViewMap(prev => ({ ...prev, [loc.user_id]: false })), 300)
              }
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: loc.color,
                  backgroundColor: 'white',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={LocalFoodImage}
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                />
              </View>
            </Marker>
          );
        })}

        {selectedLocation && (
          <Circle
            center={{ latitude: selectedLocation.gps_latitude, longitude: selectedLocation.gps_longitude }}
            radius={selectedLocation.distance_restriction}
            strokeColor={`${selectedLocation.color}AA`}
            fillColor={`${selectedLocation.color}33`}
          />
        )}
      </MapView>

      {selectedLocation && (
        <Animated.View style={[styles.bottomSheet, { bottom: bottomPosition }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.receiverContentCard}>
              {/* 左圖右文 */}
              <View style={styles.topRow}>
                <Image source={selectedLocation.image} style={styles.foodImage} />
                <View style={styles.infoRight}>
                  {/* 右上角按鈕 */}
                  <View style={styles.topRightButtonContainer}>
                    {my_user_id === selectedLocation.user_id ? (
                      <TouchableOpacity 
                        onPress={() => router.push('/(main)/newpost')} 
                        style={styles.iconButton}
                      >
                        <Ionicons name="create-outline" size={24} color="#333" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                        <Ionicons name="share-social-outline" size={24} color="#333" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.receiverContentTitle}>
                    <Text style={styles.receiverTitle}>{selectedLocation.address}</Text>
                  </View>
                  <Text style={styles.receiverDetailText}>{selectedLocation.note}</Text>
                  <Text style={styles.receiverRuleText}>{`此食物規定在${selectedLocation.time_restriction}分鐘內領取`}</Text>
                  <Text style={styles.receiverDetailText}>{`(${selectedLocation.updated_at} 分鐘前編輯)`}</Text>
                </View>
              </View>

              {/* 食物列表 */}
              {(selectedLocation.foods ?? []).map((food, index) => (
                <View key={index} style={styles.receiverFoodItemRow}>
                  <Text style={styles.receiverFoodItemName}>{food.item}</Text>
                  <Text style={styles.receiverFoodItemRemaining}>剩餘 {food.quantity} 份</Text>
                </View>
              ))}

              <Text style={styles.receiverDetailText}>數量僅供參考，剩餘數量以實際情況為主</Text>

              {my_user_id !== selectedLocation.user_id ? (
                <TouchableOpacity
                  style={styles.reserveButton}
                  onPress={() => router.push('/(main)/reserve')}
                >
                  <Text style={styles.reserveButtonText}>預約剩食</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noAccessContainer}>
                  {/* 左邊按鈕 */}
                  <TouchableOpacity style={styles.disabledButton}>
                    <Text style={styles.disabledButtonText}>預約列表</Text>
                  </TouchableOpacity>

                  {/* 右邊：文字 → 圖片 → 文字 */}
                  <View style={styles.noAccessRightContent}>
                    <Text style={styles.noAccessTitle}>您的驗證碼為</Text>

                    <Image 
                      source={require('../../assets/tree.png')} 
                      style={styles.noAccessImage}
                    />

                    <Text style={styles.noAccessNote}>請在領取者螢幕上點選相同符號</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
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
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    maxHeight: MAX_SHEET_HEIGHT,
    zIndex: 999,
    elevation: 999,
  },

  receiverContentCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginHorizontal: 10,
    marginTop: 5,
  },

  topRow: { flexDirection: 'row', marginBottom: 10 },
  foodImage: { width: 100, height: 100, borderRadius: 10, marginRight: 12 },
  infoRight: { flex: 1, justifyContent: 'center' },

  receiverContentTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  receiverTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  receiverDistance: { fontSize: 14, color: '#333', flexDirection: 'row', alignItems: 'center' },

  receiverDetailText: { fontSize: 14, color: '#666', marginBottom: 3 },
  receiverRuleText: { fontSize: 12, color: '#bc4b4b', marginBottom: 5 },

  receiverFoodItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  receiverFoodItemName: { fontSize: 14, fontWeight: '500' },
  receiverFoodItemRemaining: { fontSize: 14, color: 'gray' },

  reserveButton: { backgroundColor: '#576238', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  reserveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  addButton: { 
        position: 'absolute', 
        bottom: 40, 
        alignSelf: 'center', 
        backgroundColor: '#576238', 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 5, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    addButtonText: { color: 'white', fontSize: 30, lineHeight: 30 },

    noAccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },

  disabledButton: {
    backgroundColor: '#576238',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  disabledButtonText: {
    color: '#FFFCF0',
    fontSize: 16,
    fontWeight: 'bold',
  },

  noAccessRightContent: {
    flex: 1,
    marginLeft: 15,
    alignItems: 'center',
  },

  noAccessTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 9,
    color: '#333',
  },

  noAccessImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
  },

  noAccessNote: {
    fontSize: 11,
    color: '#666',
  },

  topRightButtonContainer: {
  position: 'absolute',
  top: 0,
  right: 0,
  zIndex: 10,
},

iconButton: {
  padding: 6,
  backgroundColor: '#fff',
  borderRadius: 8,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 1.5,
},


});
