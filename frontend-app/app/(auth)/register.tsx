// frontend-app/app/(auth)/register.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router'; // 引入 useRouter 進行導航
// ⚠️ 實際應用中，您會從 '../api' 匯入您的註冊 API 函式
// import { registerUser } from '../../api'; 

export default function RegisterScreen() {
  const router = useRouter(); // 初始化 Router
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // 1. 簡易欄位驗證
    if (!name || !email || !password) {
      Alert.alert('錯誤', '所有欄位皆為必填。');
      return;
    }

    if (password.length < 6) {
      Alert.alert('錯誤', '密碼長度至少需為 6 位數。');
      return;
    }
    
    setIsLoading(true);

    try {
      // 2. 實際註冊邏輯 (API 呼叫)
      // ⚠️ 這裡應替換為呼叫您的後端 API，例如：
      // const response = await registerUser({ name, email, password });
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      // 假設註冊成功
      Alert.alert('註冊成功', '您的帳號已創建，請登入。');
      
      // 導航回登入頁面
      router.back(); 

    } catch (error) {
      // 處理註冊失敗 (如 Email 已存在)
      Alert.alert('註冊失敗', '伺服器錯誤或 Email 已被註冊。');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>註冊新帳號</Text>
      
      <TextInput
        style={styles.input}
        placeholder="您的姓名"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email/帳號"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      
      <TextInput
        style={styles.input}
        placeholder="密碼 (至少 6 位)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <Button 
        title={isLoading ? "註冊中..." : "註冊"} 
        onPress={handleRegister} 
        disabled={isLoading}
        color="#4CAF50" // 綠色按鈕
      />
      
      {isLoading && <ActivityIndicator style={{ marginTop: 10 }} size="small" color="#4CAF50" />}
      
      <TouchableOpacity 
        style={styles.linkContainer}
        onPress={() => router.back()}>
        <Text style={styles.link}>已有帳號？返回登入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 20,
  },
  link: {
    color: '#007BFF',
    textAlign: 'center',
    fontSize: 16,
  },
});