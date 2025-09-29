import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from './colors';

export default function HomeScreen({ route }) {
    const { email } = route.params || {};
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome{email ? `, ${email}` : ''}!</Text>
            <Text style={styles.subtitle}>Use the menu to access your workflows, services, or account.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
