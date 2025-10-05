import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';

export default function ServicesScreen() {
    return (
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.title}>Manage your external services</Text>
            {/* Ajoute ici la gestion des connexions aux services externes */}
            <Button title="Connect a new service" onPress={() => {}} />
        </View>
    );
}
