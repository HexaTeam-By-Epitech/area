import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import colors from './colors';

export default function ProjectScreen({ route }) {
    const { id } = route.params;
    // Ici tu peux ajouter la logique d'édition du workflow
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Workflow #{id}</Text>
            <TextInput style={styles.input} placeholder="Workflow name" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.textSecondary} />
            {/* Ajoute ici d'autres champs et actions */}
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
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
    },
    input: {
        backgroundColor: colors.cardBgPrimary,
        color: colors.textPrimary,
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'transparent',
    },
});
