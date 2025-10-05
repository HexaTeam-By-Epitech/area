import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiDirect } from '../utils/api';

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

            // Get OAuth URL from backend
            const res = await apiDirect.get(`/auth/${provider.name}/url`);
            const { url } = res.data;

            if (!url) {
                throw new Error('No OAuth URL received');
            }

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(url, 'exp://');

            if (result.type === 'success') {
                // Reload providers to get updated linked status
                await loadProviders();
                Alert.alert('Success', `Successfully connected to ${provider.displayName}!`);
            } else if (result.type === 'cancel') {
                // User cancelled, just update loading state
                setProviders(prev => prev.map(p =>
                    p.name === provider.name ? { ...p, loading: false } : p
                ));
            }
        } catch (err) {
            console.error('Failed to link provider:', err);
            Alert.alert('Error', err.response?.data?.message || `Failed to connect to ${provider.displayName}`);
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

    const renderProvider = ({ item }) => (
        <Card style={{ marginBottom: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { fontSize: 18, marginBottom: 4 }]}>{item.displayName}</Text>
                    <Text style={[styles.text, { fontSize: 14 }]}>
                        {item.linked ? '✓ Connected' : 'Not connected'}
                    </Text>
                </View>
                {item.loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Button
                        title={item.linked ? 'Disconnect' : 'Connect'}
                        onPress={() => item.linked ? unlinkProvider(item) : linkProvider(item)}
                        style={{
                            backgroundColor: item.linked ? '#d32f2f' : '#4CAF50',
                            minWidth: 120
                        }}
                    />
                )}
            </View>
        </Card>
    );

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
            <Text style={styles.title}>Connect Services</Text>
            {error ? (
                <Text style={[styles.text, { color: '#d32f2f', marginBottom: 16 }]}>{error}</Text>
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
            />
        </View>
    );
}
