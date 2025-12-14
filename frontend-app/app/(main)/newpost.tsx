import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, 
    TouchableOpacity, Alert, Dimensions, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker';
import { publishFoodPost } from '../../api';
import { useUser } from "../../context/UserContext"
import { usePostRefresh } from '../../context/PostRefreshContext';

const { width } = Dimensions.get('window');

interface FoodItemState {
    item_name: string;
    quantity: string;
}

const baseInputStyle = {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#333',
};

const styles = StyleSheet.create({
    scrollContainer: {
        paddingBottom: 40,
        backgroundColor: '#FAF9F6', 
        minHeight: Dimensions.get('window').height,
    },
    header: {
        paddingTop: 20, 
        paddingBottom: 20,
        alignItems: 'center',
        backgroundColor: '#FAF9F6',
    },

    imagePlaceholder: {
        width: width * 0.45,
        height: width * 0.45,
        borderWidth: 2,
        borderColor: '#BDBDBD',
        borderStyle: 'dashed',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        overflow: 'hidden',
    },
    imageText: {
        marginTop: 5,
        color: '#BDBDBD',
        fontSize: 12,
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    
    formCard: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 8,
        color: '#333',
    },
    input: baseInputStyle, 
    
    noteInput: {
        ...baseInputStyle,
        height: 80,
        textAlignVertical: 'top',
    },

    foodItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    foodNameInput: {
        ...baseInputStyle,
        flex: 2,
        marginRight: 10,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    quantityInput: {
        ...baseInputStyle, 
        flex: 1,
        padding: 12,
        marginRight: 5,
        textAlign: 'center',
    },
    deleteButton: {
        padding: 5,
    },
    addFoodButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10,
    },
    addFoodText: {
        fontSize: 24,
        color: '#666',
        fontWeight: '300',
    },

    ruleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    ruleText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
    },
    ruleInput: {
        ...baseInputStyle, 
        width: 50,
        textAlign: 'center',
        padding: 8,
        marginHorizontal: 5,
    },
    unitText: {
        fontSize: 14,
        color: '#666',
    },

    publishButton: {
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    publishButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusText: {
        textAlign: 'center',
        marginBottom: 10,
        padding: 5,
        borderRadius: 5,
    },
    errorText: {
        color: '#D32F2F',
        backgroundColor: '#FFEBEE',
        fontWeight: 'bold',
    },
    loadingText: {
        color: '#FF9800',
        backgroundColor: '#FFF8E1',
    }
});


// --- 增加食物 ---

const FoodItemInput = ({ index, foodItem, onFoodItemChange, onDelete }: { index: number, foodItem: FoodItemState, onFoodItemChange: (index: number, key: keyof FoodItemState, value: string) => void, onDelete: (index: number) => void }) => (
    <View style={styles.foodItemContainer}>
        <TextInput
            style={[styles.foodNameInput]} 
            placeholder="請輸入剩食名稱 (例如：小木屋抹茶鬆餅)"
            value={foodItem.item_name}
            onChangeText={(text) => onFoodItemChange(index, 'item_name', text)}
        />
        
        <View style={styles.quantityContainer}>
            <TextInput
                style={styles.quantityInput}
                placeholder="數量"
                keyboardType="numeric"
                value={foodItem.quantity}
                onChangeText={(text) => onFoodItemChange(index, 'quantity', text)}
            />
            {index > 0 && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(index)}>
                    <Ionicons name="close-circle" size={26} color="#D32F2F" />
                </TouchableOpacity>
            )}
        </View>
    </View>
);


// --- 主畫面 ---

export default function NewPostScreen() {
    const router = useRouter();
    const { triggerRefresh } = usePostRefresh();

    // --- 狀態定義 ---
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); // 用於預覽的 URI
    const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null); // 用於 API 傳輸的 Base64
    const [address, setAddress] = useState('');
    const [foodItems, setFoodItems] = useState<FoodItemState[]>([
        { item_name: '', quantity: '' } 
    ]);
    const [note, setNote] = useState('');
    const [timeRestriction, setTimeRestriction] = useState(''); // time_restriction (分鐘)
    const [distanceRestriction, setDistanceRestriction] = useState(''); // distance_restriction (公里)
    
    const [isLoading, setIsLoading] = useState(false);
    const { userId, loading } = useUser();
    
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

    // --- 圖片選擇函式 ---
    const pickImage = async () => {
        // 請求媒體庫權限

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('權限不足', '我們需要媒體庫權限才能上傳圖片。');
            return;
        }
        
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, 
            aspect: [4, 3], 
            quality: 0.5, 
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImageUri(result.assets[0].uri); 
            setSelectedImageBase64(result.assets[0].base64); 
        }
    };

    // --- 處理函式 ---
    
    const handleFoodItemChange = (index: number, key: keyof FoodItemState, value: string) => {
        const newFoodItems = [...foodItems];
        newFoodItems[index][key] = value;
        setFoodItems(newFoodItems);
    };

    const handleAddFoodItem = () => {
        if (foodItems.length > 0 && (!foodItems[foodItems.length - 1].item_name || !foodItems[foodItems.length - 1].quantity)) {
            Alert.alert("提醒", "請先填寫完畢當前項目！");
            return;
        }
        setFoodItems([...foodItems, { item_name: '', quantity: '' }]); 
    };

    const handleDeleteFoodItem = (index: number) => {
        const newFoodItems = foodItems.filter((_, i) => i !== index);
        setFoodItems(newFoodItems);
    };

    // 處理要丟給後端的資料
    const handlePublish = async () => {
        // 確認必填欄位
        if (
            !gpsLocation.latitude || 
            foodItems.every(item => !item.item_name || !item.quantity) ||
            !selectedImageBase64 ||
            !address ||
            !timeRestriction ||
            !distanceRestriction
        ) {
            Alert.alert("警告", "請填寫所有必填欄位 (地點、至少一個食物項目、圖片、GPS定位)。");
            return;
        }

        const itemsPayload = foodItems
            .filter(item => item.item_name && item.quantity)
            .map(item => ({
                item: item.item_name,             
                number_online: Number(item.quantity),
                number_onsite: Number(item.quantity),
            }));

        const picturesPayload = selectedImageBase64 ? [{
            picture: selectedImageBase64
        }] : [];


        const postPayload = {
            user_id: userId,
            address: address,
            note: note,
            
            gps_latitude: gpsLocation.latitude!,
            gps_longitude: gpsLocation.longitude!,
            
            time_restriction: Number(timeRestriction), 
            distance_restriction: Number(distanceRestriction),
            
            items: itemsPayload,
            pictures: picturesPayload,
        };
        
        //console.log("Payload sent to API:", JSON.stringify(postPayload, null, 2));

        setIsLoading(true); 

        try {
            const newPost = await publishFoodPost(postPayload);
            triggerRefresh();
            Alert.alert("發布成功", `您的剩食貼文 (ID: ${newPost.food_id}) 已成功發布！`);
            router.back(); 
            
        } catch (error: any) {
            console.error("Publish Error:", error);
            Alert.alert("發布失敗", `無法發布貼文。詳情: ${error.message || '未知錯誤。'}`);
            
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render ---
    
    return (
        <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
                    {selectedImageUri ? (
                        <Image source={{ uri: selectedImageUri }} style={styles.uploadedImage} />
                    ) : (
                        <>
                            <FontAwesome name="camera" size={30} color="#BDBDBD" />
                            <Text style={styles.imageText}>點擊上傳圖片</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
            
            <View style={styles.formCard}>

            <Text style={styles.label}><Ionicons name="location" size={18} color="#333" /> 詳細地點</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="例如：女二路易莎前圓桌" />
            
            <Text style={styles.label}><Ionicons name="document-text" size={18} color="#333" /> 剩食名稱與數量</Text>
            
            {foodItems.map((item, index) => (
                <FoodItemInput 
                key={index}
                index={index}
                foodItem={item}
                onFoodItemChange={handleFoodItemChange}
                onDelete={handleDeleteFoodItem}
                />
            ))}

            <TouchableOpacity style={styles.addFoodButton} onPress={handleAddFoodItem}>
                <Text style={styles.addFoodText}>+</Text>
            </TouchableOpacity>

            <Text style={styles.label}><Ionicons name="create" size={18} color="#333" /> 備註</Text>
            <TextInput 
                style={styles.noteInput} 
                value={note} 
                onChangeText={setNote} 
                multiline 
                placeholder="請輸入備註，例如：領取容器規定..."
            />

            <Text style={[styles.label, { marginTop: 20 }]}>預約規則設定</Text>
            
            <View style={styles.ruleContainer}>
                <Ionicons name="time" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={styles.ruleText}>領取者若未在此時限內抵達，預約會被取消</Text>
                <TextInput 
                    style={styles.ruleInput} 
                    keyboardType="numeric" 
                    value={timeRestriction} 
                    onChangeText={setTimeRestriction} 
                    placeholder="10"
                />
                <Text style={styles.unitText}>分鐘</Text>
            </View>
            
            <View style={styles.ruleContainer}>
                <Ionicons name="map" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={styles.ruleText}>僅開放此範圍內的預約</Text>
                <TextInput 
                    style={styles.ruleInput} 
                    keyboardType="numeric" 
                    value={distanceRestriction} 
                    onChangeText={setDistanceRestriction} 
                    placeholder="1"
                />
                <Text style={styles.unitText}>公里</Text>
            </View>
            
            <TouchableOpacity 
                style={styles.publishButton} 
                onPress={handlePublish}
                disabled={isLoading || !gpsLocation.latitude}
            >
                <Text style={styles.publishButtonText}>
                    {isLoading ? "發布中..." : "確定發布剩食"}
                </Text>
            </TouchableOpacity>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}