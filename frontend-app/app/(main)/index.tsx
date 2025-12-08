import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Home from '../(main)/Home';  

export default function MainScreenSimulation() {
    const router = useRouter();

    return (
        <View style={styles.container}>
        
        {/* 地圖 */}
        <View style={styles.mapPlaceholder}>
            {/* <Text style={styles.placeholderText}>[主頁面 MAIN PAGE]</Text> */}
            {/* <Home /> */}
            
        </View>
        
        {/* 模擬剩食資訊(Provider) */}
        <TouchableOpacity
            style={styles.triggerButton}
            onPress={() => router.push('/(main)/foodinfo_rcv')}>
            <Text style={styles.triggerButtonText}>查看剩食資訊 (Provider)</Text>
        </TouchableOpacity>
        
        {/* 模擬剩食資訊(Receiver) */}
        <TouchableOpacity
            style={styles.triggerButton}
            onPress={() => router.push('/(main)/Home')}>
            <Text style={styles.triggerButtonText}>查看剩食資訊 (Receiver)</Text>
        </TouchableOpacity>


        {/* 新增剩食資訊 */}
        <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/(main)/newpost')}>
            <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },

    mapPlaceholder: {
        height: Dimensions.get('window').height * 0.7, 
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#ccc' },
    subText: { fontSize: 16, color: '#ccc', marginTop: 10 },

    triggerButton: {
        backgroundColor: '#576238',
        padding: 15,
        borderRadius: 8,
        marginHorizontal: 20,
        marginTop: 20,
        alignItems: 'center',
    },
    triggerButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
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
});