import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { apiDirect } from '../utils/api';
import Config from '../config';

export default function MyAccountScreen({ navigation }) {
    const { email, accessToken, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);
    const [linkedIdentities, setLinkedIdentities] = useState([]);
    const [loadingIdentities, setLoadingIdentities] = useState(true);
    const [linkingGoogle, setLinkingGoogle] = useState(false);

    useEffect(() => {
        loadLinkedIdentities();
    }, []);

    const loadLinkedIdentities = async () => {
        try {
            setLoadingIdentities(true);
            const res = await apiDirect.get('/auth/linked-identities');
            setLinkedIdentities(res.data.providers || []);
        } catch (err) {
            console.error('Failed to load linked identities:', err);
        } finally {
            setLoadingIdentities(false);
        }
    };

    const linkGoogleIdentity = async () => {
        try {
            setLinkingGoogle(true);

            // Get OAuth URL from backend for identity linking (with mobile=true)
            const res = await apiDirect.get('/auth/google/login/url?mobile=true');
            const { url } = res.data;

            if (!url) {
                throw new Error('No OAuth URL received');
            }

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(url, Config.OAUTH_REDIRECT_URI);

            if (result.type === 'success') {
                // Reload identities to get updated status
                await loadLinkedIdentities();
                Alert.alert('Success', 'Successfully linked Google account!');
            }
        } catch (err) {
            console.error('Failed to link Google identity:', err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to link Google account');
        } finally {
            setLinkingGoogle(false);
        }
    };

    const unlinkGoogleIdentity = async () => {
        Alert.alert(
            'Unlink Google Account',
            'Are you sure you want to unlink your Google account? If you don\'t have a password set, this will delete your account.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unlink',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLinkingGoogle(true);
                            await apiDirect.delete('/auth/google/identity');
                            await loadLinkedIdentities();
                            Alert.alert('Success', 'Successfully unlinked Google account');
                        } catch (err) {
                            console.error('Failed to unlink Google identity:', err);
                            Alert.alert('Error', err.response?.data?.message || 'Failed to unlink Google account');
                        } finally {
                            setLinkingGoogle(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);
                            await logout();
                            // Reset navigation to Landing screen
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Landing' }],
                                })
                            );
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                            setLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: 32 }]}>
            <Text style={styles.title}>My Account</Text>

            <Card style={{ marginTop: 20, padding: 20, width: '90%' }}>
                <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.text, { fontSize: 14, color: '#c3c9d5', marginBottom: 4 }]}>
                        Email
                    </Text>
                    <Text style={[styles.title, { fontSize: 18 }]}>
                        {email || 'Not available'}
                    </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.text, { fontSize: 14, color: '#c3c9d5', marginBottom: 4 }]}>
                        Access Token
                    </Text>
                    <Text style={[styles.text, { fontSize: 12, fontFamily: 'monospace' }]}>
                        {accessToken ? accessToken.slice(0, 20) + '...' : 'Not available'}
                    </Text>
                </View>
            </Card>

            <Card style={{ marginTop: 20, padding: 20, width: '90%' }}>
                <Text style={[styles.text, { fontSize: 14, color: '#c3c9d5', marginBottom: 12 }]}>
                    Sign-In Methods
                </Text>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.1)'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12
                        }}>
                            <Ionicons name="logo-google" size={24} color="#DB4437" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { fontSize: 16, marginBottom: 2 }]}>Google</Text>
                            <Text style={[styles.text, { fontSize: 12, color: linkedIdentities.includes('google') ? '#4CAF50' : '#888' }]}>
                                {loadingIdentities ? 'Loading...' : (linkedIdentities.includes('google') ? '✓ Linked' : 'Not linked')}
                            </Text>
                        </View>
                    </View>

                    {linkingGoogle ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Button
                            title={linkedIdentities.includes('google') ? 'Unlink' : 'Link'}
                            onPress={linkedIdentities.includes('google') ? unlinkGoogleIdentity : linkGoogleIdentity}
                            disabled={loadingIdentities}
                            style={{
                                width: 'auto',
                                backgroundColor: linkedIdentities.includes('google') ? '#d32f2f' : '#4285F4',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                minWidth: 100,
                                marginBottom: 0
                            }}
                        />
                    )}
                </View>
            </Card>

            <View style={{ marginTop: 40, width: '90%' }}>
                {loggingOut ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <Button
                        title="Logout"
                        onPress={handleLogout}
                        style={{ backgroundColor: '#d32f2f' }}
                    />
                )}
            </View>
        </View>
    );
}
