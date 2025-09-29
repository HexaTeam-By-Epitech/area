import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from './colors';

export default function HomeScreen({ route, navigation }) {
    const { token, email } = route.params;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome, {email}!</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('MyAccount', { token, email })}
            >
                <Text style={styles.buttonText}>My Account</Text>
            </TouchableOpacity>
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
        marginBottom: 40,
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
        fontSize: 18,
    },
});
