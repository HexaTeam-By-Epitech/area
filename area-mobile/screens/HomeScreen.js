import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from './colors';

export default function HomeScreen({ route }) {
    const { email } = route.params || {};

    const placeholderData = Array(4).fill({ title: 'Mock name', subtitle: 'Mock sub', value: 0 });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome{email ? `, ${email}` : ''}!</Text>
            <Text style={styles.subtitle}>
                Use the menu to access your workflows, services, or account.
            </Text>

            <Text style={styles.dashboardTitle}>Dashboard</Text>

            <View style={styles.cardsContainer}>
                {placeholderData.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                        <Text style={styles.cardValue}>{item.value}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    dashboardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 20,
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    card: {
        backgroundColor: colors.cardBgSecondary,
        borderRadius: 8,
        padding: 15,
        width: '48%',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    cardValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
});
