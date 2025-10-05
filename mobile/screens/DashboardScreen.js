import React, { useState, useEffect, useCallback } from 'react';
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

export default function DashboardScreen({ navigation }) {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(new Set());

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

            const res = await apiDirect.get('/manager/areas');
            setAreas(res.data || []);
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

    const renderItem = ({ item }) => (
        <Card style={{ marginBottom: 12, padding: 16 }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{
                            backgroundColor: item.is_active ? '#4CAF50' : '#9e9e9e',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginRight: 8
                        }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                {item.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ color: '#c3c9d5', fontSize: 12, marginBottom: 2 }}>Action:</Text>
                        <Text style={[styles.title, { fontSize: 16 }]}>{item.action}</Text>
                    </View>
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ color: '#c3c9d5', fontSize: 12, marginBottom: 2 }}>Reaction:</Text>
                        <Text style={[styles.title, { fontSize: 16 }]}>{item.reaction}</Text>
                    </View>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                        Created: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                {deleting.has(item.id) ? (
                    <ActivityIndicator size="small" color="#d32f2f" />
                ) : (
                    <TouchableOpacity onPress={() => deleteArea(item.id)} style={{ padding: 8 }}>
                        <Ionicons name="trash" size={22} color="#d32f2f" />
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );

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
                    paddingHorizontal: 20,
                }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 32 }}>
                        <Text style={[styles.text, { textAlign: 'center', marginBottom: 16 }]}>
                            You don't have any AREAs yet.
                        </Text>
                        <Button
                            title="Create your first AREA"
                            onPress={createNewArea}
                            style={{ backgroundColor: '#4CAF50' }}
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
