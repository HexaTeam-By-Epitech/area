import React from 'react';
import { View, Text, Button } from 'react-native';

export default function MyAccountScreen({ route, navigation }) {
    const { token, email } = route.params;

    return (
        <View style={{ padding: 20, marginTop: 50 }}>
            <Text>Email: {email}</Text>
            <Text>Token: {token.slice(0, 10)}...</Text>
            <Button title="Logout" onPress={() => navigation.replace('Login')} />
        </View>
    );
}
