// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, Text, Alert } from 'react-native';
import axios from 'axios';
import styles from '../styles';
import Button from '../components/Button';

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
                style={[styles.input, focusInput === 'email' && styles.inputFocused]}
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
                style={[styles.input, focusInput === 'password' && styles.inputFocused]}
                placeholder="Password"
                placeholderTextColor="#c3c9d5"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusInput('password')}
                onBlur={() => setFocusInput(null)}
            />
            <Button title="Login" onPress={() => handleAuth('login')} />
            <Button
                title="Register"
                onPress={() => handleAuth('register')}
                style={styles.buttonSecondary}
                textStyle={styles.buttonTextSecondary}
            />
        </View>
    );
}
