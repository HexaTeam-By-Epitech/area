import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';

export default function MyAccountScreen({ route, navigation }) {
    const { token, email } = route.params;

    return (
        <View style={[styles.container, { marginTop: 50 }]}>
            <Text style={styles.text}>Email: {email}</Text>
            <Text style={styles.text}>Token: {token ? token.slice(0, 10) + '...' : ''}</Text>
            <Button title="Logout" onPress={() => navigation.replace('Login')} />
        </View>
    );
}
