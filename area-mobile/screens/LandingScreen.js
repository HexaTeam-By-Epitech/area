import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import styles from '../styles';
import colors from './colors';
import Button from '../components/Button';

export default function LandingScreen({ navigation }) {
    return (
        <ScrollView contentContainerStyle={[styles.container, { paddingVertical: 40, paddingHorizontal: 24 }]}>
            {/* Hero Section */}
            <Text style={[styles.title, { fontSize: 34, fontWeight: '900', marginBottom: 12 }]}>
                Supercharge Your Day with AREA
            </Text>
            <Text style={[styles.text, { fontSize: 20, color: colors.textSecondary, marginBottom: 25, textAlign: 'center' }]}>
                Automate. Simplify. Achieve more.
            </Text>

            {/* Why AREA Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why AREA?</Text>
                <Text style={styles.paragraph}>
                    Stop wasting time on repetitive tasks. AREA automates your apps so you can focus on what really matters.
                    Connect everything in one place and let your digital life flow seamlessly.
                </Text>
            </View>

            {/* Benefits Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Benefits You'll Love</Text>
                <Text style={styles.bullet}>• Save hours every week</Text>
                <Text style={styles.bullet}>• Stay organized effortlessly</Text>
                <Text style={styles.bullet}>• Get smart notifications when it matters</Text>
                <Text style={styles.bullet}>• Keep all your favorite services connected</Text>
            </View>

            {/* Use Cases Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Real-Life Use Cases</Text>
                <Text style={styles.paragraph}>
                    Receive an important attachment? AREA saves it to your cloud automatically.
                    New task in your project? Your team gets notified instantly.
                    Less stress, more results.
                </Text>
            </View>

            {/* Call-to-Action */}
            <Button
                title="Get Started Now"
                onPress={() => navigation.navigate('Login')}
                style={{
                    marginTop: 25,
                    backgroundColor: colors.buttonColor,
                    paddingVertical: 16,
                    paddingHorizontal: 35,
                    borderRadius: 10,
                }}
                textStyle={{
                    color: colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 19,
                }}
            />
        </ScrollView>
    );
}
