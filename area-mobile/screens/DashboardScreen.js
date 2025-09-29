import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import colors from './colors';

const mockWorkflows = [
    { id: '1', name: 'Workflow 1', description: 'Description 1' },
    { id: '2', name: 'Workflow 2', description: 'Description 2' },
    { id: '3', name: 'Workflow 3', description: 'Description 3' },
];

export default function DashboardScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Workflows</Text>
            <FlatList
                data={mockWorkflows}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Project', { id: item.id })}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardDesc}>{item.description}</Text>
                    </TouchableOpacity>
                )}
            />
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
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
    },
    card: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: 20,
        marginBottom: 15,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 18,
    },
    cardDesc: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 5,
    },
});

