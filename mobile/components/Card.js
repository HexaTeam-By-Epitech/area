import React from 'react';
import { View, StyleSheet } from 'react-native';
import styles from '../styles';

export default function Card({ children, style, ...props }) {
    return (
        <View style={[styles.card, style]} {...props}>
            {children}
        </View>
    );
}
