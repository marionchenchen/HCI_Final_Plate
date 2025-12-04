// app/index.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Button,
  TextInput,
} from "react-native";

import ProviderScreen from "../screens/ProviderScreen";
import ReceiverScreen from "../screens/ReceiverScreen";

export default function Index() {
  const [name, setName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<"list" | "publish">("list");

  // 假登入畫面：輸入暱稱就算登入
  if (!loggedIn) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 24, marginBottom: 16 }}>登入剩食平台</Text>
        <Text style={{ marginBottom: 8 }}>請輸入暱稱</Text>
        <TextInput
          style={{
            borderWidth: 1,
            padding: 8,
            width: "70%",
            marginBottom: 12,
          }}
          placeholder="例如：小明"
          value={name}
          onChangeText={setName}
        />
        <Button
          title="登入"
          onPress={() => {
            if (name.trim().length === 0) return;
            setLoggedIn(true);
          }}
        />
      </SafeAreaView>
    );
  }

  // 登入後：上方是 tab，下面是對應畫面
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 8 }}>嗨，{name} 👋</Text>
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, marginRight: 4 }}>
            <Button title="剩食列表" onPress={() => setTab("list")} />
          </View>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Button title="發布剩食" onPress={() => setTab("publish")} />
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "list" && <ReceiverScreen />}
        {tab === "publish" && <ProviderScreen />}
      </View>
    </SafeAreaView>
  );
}
