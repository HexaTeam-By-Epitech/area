import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import styles from '../styles';
import Card from '../components/Card';

export default function HomeScreen({ route }) {
    const { email } = route.params || {};
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const placeholderData = Array(4).fill({ title: 'Mock name', subtitle: 'Mock sub', value: 0 });

    return (
        <View style={[styles.container, isLandscape && { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 40 }]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>Welcome{email ? `, ${email}` : ''}!</Text>
                <Text style={styles.text}>
                    Use the menu to access your workflows, services, or account.
                </Text>
                <Text style={[styles.title, { fontSize: 20, marginTop: 24 }]}>Dashboard</Text>
                <View style={{ flexDirection: isLandscape ? 'row' : 'column', justifyContent: 'center', alignItems: isLandscape ? 'flex-start' : 'center' }}>
                    {placeholderData.map((item, index) => (
                        <Card key={index} style={{ width: isLandscape ? 200 : '90%' }}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.text}>{item.subtitle}</Text>
                            <Text style={styles.text}>{item.value}</Text>
                        </Card>
                    ))}
                </View>
            </View>
        </View>
    );
}
