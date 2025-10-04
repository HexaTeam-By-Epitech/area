import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styles from '../styles';

export default function Button({ title, onPress, style, textStyle, ...props }) {
    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            activeOpacity={0.8}
            {...props}
        >
            <Text style={[styles.buttonText, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
}
