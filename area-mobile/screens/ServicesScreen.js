import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from './colors';

export default function ServicesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Manage your external services</Text>
            {/* Ajoute ici la gestion des connexions aux services externes */}
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Connect a new service</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 30,
        textAlign: 'center',
    },
    button: {
        backgroundColor: colors.buttonColor,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 16,
    },
});

