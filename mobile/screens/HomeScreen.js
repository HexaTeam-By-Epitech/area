import React, { useState, useCallback } from 'react';
import { View, Text, useWindowDimensions, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiDirect } from '../utils/api';

export default function HomeScreen({ navigation }) {
    const { email } = useAuth();
    const { width } = useWindowDimensions();
    const [stats, setStats] = useState({
        totalAreas: 0,
        activeAreas: 0,
        linkedProviders: 0,
        recentActivity: 0
    });
    const [loading, setLoading] = useState(true);

    const gap = 16;
    const numColumns = 2;
    const totalGap = gap * (numColumns + 1);
    const cardWidth = (width - totalGap) / numColumns;

    // Load stats when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [])
    );

    const loadStats = async () => {
        try {
            setLoading(true);
            const [areasRes, linkedRes] = await Promise.all([
                apiDirect.get('/manager/areas'),
                apiDirect.get('/auth/linked-providers')
            ]);

            const areas = areasRes.data || [];
            const activeAreas = areas.filter(a => a.is_active).length;

            setStats({
                totalAreas: areas.length,
                activeAreas: activeAreas,
                linkedProviders: linkedRes.data.providers?.length || 0,
                recentActivity: areas.length // You can improve this with actual activity data
            });
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const data = [
        {
            title: 'Total AREAs',
            subtitle: 'All automations',
            value: stats.totalAreas,
            icon: 'apps',
            color: '#2196F3',
            onPress: () => navigation.navigate('Dashboard')
        },
        {
            title: 'Active',
            subtitle: 'Running now',
            value: stats.activeAreas,
            icon: 'checkmark-circle',
            color: '#4CAF50',
            onPress: () => navigation.navigate('Dashboard')
        },
        {
            title: 'Services',
            subtitle: 'Connected',
            value: stats.linkedProviders,
            icon: 'link',
            color: '#FF9800',
            onPress: () => navigation.navigate('Services')
        },
        {
            title: 'Recent',
            subtitle: 'This week',
            value: stats.recentActivity,
            icon: 'time',
            color: '#9C27B0',
            onPress: () => navigation.navigate('Dashboard')
        },
    ];

    const renderItem = ({ item, index }) => (
        <TouchableOpacity
            onPress={item.onPress}
            activeOpacity={0.7}
            style={{
                width: cardWidth,
                marginLeft: index % numColumns === 0 ? gap : gap / 2,
                marginRight: index % numColumns === numColumns - 1 ? gap : gap / 2,
                marginBottom: gap,
            }}
        >
            <Card
                style={{
                    flex: 1,
                    backgroundColor: '#2c2c2c',
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                }}
            >
                <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${item.color}20`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                }}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>
                    {loading ? '...' : item.value}
                </Text>
                <Text style={{ fontWeight: '600', fontSize: 14, color: '#fff', textAlign: 'center' }}>
                    {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' }}>
                    {item.subtitle}
                </Text>
            </Card>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#1e1e1e' }}>
            <View style={{ paddingTop: 40, paddingBottom: 32 }}>
                {/* Header Section */}
                <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
                        Welcome back!
                    </Text>
                    <Text style={{ fontSize: 16, color: '#888' }}>
                        {email || 'Guest'}
                    </Text>
                </View>

                {/* Stats Grid */}
                {loading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: '#888', marginTop: 16 }}>Loading your stats...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(_, index) => index.toString()}
                        numColumns={numColumns}
                        scrollEnabled={false}
                    />
                )}

                {/* Quick Actions */}
                <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>
                        Quick Actions
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateArea')}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: '#4CAF50',
                            borderRadius: 12,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                                Create New AREA
                            </Text>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                                Automate your workflow
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Dashboard')}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: '#2c2c2c',
                            borderRadius: 12,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            marginBottom: 12,
                        }}
                    >
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(33, 150, 243, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="list" size={24} color="#2196F3" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                                View All AREAs
                            </Text>
                            <Text style={{ fontSize: 12, color: '#888' }}>
                                Manage your automations
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#888" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Services')}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: '#2c2c2c',
                            borderRadius: 12,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="grid" size={24} color="#FF9800" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                                Connect Services
                            </Text>
                            <Text style={{ fontSize: 12, color: '#888' }}>
                                Link your accounts
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#888" />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
