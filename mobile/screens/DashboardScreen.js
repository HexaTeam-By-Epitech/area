import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../styles';
import Card from '../components/Card';
import Button from '../components/Button';
import { apiDirect } from '../utils/api';

// Helper to extract provider from action/reaction name
const extractProvider = (name) => {
    const parts = (name || '').split('_');
    return parts[0];
};

// Derive a better provider for display when names are shorthand (e.g., 'send_email' => 'google')
const deriveDisplayProvider = (fullName) => {
    const base = extractProvider(fullName);
    if (fullName === 'send_email') return 'google';
    return base;
};

// Map to canonical OAuth provider key for linked-providers check (e.g., 'gmail' => 'google')
const canonicalOAuthProvider = (provider, fullName) => {
    if (provider === 'gmail') return 'google';
    if (provider === 'send' && fullName === 'send_email') return 'google';
    return provider;
};

// Check if an action/reaction is internal (doesn't require OAuth)
const isInternalProvider = (providerName) => {
    const internalProviders = ['log', 'email', 'webhook', 'notification', 'system'];
    return internalProviders.includes((providerName || '').toLowerCase());
};

// Map provider names to display info
const getProviderInfo = (providerName) => {
    const providers = {
        gmail: { displayName: 'Gmail', icon: 'logo-google', color: '#DB4437' },
        google: { displayName: 'Google', icon: 'logo-google', color: '#DB4437' },
        spotify: { displayName: 'Spotify', icon: 'musical-notes', color: '#1DB954' },
        github: { displayName: 'GitHub', icon: 'logo-github', color: '#333' },
        discord: { displayName: 'Discord', icon: 'chatbubbles', color: '#5865F2' },
        log: { displayName: 'Internal Log', icon: 'document-text', color: '#9C27B0' },
        email: { displayName: 'Email', icon: 'mail', color: '#2196F3' },
        webhook: { displayName: 'Webhook', icon: 'flash', color: '#FF9800' },
        notification: { displayName: 'Notification', icon: 'notifications', color: '#FFC107' },
        system: { displayName: 'System', icon: 'settings', color: '#607D8B' },
    };
    const key = (providerName || '').toLowerCase();
    return providers[key] || { displayName: providerName, icon: 'apps', color: '#666' };
};

export default function DashboardScreen({ navigation }) {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(new Set());
    const [linkedProviders, setLinkedProviders] = useState([]);

    // Load areas when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadAreas();
        }, [])
    );

    const loadAreas = async () => {
        try {
            setLoading(true);
            setError('');

            // Load areas and linked providers in parallel
            const [areasRes, linkedRes] = await Promise.all([
                apiDirect.get('/manager/areas'),
                apiDirect.get('/auth/linked-providers')
            ]);

            setAreas(areasRes.data || []);
            setLinkedProviders(linkedRes.data.providers || []);
        } catch (err) {
            console.error('Failed to load areas:', err);
            setError(err.response?.data?.message || 'Failed to load AREAs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAreas();
    };

    const deleteArea = async (areaId) => {
        Alert.alert(
            'Delete AREA',
            'Are you sure you want to delete this AREA?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(prev => new Set(prev).add(areaId));
                            await apiDirect.delete(`/manager/areas/${areaId}`);
                            setAreas(prev => prev.filter(a => a.id !== areaId));
                            Alert.alert('Success', 'AREA deleted successfully');
                        } catch (err) {
                            console.error('Failed to delete area:', err);
                            Alert.alert('Error', err.response?.data?.message || 'Failed to delete AREA');
                        } finally {
                            setDeleting(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(areaId);
                                return newSet;
                            });
                        }
                    }
                }
            ]
        );
    };

    const createNewArea = () => {
        navigation.navigate('CreateArea');
    };

    const renderItem = ({ item }) => {
        // Derive provider names for display
        const actionProviderRaw = extractProvider(item.action);
        const reactionProviderRaw = deriveDisplayProvider(item.reaction);

        const actionInfo = getProviderInfo(actionProviderRaw);
        const reactionInfo = getProviderInfo(reactionProviderRaw);

        const actionIsInternal = isInternalProvider(actionProviderRaw);
        const reactionIsInternal = isInternalProvider(reactionProviderRaw);

        // Canonical names for OAuth linked check
        const actionOAuthProvider = canonicalOAuthProvider(actionProviderRaw, item.action);
        const reactionOAuthProvider = canonicalOAuthProvider(reactionProviderRaw, item.reaction);

        const actionConnected = actionIsInternal || linkedProviders.includes(actionOAuthProvider);
        const reactionConnected = reactionIsInternal || linkedProviders.includes(reactionOAuthProvider);

        return (
            <Card style={{ marginBottom: 12, padding: 16, width: '100%' }}>
                <View style={{ width: '100%' }}>
                    {/* Status Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{
                            backgroundColor: item.is_active ? '#4CAF50' : '#9e9e9e',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                        }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                {item.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>

                    {/* Action Section */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#c3c9d5', fontSize: 12, marginBottom: 6 }}>WHEN</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 10
                                }}>
                                    <Ionicons name={actionInfo.icon} size={20} color={actionInfo.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.title, { fontSize: 16, marginBottom: 2 }]} numberOfLines={1}>
                                        {actionInfo.displayName}
                                    </Text>
                                    <Text style={{ color: '#888', fontSize: 12 }} numberOfLines={1}>{item.action}</Text>
                                </View>
                            </View>
                            <View style={{
                                backgroundColor: actionConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                            }}>
                                <Text style={{ color: actionConnected ? '#4CAF50' : '#d32f2f', fontSize: 10, fontWeight: '600' }}>
                                    {actionIsInternal ? '✓ Built-in' : (actionConnected ? '✓ Connected' : '✗ Disconnected')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Arrow Indicator */}
                    <View style={{ alignItems: 'center', marginVertical: 4 }}>
                        <Ionicons name="arrow-down" size={20} color="#666" />
                    </View>

                    {/* Reaction Section */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#c3c9d5', fontSize: 12, marginBottom: 6 }}>THEN</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 10
                                }}>
                                    <Ionicons name={reactionInfo.icon} size={20} color={reactionInfo.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.title, { fontSize: 16, marginBottom: 2 }]} numberOfLines={1}>
                                        {reactionInfo.displayName}
                                    </Text>
                                    <Text style={{ color: '#888', fontSize: 12 }} numberOfLines={1}>{item.reaction}</Text>
                                </View>
                            </View>
                            <View style={{
                                backgroundColor: reactionConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                            }}>
                                <Text style={{ color: reactionConnected ? '#4CAF50' : '#d32f2f', fontSize: 10, fontWeight: '600' }}>
                                    {reactionIsInternal ? '✓ Built-in' : (reactionConnected ? '✓ Connected' : '✗ Disconnected')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer with date and delete */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: '#888', fontSize: 11 }}>
                            Created {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                        {deleting.has(item.id) ? (
                            <ActivityIndicator size="small" color="#d32f2f" />
                        ) : (
                            <TouchableOpacity
                                onPress={() => deleteArea(item.id)}
                                style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                                activeOpacity={0.6}
                            >
                                <Ionicons name="trash-outline" size={22} color="#d32f2f" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Card>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.text, { marginTop: 16 }]}>Loading your AREAs...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 32 }]}>
            <Text style={styles.title}>My AREAs</Text>
            {error ? (
                <Text style={[styles.text, { color: '#d32f2f', marginBottom: 16, textAlign: 'center' }]}>
                    {error}
                </Text>
            ) : null}

            <FlatList
                data={areas}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#fff"
                    />
                }
                contentContainerStyle={{
                    paddingBottom: 100,
                    paddingHorizontal: 16,
                }}
                style={{ width: '100%' }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 32 }}>
                        <Text style={[styles.text, { textAlign: 'center', marginBottom: 16 }]}>
                            You don't have any AREAs yet.
                        </Text>
                        <Button
                            title="Create your first AREA"
                            onPress={createNewArea}
                            style={{ backgroundColor: '#4CAF50', width: 'auto' }}
                        />
                    </View>
                }
            />

            {areas.length > 0 && (
                <Button
                    title="+ Create AREA"
                    onPress={createNewArea}
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        alignSelf: 'center',
                        width: '80%',
                        backgroundColor: '#4CAF50'
                    }}
                />
            )}
        </View>
    );
}
