import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, 
    TouchableOpacity, Alert, Dimensions, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker';
import { updatePost, getPostById } from '../../api';
import { useUser } from "../../context/UserContext"
import { usePostRefresh } from "../../context/PostRefreshContext";

const { width } = Dimensions.get('window');
const selectedTag = "中式";

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
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    itemInputName: { flex: 2, marginRight: 10 },
    itemInputQuantity: { flex: 1, textAlign: 'center' }
});

// --- 主畫面 ---

interface ItemPayload {
    id: number; // 編輯時必須有 ID
    item: string; // 名稱
    number_online: number; // 可預約數量
    number_onsite: number; // 現場可領數量
}

interface FoodItemInputProps {
    index: number;
    foodItem: ItemPayload;
    onFoodItemChange: (index: number, field: keyof ItemPayload, value: string | number) => void;
    // 編輯模式下，通常不允許直接刪除，但保留介面
    onDelete: (index: number) => void; 
}

// ⚠️ 注意：這個元件需要您在專案中實際定義 styles 和 UI
const FoodItemInput: React.FC<FoodItemInputProps> = ({ index, foodItem, onFoodItemChange, onDelete }) => {
    return (
        <View style={styles.itemRow}>
            {/* 品項名稱 (Item name) */}
            <TextInput 
                style={[styles.input, styles.itemInputName]}
                value={foodItem.item}
                onChangeText={(text) => onFoodItemChange(index, 'item', text)}
                placeholder="名稱 (例如: 麵包)"
            />
            {/* 數量 (Number online) */}
            <TextInput 
                style={[styles.input, styles.itemInputQuantity]}
                value={String(foodItem.number_online)}
                onChangeText={(text) => onFoodItemChange(index, 'number_online', parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="數量"
            />
            {/* 刪除按鈕 (在編輯時通常不啟用或給予警告) */}
            {/*
            <TouchableOpacity onPress={() => onDelete(index)} style={styles.deleteButton}>
                <Ionicons name="close-circle" size={24} color="#FF6347" />
            </TouchableOpacity>
            */}
        </View>
    );
};

export default function EditPostScreen() {
    const params = useLocalSearchParams();
    const foodId = params.id ? parseInt(params.id as string) : null;
    const router = useRouter();

    // --- 狀態定義 ---
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
    const [items, setItems] = useState<ItemPayload[]>([]); 
    const [note, setNote] = useState('');
    const [tag, setTag] = useState('');
    const [timeRestriction, setTimeRestriction] = useState(0); 
    const [distanceRestriction, setDistanceRestriction] = useState(0); 
    
    const [isLoading, setIsLoading] = useState(true); 
    const { loading: userLoading } = useUser(); 

    const { triggerRefresh } = usePostRefresh();

    // ----------------------------------------------------
    // 🛠️ 食物品項處理邏輯 (已優化，只針對現有品項做修改)
    // ----------------------------------------------------
    const handleFoodItemChange = (index: number, field: keyof ItemPayload, value: string | number) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            
            // 確保更新的 Item 存在且 ID 不為空 (編輯模式的必要條件)
            if (newItems[index] && newItems[index].id) {
                // 處理 number_online 欄位時，確保值是數字
                const finalValue = (field === 'number_online' && typeof value === 'string') 
                    ? (parseInt(value) || 0) 
                    : value;

                newItems[index] = {
                    ...newItems[index],
                    [field]: finalValue
                };
            }
            return newItems;
        });
    };

    const handleDeleteFoodItem = (index: number) => {
        // 在編輯模式下，建議不允許直接刪除，因為需要 Item ID 才能刪除
        Alert.alert(
            "提示", 
            "要刪除已發布的品項，需要專門的 API 處理。這裡僅允許修改名稱和數量。"
        );
        // 如果您有刪除 API，則在這裡呼叫並從列表中移除
        // setItems(prevItems => prevItems.filter((_, i) => i !== index)); 
    };
    
    // ----------------------------------------------------
    // ... (pickImage, useEffect 載入資料 保持不變) ...
    // ----------------------------------------------------
    useEffect(() => {
        const initData = async () => {
            if (!foodId) return;

            try {
                const data = await getPostById(foodId);
                
                setTag(data.tag);
                setNote(data.note);
                setTimeRestriction(data.time_restriction || 0);
                setDistanceRestriction(data.distance_restriction || 0);

                // 載入的 items 必須包含 id, item, number_online
                setItems(data.items); 
                
                if (data.pictures && data.pictures.length > 0) {
                    setSelectedImageUri(data.pictures[0].url); 
                }
            } catch (error: any) {
                console.error("Loading Error:", error);
                Alert.alert("載入失敗", `詳情: ${error.message || '未知錯誤。'}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (foodId) {
            // ⭐️ 確保在呼叫 API 前，狀態是正確的 (雖然初始是 true，但這是防禦性編程)
            // 🚨 關鍵修正：如果 foodId 存在，開始載入前將 isLoading 設為 true
            setIsLoading(true); 
            initData();
        } else {
            // 🚨 修正：如果 foodId 不存在 (例如頁面開啟錯誤)，我們應該停止載入
            setIsLoading(false); 
            // 也可以在這裡導航回上一頁或顯示錯誤
            Alert.alert("錯誤", "未提供貼文 ID，無法編輯。");
        }
    }, [foodId]);

    // ----------------------------------------------------
    // 送出修改 (核心 API 呼叫)
    // ----------------------------------------------------
    const handleUpdate = async () => {
        if (!foodId || isLoading) return;

        if (items.length === 0) {
            Alert.alert("錯誤", "請至少保留一項食物。");
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                tag,
                note,
                time_restriction: timeRestriction,
                distance_restriction: distanceRestriction,

                // 傳遞 Item 更新數據 (必須包含 ID, 且只傳遞後端 ItemUpdate Schema 要求的欄位)
                items: items.map(it => ({
                    id: it.id, 
                    // 🚨 注意：後端邏輯只關注 number_online 的變化，但 schema 可能需要 item name
                    item: it.item, // 保險起見傳遞 item name
                    number_online: Number(it.number_online) 
                })),

                // 處理圖片更新
                pictures: selectedImageBase64 
                    ? [{ picture: selectedImageBase64 }] 
                    : null, 
            };

            await updatePost(foodId, payload); 

            triggerRefresh();
            
            Alert.alert("修改成功！");
            router.back(); 
        } catch (error: any) {
            console.error("Update Error:", error);
            Alert.alert("修改失敗", `詳情: ${error.message || '未知伺服器錯誤。'}`);
        } finally {
            setIsLoading(false);
        }
    };
    // ----------------------------------------------------

    if (userLoading || isLoading) return <Text style={{ padding: 20 }}>載入中...</Text>;

    return (
        <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

            <View style={styles.formCard}>
            
            {/* 1. 剩食名稱與數量 (現有部分) */}
            <Text style={styles.label}><Ionicons name="document-text" size={18} color="#333" /> 剩食名稱與數量</Text>
            {items.map((item, index) => (
                <FoodItemInput 
                key={item.id}
                index={index}
                foodItem={item}
                onFoodItemChange={handleFoodItemChange}
                onDelete={handleDeleteFoodItem}
                />
            ))}

            {/* 4. 備註 (Note) (新增) */}
            <Text style={styles.label}><Ionicons name="create" size={18} color="#333" /> 備註</Text>
            <TextInput 
                style={styles.noteInput} 
                value={note} 
                onChangeText={setNote} 
                multiline 
                placeholder="請輸入備註，例如：領取容器規定..."
            />
            
            {/* 確認修改按鈕 (保持不變) */}
            <TouchableOpacity 
                style={styles.publishButton} 
                onPress={handleUpdate}
                disabled={isLoading} 
            >
                <Text style={styles.publishButtonText}>
                    {isLoading ? "修改中..." : "確認修改"}
                </Text>
            </TouchableOpacity>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}