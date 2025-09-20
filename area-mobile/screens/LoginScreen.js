import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (type) => {
        try {
            const response = await axios.post('http://10.101.53.237:3000/auth/' + type, { email, password });
            const token = response.data.token;
            navigation.navigate('Home', { token, email });
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Auth failed');
        }
    };

    return (
        <View style={{ padding: 20, marginTop: 50 }}>
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <Button title="Login" onPress={() => handleAuth('login')} />
            <Button title="Register" onPress={() => handleAuth('register')} />
        </View>
    );
}
