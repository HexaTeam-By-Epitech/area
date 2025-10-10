// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, Text, Alert, ActivityIndicator } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiDirect } from '../utils/api';
import { signInWithGoogle } from '../utils/googleAuth';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusInput, setFocusInput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { login } = useAuth();

    const handleAuth = async (type) => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        try {
            setLoading(true);
            const response = await apiDirect.post(`/auth/${type}`, { email, password });

            console.log('Response status:', response.status);
            console.log('Response data:', response.data);

            if (type === 'register') {
                console.log('Checking registration success...');
                console.log('Status >= 200 && < 300:', response.status >= 200 && response.status < 300);
                console.log('Has message:', !!response.data.message);
                console.log('Has userId:', !!response.data.userId);

                if (response.status >= 200 && response.status < 300) {
                    console.log('Registration successful, navigating to verification...');
                    Alert.alert('Registration Successful', 'A verification code has been sent to your email.', [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('Verification', { email, password })
                        }
                    ]);
                } else {
                    console.log('Registration failed - unexpected status:', response.status);
                    Alert.alert('Error', 'Registration failed');
                }
            } else {
                const { accessToken, userId, email: userEmail } = response.data;
                if (accessToken && userId) {
                    await login(userEmail || email, accessToken, userId);
                } else {
                    Alert.alert('Error', 'Invalid response from server');
                }
            }
        } catch (err) {
            console.error('Auth error details:', err);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);
            Alert.alert('Error', err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);
            await signInWithGoogle(
                async (authResult) => {
                    // Success callback
                    const { accessToken, userId, email: userEmail } = authResult;
                    await login(userEmail, accessToken, userId);
                    setGoogleLoading(false);
                    // Navigation will be handled automatically by AppNavigator when isAuthenticated changes
                },
                (error) => {
                    // Error callback
                    setGoogleLoading(false);
                    Alert.alert('Google Sign-In Failed', error.message || 'Failed to sign in with Google');
                }
            );
        } catch (err) {
            setGoogleLoading(false);
            Alert.alert('Error', err.message || 'Failed to initiate Google sign-in');
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
                editable={!loading && !googleLoading}
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
                editable={!loading && !googleLoading}
            />
            {loading ? (
                <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
            ) : (
                <>
                    <Button title="Login" onPress={() => handleAuth('login')} disabled={googleLoading} />
                    <Button
                        title="Register"
                        onPress={() => handleAuth('register')}
                        style={styles.buttonSecondary}
                        textStyle={styles.buttonTextSecondary}
                        disabled={googleLoading}
                    />
                </>
            )}

            <View style={{ width: '100%', marginVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#c3c9d5', marginBottom: 10 }}>or</Text>
                {googleLoading ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <Button
                        title="Sign in with Google"
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                        style={{ backgroundColor: '#4285F4' }}
                    />
                )}
            </View>
        </View>
    );
}
