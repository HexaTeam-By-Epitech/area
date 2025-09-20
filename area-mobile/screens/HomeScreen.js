import React from 'react';
import { View, Text, Button } from 'react-native';

export default function HomeScreen({ route, navigation }) {
    const { token, email } = route.params;

    return (
        <View style={{ padding: 20, marginTop: 50 }}>
            <Text>Welcome {email}</Text>
            <Button title="My Account" onPress={() => navigation.navigate('MyAccount', { token, email })} />
        </View>
    );
}
