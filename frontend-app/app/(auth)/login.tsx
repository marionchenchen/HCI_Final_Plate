// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // ⚠️ 實際應呼叫 frontend-app/api.js 內的登入 API 
    // 例如：api.login(email, password).then(success => navigation.navigate('Map'))
    console.log('Attemping login...');
    
    // 假設登入成功，導向主畫面 (MapScreen)
    navigation.navigate('Map'); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>剩食互助平台 - 登入</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="密碼" secureTextEntry value={password} onChangeText={setPassword} />
      
      <Button title="登入" onPress={handleLogin} />
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>還沒有帳號？前往註冊</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... 樣式定義 ...
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15 },
  link: { color: 'blue', marginTop: 15, textAlign: 'center' }
});

export default LoginScreen;