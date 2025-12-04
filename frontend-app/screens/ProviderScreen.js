// screens/ProviderScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createFood } from "../api";

export default function ProviderScreen() {
    const [title, setTitle] = useState("");
    const [qty, setQty] = useState("");

    const onSubmit = async () => {
        const total_quantity = parseInt(qty, 10);
        if (!title || !total_quantity) {
            Alert.alert("錯誤", "請輸入名稱和份數");
            return;
        }

        try {
            await createFood({ title, total_quantity });
            Alert.alert("成功", "已發佈剩食");
            setTitle("");
            setQty("");
        } catch (err) {
            console.error(err);
            Alert.alert("錯誤", "發佈失敗");
        }
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 12 }}>Provider：發佈剩食</Text>

            <Text>食物名稱</Text>
            <TextInput
                style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
                value={title}
                onChangeText={setTitle}
                placeholder="例如：便當、麵包"
            />

            <Text>總份數</Text>
            <TextInput
                style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
                value={qty}
                onChangeText={setQty}
                placeholder="例如：5"
                keyboardType="numeric"
            />

            <Button title="發佈" onPress={onSubmit} />
        </View>
    );
}
