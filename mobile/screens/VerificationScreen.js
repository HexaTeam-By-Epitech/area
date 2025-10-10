import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, ActivityIndicator } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';
import { apiDirect } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function VerificationScreen({ route, navigation }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [focusInput, setFocusInput] = useState(null);
    const [countdown, setCountdown] = useState(0);
    const { login } = useAuth();

    const { email, password } = route.params;

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleVerification = async () => {
        if (!verificationCode) {
            Alert.alert('Error', 'Please enter the verification code');
            return;
        }

        if (verificationCode.length !== 6) {
            Alert.alert('Error', 'Verification code must be 6 digits');
            return;
        }

        try {
            setLoading(true);
            const response = await apiDirect.post('/auth/verify', {
                email,
                code: verificationCode
            });

            const { accessToken, userId, email: userEmail } = response.data;

            if (accessToken && userId) {
                await login(userEmail || email, accessToken, userId);
                Alert.alert('Success', 'Account verified successfully!');
                // Navigation will be handled automatically by AppNavigator when isAuthenticated changes
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Verification failed. Please check your code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            setResending(true);
            await apiDirect.post('/auth/resend-verification', { email });
            Alert.alert('Success', 'A new verification code has been sent to your email');
            setCountdown(60); // 60 seconds cooldown
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to resend verification code');
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Your Account</Text>
            <Text style={[styles.text, { textAlign: 'center', marginBottom: 24 }]}>
                We've sent a 6-digit verification code to:
            </Text>
            <Text style={[styles.title, { fontSize: 16, textAlign: 'center', marginBottom: 32, color: '#4CAF50' }]}>
                {email}
            </Text>

            <TextInput
                style={[
                    styles.input,
                    focusInput === 'code' && styles.inputFocused,
                    { textAlign: 'center', fontSize: 24, letterSpacing: 4 }
                ]}
                placeholder="000000"
                placeholderTextColor="#c3c9d5"
                value={verificationCode}
                onChangeText={(text) => setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                onFocus={() => setFocusInput('code')}
                onBlur={() => setFocusInput(null)}
                editable={!loading && !resending}
            />

            {loading ? (
                <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
            ) : (
                <Button
                    title="Verify Account"
                    onPress={handleVerification}
                    disabled={resending || verificationCode.length !== 6}
                    style={{ marginTop: 16 }}
                />
            )}

            <View style={{ marginTop: 32, alignItems: 'center' }}>
                <Text style={[styles.text, { marginBottom: 12 }]}>
                    Didn't receive the code?
                </Text>
                {countdown > 0 ? (
                    <Text style={[styles.text, { color: '#888' }]}>
                        Resend in {countdown} seconds
                    </Text>
                ) : resending ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Button
                        title="Resend Code"
                        onPress={handleResendCode}
                        style={styles.buttonSecondary}
                        textStyle={styles.buttonTextSecondary}
                        disabled={loading}
                    />
                )}
            </View>

            <Button
                title="Back to Login"
                onPress={() => navigation.goBack()}
                style={[styles.buttonSecondary, { marginTop: 24 }]}
                textStyle={styles.buttonTextSecondary}
                disabled={loading || resending}
            />
        </View>
    );
}
