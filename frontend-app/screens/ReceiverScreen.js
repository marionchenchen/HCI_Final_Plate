// screens/ReceiverScreen.js
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Button,
    FlatList,
    ActivityIndicator,
    Alert,
} from "react-native";
import { getFoods, bookFood } from "../api";
import axios from "axios";
import { API_BASE } from "../api";

const testConnection = async () => {
    try {
        const res = await axios.get(`${API_BASE}/`);
        Alert.alert("連線成功", JSON.stringify(res.data));
    } catch (err) {
        console.error("testConnection error", err);
        Alert.alert("連線失敗", err.message);
    }
};

export default function ReceiverScreen() {
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchFoods = async () => {
        try {
            setLoading(true);
            const res = await getFoods();
            setFoods(res.data);
        } catch (err) {
            console.error(err);
            Alert.alert("錯誤", "載入剩食失敗");
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (id) => {
        try {
            // 目前先固定預約 1 份；之後可以做彈窗讓使用者輸入份數
            await bookFood({ id, amount: 1 });
            await fetchFoods();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || "預約失敗";
            Alert.alert("錯誤", msg);
        }
    };

    useEffect(() => {
        fetchFoods();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 12 }}>Receiver：剩食列表</Text>
            {/* 🔴 這顆就是專門測試後端有沒有通 */}
            <Button title="測試後端連線" onPress={testConnection} />
            <View style={{ height: 8 }} />

            <Button title="重新整理" onPress={fetchFoods} />

            <FlatList
                style={{ marginTop: 12 }}
                data={foods}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                    const remaining = item.total_quantity - item.reserved_quantity;
                    return (
                        <View
                            style={{
                                borderWidth: 1,
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 8,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: "600" }}>
                                {item.title}
                            </Text>
                            <Text>總數：{item.total_quantity}</Text>
                            <Text>已預約：{item.reserved_quantity}</Text>
                            <Text>剩餘可預約：{remaining}</Text>

                            <Button
                                title={remaining > 0 ? "BOOK（預約 1 份）" : "已無剩餘"}
                                onPress={() => handleBook(item.id)}
                                disabled={remaining <= 0}
                            />
                        </View>
                    );
                }}
            />
        </View>
    );
}
