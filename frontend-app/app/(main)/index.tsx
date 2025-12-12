import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from "../../context/UserContext"

export default function MainScreenSimulation() {
    const router = useRouter();

    const { loginAs } = useUser();

    const demoUsers = [
        { id: 1, name: 'Provider' },
        { id: 2, name: 'Receiver 1' },
        { id: 3, name: 'Receiver 2' },
        // ... 
    ];

    const handleLogin = async (id: number) => {
        await loginAs(id);
        router.push('/(main)/Home'); 
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>HCI Demo 入口網站</Text>
            {demoUsers.map((user) => (
                <TouchableOpacity
                    key={user.id}
                    style={styles.userButton}
                    onPress={() => handleLogin(user.id)}
                >
                    <Text style={styles.userText}>{user.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f5f5f5', 
        padding: 20 
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 20, 
        textAlign: 'center', 
        marginTop: 80 
    },
    userButton: { 
        backgroundColor: '#576238', 
        padding: 15, 
        borderRadius: 10, 
        marginBottom: 10 
    },
    userText: { 
        color: 'white', 
        fontSize: 16, 
        fontWeight: '600' 
    }
});