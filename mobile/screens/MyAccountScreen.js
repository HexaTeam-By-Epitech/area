import React, { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';

export default function MyAccountScreen({ navigation }) {
    const { email, accessToken, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

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
