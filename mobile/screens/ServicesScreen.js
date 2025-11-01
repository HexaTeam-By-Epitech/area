import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiDirect } from '../utils/api';
import Config from '../config';

// Service icons and colors mapping
const getServiceIcon = (serviceName) => {
    const icons = {
        google: { name: 'logo-google', color: '#DB4437' },
        spotify: { name: 'musical-notes', color: '#1DB954' },
        github: { name: 'logo-github', color: '#333' },
        discord: { name: 'chatbubbles', color: '#5865F2' },
    };
    return icons[serviceName.toLowerCase()] || { name: 'apps', color: '#666' };
};

export default function ServicesScreen() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch available providers and linked providers in parallel
            const [providersRes, linkedRes] = await Promise.all([
                apiDirect.get('/auth/providers'),
                apiDirect.get('/auth/linked-providers')
            ]);

            const availableProviders = providersRes.data.providers || [];
            const linkedProviders = linkedRes.data.providers || [];

            // Map providers with linked status
            const mappedProviders = availableProviders.map(name => ({
                name,
                displayName: name.charAt(0).toUpperCase() + name.slice(1),
                linked: linkedProviders.includes(name),
                loading: false
            }));

            setProviders(mappedProviders);
        } catch (err) {
            console.error('Failed to load providers:', err);
            setError(err.response?.data?.message || 'Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const linkProvider = async (provider) => {
        try {
            // Update provider loading state
            setProviders(prev => prev.map(p =>
                p.name === provider.name ? { ...p, loading: true } : p
            ));

            // Get OAuth URL from backend (with mobile=true to indicate mobile app)
            const res = await apiDirect.get(`/auth/${provider.name}/url?mobile=true`);
            const { url } = res.data;

            if (!url) {
                throw new Error('No OAuth URL received');
            }

            // Open browser for authentication directly
            await proceedWithAuth();

            async function proceedWithAuth() {
                try {
                    // Open browser for authentication with longer timeout for 2FA
                    const result = await WebBrowser.openAuthSessionAsync(url, Config.OAUTH_REDIRECT_URI, {
                        // Give more time for 2FA completion
                        showInRecents: true,
                    });

                    if (result.type === 'success') {
                        // Reload providers to get updated linked status
                        await loadProviders();
                        Alert.alert('Success', `Successfully connected to ${provider.displayName}!`);
                    } else if (result.type === 'cancel') {
                        // User cancelled - offer to try again or cancel
                        Alert.alert(
                            'Connection Cancelled',
                            `You cancelled the ${provider.displayName} connection.`,
                            [
                                {
                                    text: 'Try Again',
                                    onPress: () => linkProvider(provider)
                                },
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                    onPress: () => {
                                        // Just reset loading state
                                        setProviders(prev => prev.map(p =>
                                            p.name === provider.name ? { ...p, loading: false } : p
                                        ));
                                    }
                                }
                            ]
                        );
                        return; // Don't reset loading state immediately
                    } else if (result.type === 'dismiss' || result.type === 'locked') {
                        // Browser was dismissed or locked - offer to try again or cancel
                        Alert.alert(
                            'Authentication Interrupted',
                            `The authentication process was interrupted.`,
                            [
                                {
                                    text: 'Try Again',
                                    onPress: () => linkProvider(provider)
                                },
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                    onPress: () => {
                                        setProviders(prev => prev.map(p =>
                                            p.name === provider.name ? { ...p, loading: false } : p
                                        ));
                                    }
                                }
                            ]
                        );
                        return;
                    }

                    // Reset loading state for other result types
                    setProviders(prev => prev.map(p =>
                        p.name === provider.name ? { ...p, loading: false } : p
                    ));
                } catch (authErr) {
                    console.error('Auth process error:', authErr);
                    throw authErr;
                }
            }
        } catch (err) {
            console.error('Failed to link provider:', err);
            Alert.alert('Error', err.response?.data?.message || `Failed to connect to ${provider.displayName}`);
            // Always reset loading state on error
            setProviders(prev => prev.map(p =>
                p.name === provider.name ? { ...p, loading: false } : p
            ));
        }
    };

    const unlinkProvider = async (provider) => {
        Alert.alert(
            'Confirm Disconnect',
            `Are you sure you want to disconnect ${provider.displayName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProviders(prev => prev.map(p =>
                                p.name === provider.name ? { ...p, loading: true } : p
                            ));

                            await apiDirect.delete(`/auth/${provider.name}/link`);

                            // Update provider linked status
                            setProviders(prev => prev.map(p =>
                                p.name === provider.name ? { ...p, linked: false, loading: false } : p
                            ));

                            Alert.alert('Success', `Successfully disconnected from ${provider.displayName}`);
                        } catch (err) {
                            console.error('Failed to unlink provider:', err);
                            Alert.alert('Error', err.response?.data?.message || `Failed to disconnect ${provider.displayName}`);
                            setProviders(prev => prev.map(p =>
                                p.name === provider.name ? { ...p, loading: false } : p
                            ));
                        }
                    }
                }
            ]
        );
    };

    const renderProvider = ({ item }) => {
        const icon = getServiceIcon(item.name);

        return (
            <Card style={{ marginBottom: 12, padding: 16, width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12
                        }}>
                            <Ionicons name={icon.name} size={28} color={icon.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { fontSize: 18, marginBottom: 4 }]} numberOfLines={1}>{item.displayName}</Text>
                            <Text style={[styles.text, { fontSize: 14, color: item.linked ? '#4CAF50' : styles.text.color }]}>
                                {item.linked ? '✓ Connected' : 'Not connected'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexShrink: 0 }}>
                        {item.loading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                                <Text style={[styles.text, { fontSize: 12, color: '#fff' }]}>
                                    Connecting...
                                </Text>
                            </View>
                        ) : (
                            <Button
                                title={item.linked ? 'Disconnect' : 'Connect'}
                                onPress={() => item.linked ? unlinkProvider(item) : linkProvider(item)}
                                style={{
                                    width: 'auto',
                                    backgroundColor: item.linked ? '#d32f2f' : '#4CAF50',
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    minWidth: 100,
                                    marginBottom: 0
                                }}
                            />
                        )}
                    </View>
                </View>
            </Card>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.text, { marginTop: 16 }]}>Loading services...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: 32 }]}>
            <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
                <Text style={styles.title}>Connect Services</Text>
            </View>
            {error ? (
                <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                    <Text style={[styles.text, { color: '#d32f2f', marginBottom: 8 }]}>{error}</Text>
                    <Button
                        title="Retry"
                        onPress={loadProviders}
                        style={{ backgroundColor: '#4CAF50', marginBottom: 0 }}
                    />
                </View>
            ) : null}
            <FlatList
                data={providers}
                keyExtractor={item => item.name}
                renderItem={renderProvider}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                ListEmptyComponent={
                    <Text style={[styles.text, { textAlign: 'center', marginTop: 32 }]}>
                        No services available
                    </Text>
                }
                refreshing={loading}
                onRefresh={loadProviders}
            />
        </View>
    );
}
