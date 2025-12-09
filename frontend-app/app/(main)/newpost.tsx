import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, 
    TouchableOpacity, Alert, Dimensions, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker';
import { createFood } from '../../api';

const { width } = Dimensions.get('window');

interface FoodItemState {
    name: string;
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
            value={foodItem.name}
            onChangeText={(text) => onFoodItemChange(index, 'name', text)}
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
    
    // --- 狀態定義 (使用您提供的預設值) ---
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [address, setAddress] = useState('工三一樓大廳');
    const [foodItems, setFoodItems] = useState<FoodItemState[]>([
        { name: '小木屋抹茶鬆餅', quantity: '6' } 
    ]);
    const [note, setNote] = useState('要自己帶容器喔！');
    const [timeRestriction, setTimeRestriction] = useState('10'); // time_restriction * (分鐘)
    const [distanceRestriction, setDistanceRestriction] = useState('2'); // distance_restriction * (公里)
    
    const [isLoading, setIsLoading] = useState(false);
    
    // GPS 相關狀態 (從上一個回答整合進來)
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

	// --- 🌟 新增：圖片選擇函式 ---
    const pickImage = async () => {
        // 請求媒體庫權限
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('權限不足', '我們需要媒體庫權限才能上傳圖片。');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // 允許編輯 (裁剪)
            aspect: [4, 3], // 設置圖片比例
            quality: 0.5, // 降低畫質以加快上傳速度
            base64: true, // 🌟 請求 Base64 編碼，方便 API 傳輸
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // 存儲圖片的 URI (用於預覽)
            setSelectedImage(result.assets[0].uri); 
            // 🌟 可以在這裡同時存儲 Base64 數據，但我們在 Publish 時再從 assets 裡讀取，確保最新數據。
        }
    };

    // --- 處理函式 ---
    
    const handleFoodItemChange = (index: number, key: keyof FoodItemState, value: string) => {
        const newFoodItems = [...foodItems];
        newFoodItems[index][key] = value;
        setFoodItems(newFoodItems);
    };

    const handleAddFoodItem = () => {
        // 限制新增空項目，除非前一個已填寫
        if (foodItems.length > 0 && (!foodItems[foodItems.length - 1].name || !foodItems[foodItems.length - 1].quantity)) {
            Alert.alert("提醒", "請先填寫完畢當前項目！");
            return;
        }
        setFoodItems([...foodItems, { name: '', quantity: '' }]);
    };

    const handleDeleteFoodItem = (index: number) => {
        const newFoodItems = foodItems.filter((_, i) => i !== index);
        setFoodItems(newFoodItems);
    };

	// 處理要丟給後端的資料
    const handlePublish = async () => {
        // 1. 驗證
        const validFoodItems = foodItems.filter(f => f.name && parseInt(f.quantity) > 0);
        
        if (!address || validFoodItems.length === 0) {
            Alert.alert('錯誤', '請填寫地點並至少輸入一項有效的剩食名稱和數量。');
            return;
        }
        
        if (!gpsLocation.latitude || !gpsLocation.longitude) {
             Alert.alert('錯誤', locationError || '無法取得您的 GPS 位置。');
             return;
        }
        
        if (!selectedImage) { // 🌟 驗證圖片是否已選取
             Alert.alert('錯誤', '請務必選擇一張剩食圖片。');
             return;
        }

        if (isLoading) return; 
        setIsLoading(true);

        // 2. 轉換圖片為 Base64 (API 傳輸格式)
        let imageBase64: string | null = null;
        try {
            // 再次從 URI 讀取 Base64 數據，確保在網路環境下穩定
            const assetResult = await ImagePicker.getMediaLibraryAssetAsync(selectedImage!);
            if (assetResult) {
                 // 重新發起請求以獲取 Base64 數據
                 const base64Result = await ImagePicker.getMediaLibraryAssetAsync(selectedImage!, { base64: true });
                 imageBase64 = base64Result?.base64 || null;
            }
        } catch (e) {
            console.error("無法取得圖片 Base64:", e);
            Alert.alert('圖片錯誤', '無法處理圖片數據，請重試。');
            setIsLoading(false);
            return;
        }

        // 3. 整理 API 傳輸資料
        const foodData = {
            address: address, 
            note: note, 
            time_restriction: parseInt(timeRestriction) || 10,
            distance_restriction: parseFloat(distanceRestriction) || 2.0,
            gps_latitude: gpsLocation.latitude,
            gps_longitude: gpsLocation.longitude,
            
            food_items: validFoodItems.map(item => ({
                name: item.name,
                quantity: parseInt(item.quantity) || 0,
            })),
            
            // 🌟 將 Base64 數據傳遞給後端，後端負責儲存並回傳 URL
            picture_base64: imageBase64,
            
            tags: validFoodItems.map(item => item.name), 
        };

        try {
            // 4. 呼叫 API
            const response = await createFood(foodData); 
            
            Alert.alert('發布成功', `剩食已發布!`);
            router.replace('/(main)/'); 

        } catch (error) {
            console.error("發布剩食失敗:", error.response ? error.response.data : error.message);
            Alert.alert('發布失敗', '無法連線到伺服器或資料驗證失敗。');
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
                {/* 🌟 圖片選擇與預覽區域 (Picture *) */}
                <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.uploadedImage} />
                    ) : (
                        <>
                            <FontAwesome name="camera" size={30} color="#BDBDBD" />
                            <Text style={styles.imageText}>點擊上傳圖片</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
                
            {/* GPS 狀態提示 */}
            {locationError && (
                 <Text style={[styles.statusText, styles.errorText]}>⚠️ {locationError}</Text>
            )}
            {!gpsLocation.latitude && !locationError && (
                 <Text style={[styles.statusText, styles.loadingText]}>⏳ 正在取得 GPS 位置...</Text>
            )}
            {gpsLocation.latitude && (
                 <Text style={[styles.statusText, { color: '#4CAF50', backgroundColor: '#E8F5E9' }]}>
                    ✔️ GPS 定位成功
                 </Text>
            )}

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
                />
                <Text style={styles.unitText}>公里</Text>
            </View>
            
            {/* 確定發布按鈕 */}
            <TouchableOpacity 
                style={styles.publishButton} 
                onPress={handlePublish}
                disabled={isLoading || !gpsLocation.latitude} // 在載入中或沒有GPS時禁用
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