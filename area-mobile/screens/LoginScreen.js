import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import colors from './colors';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusInput, setFocusInput] = useState(null);

    const handleAuth = async (type) => {
        try {
            const response = await axios.post(`http://localhost:3000/auth/${type}`, { email, password });
            const token = response.data.token;
            navigation.navigate('Protected', { token, email });
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Auth failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome</Text>
            <TextInput
                style={[
                    styles.input,
                    focusInput === 'email' && styles.inputFocused
                ]}
                placeholder="Email"
                placeholderTextColor="#c3c9d5"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusInput('email')}
                onBlur={() => setFocusInput(null)}
            />
            <TextInput
                style={[
                    styles.input,
                    focusInput === 'password' && styles.inputFocused
                ]}
                placeholder="Password"
                placeholderTextColor="#c3c9d5"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusInput('password')}
                onBlur={() => setFocusInput(null)}
            />
            <TouchableOpacity style={styles.button} onPress={() => handleAuth('login')}>
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleAuth('register')}>
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Register</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.bgPrimary,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        marginBottom: 40,
        color: colors.textPrimary,
    },
    input: {
        width: '100%',
        padding: 15,
        marginBottom: 15,
        borderRadius: 8,
        backgroundColor: colors.cardBgPrimary,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.buttonColor,
    },
    button: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        backgroundColor: colors.buttonColor,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonSecondary: {
        backgroundColor: colors.cardBgSecondary,
        borderWidth: 1,
        borderColor: colors.buttonColor,
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: colors.buttonColor,
    },
});
