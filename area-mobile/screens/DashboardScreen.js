import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import colors from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKFLOW_IDS = ['1', '2', '3'];

export default function DashboardScreen({ navigation }) {
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
    useEffect(() => {
        const onChange = ({ window }) => {
            setScreenWidth(window.width);
        };
        const subscription = Dimensions.addEventListener('change', onChange);
        return () => {
            if (subscription?.remove) subscription.remove();
            else Dimensions.removeEventListener('change', onChange);
        };
    }, []);
    const isTablet = screenWidth >= 768;
    const styles = createStyles(isTablet);

    const [workflows, setWorkflows] = useState([]);

    useEffect(() => {
        // Récupère les infos de chaque workflow depuis AsyncStorage
        Promise.all(
            WORKFLOW_IDS.map(async id => {
                const name = await AsyncStorage.getItem(`workflow-name-${id}`) || `Workflow ${id}`;
                const description = await AsyncStorage.getItem(`workflow-desc-${id}`) || `Description ${id}`;
                return { id, name, description };
            })
        ).then(setWorkflows);
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Workflows</Text>
            <FlatList
                data={workflows}
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

const createStyles = (isTablet) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        padding: isTablet ? 60 : 20,
    },
    title: {
        fontSize: isTablet ? 32 : 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: isTablet ? 32 : 20,
    },
    card: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: isTablet ? 30 : 20,
        marginBottom: isTablet ? 22 : 15,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: isTablet ? 22 : 18,
    },
    cardDesc: {
        color: colors.textSecondary,
        fontSize: isTablet ? 18 : 14,
    },
});
