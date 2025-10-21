// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, Text, Alert, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiDirect } from '../utils/api';
import { signInWithGoogle } from '../utils/googleAuth';

function maskEmail(email) {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
    const maskedLocal = visibleLocal + '*'.repeat(Math.max(1, local.length - visibleLocal.length));
    const domainParts = domain.split('.');
    const domainName = domainParts[0];
    const domainRest = domainParts.slice(1).join('.');
    const visibleDomain = domainName.length <= 1 ? domainName.slice(0, 1) : domainName.slice(0, 1);
    const maskedDomainName = visibleDomain + '*'.repeat(Math.max(1, Math.min(3, domainName.length - 1)));
    return `${maskedLocal}@${maskedDomainName}${domainRest ? '.' + domainRest : ''}`;
}

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusInput, setFocusInput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifLoading, setVerifLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [verifError, setVerifError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const { login } = useAuth();

    const handleAuth = async (type) => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }
        try {
            setLoading(true);
            const response = await apiDirect.post(`/auth/${type}`, { email, password });
            if (type === 'register') {
                if (response && (typeof response.status === 'number' ? (response.status >= 200 && response.status < 300) : !!response.data)) {
                    setModalVisible(true);
                    setVerifError('');
                } else {
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
            const message = err?.response?.data?.message || err?.message || 'Authentication failed';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);
            await signInWithGoogle(
                async (authResult) => {
                    const { accessToken, userId, email: userEmail } = authResult;
                    await login(userEmail, accessToken, userId);
                    setGoogleLoading(false);
                },
                (error) => {
                    setGoogleLoading(false);
                    Alert.alert('Google Sign-In Failed', error.message || 'Failed to sign in with Google');
                }
            );
        } catch (err) {
            setGoogleLoading(false);
            Alert.alert('Error', err.message || 'Failed to initiate Google sign-in');
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setVerifError('The code must contain 6 digits.');
            return;
        }
        try {
            setVerifLoading(true);
            const payload = { email: email.trim(), verificationCode: verificationCode.trim() };
            const response = await apiDirect.post('/auth/verify-email', payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            const { accessToken, userId, email: userEmail } = response.data;
            if (response.data.message === 'Email verified successfully' || (accessToken && userId)) {
                setVerificationCode('');
                setModalVisible(false);
                setVerifError('');
                if (accessToken && userId) {
                    await login(userEmail || email, accessToken, userId);
                } else {
                    Alert.alert('Success', 'Email verified! You can now log in.');
                }
            } else {
                setVerifError('Invalid response from the server');
            }
        } catch (err) {
            setVerifError(err.response?.data?.message || 'Incorrect or expired code');
        } finally {
            setVerifLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) {
            Alert.alert('Please wait', `You can resend in ${resendCooldown} seconds`);
            return;
        }

        try {
            setResendLoading(true);
            setVerifError('');

            await apiDirect.post('/auth/resend-verification', { email: email.trim() });

            Alert.alert('Success', 'Verification code sent to your email');

            // Démarrer un cooldown de 60 secondes
            setResendCooldown(60);
            const interval = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Resend error:', err.response?.data);
            setVerifError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setResendLoading(false);
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
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {}}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={[styles.card, {
                        width: '90%',
                        padding: 28,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }]}>
                        <Text style={[styles.title, { fontSize: 20, marginBottom: 14, textAlign: 'center' }]}>Account verification</Text>
                        <Text style={[styles.text, { fontSize: 16, marginBottom: 18, textAlign: 'center' }]}>
                            A verification code has been sent to {maskEmail(email)}. Please enter the code below.
                        </Text>
                        <TextInput
                            style={[styles.input, {
                                textAlign: 'center',
                                letterSpacing: 8,
                                fontSize: 22,
                                width: '80%',
                                backgroundColor: '#2d2e2e',
                                color: '#f1f3f9',
                                borderRadius: 10,
                                borderWidth: 2,
                                marginBottom: 8,
                            }]}
                            placeholder=""
                            placeholderTextColor="#c3c9d5"
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!verifLoading}
                        />
                        {verifError ? (
                            <Text style={{ color: '#d32f2f', marginTop: 8, marginBottom: 4, textAlign: 'center' }}>{verifError}</Text>
                        ) : null}

                        {verifLoading ? (
                            <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
                        ) : (
                            <Button title="Vérifier" onPress={handleVerifyCode} style={{ marginTop: 20, width: '80%' }} />
                        )}

                        {/* Bouton Resend */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                            <Text style={[styles.text, { fontSize: 14, color: '#c3c9d5' }]}>
                                Didn't receive the code?
                            </Text>
                            <TouchableOpacity
                                onPress={handleResendCode}
                                disabled={resendLoading || resendCooldown > 0}
                                style={{ marginLeft: 8 }}
                            >
                                <Text style={[
                                    styles.text,
                                    {
                                        fontSize: 14,
                                        color: (resendLoading || resendCooldown > 0) ? '#666' : '#4CAF50',
                                        fontWeight: 'bold',
                                        textDecorationLine: (resendLoading || resendCooldown > 0) ? 'none' : 'underline'
                                    }
                                ]}>
                                    {resendLoading ? 'Sending...' :
                                     resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Button
                            title="Exit"
                            onPress={() => {
                                setModalVisible(false);
                                setVerificationCode('');
                                setVerifError('');
                                setVerifLoading(false);
                                setResendCooldown(0);
                            }}
                            style={[{ marginTop: 12, width: '80%' }, styles.buttonSecondary]}
                            textStyle={styles.buttonTextSecondary}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
