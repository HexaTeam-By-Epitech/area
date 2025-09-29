import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import colors from './colors';

export default function LandingScreen({ navigation }) {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Hero Section */}
            <Text style={styles.title}>Supercharge Your Day with AREA</Text>
            <Text style={styles.subtitle}>Automate. Simplify. Achieve more.</Text>

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
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.buttonText}>Get Started Now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        color: colors.textSecondary || colors.textPrimary,
        marginBottom: 25,
        textAlign: 'center',
    },
    heroImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 35,
    },
    section: {
        marginBottom: 30,
        width: '100%',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 24,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    bullet: {
        fontSize: 17,
        color: colors.textPrimary,
        marginBottom: 6,
        marginLeft: 12,
    },
    sectionImage: {
        width: '90%',
        height: 180,
        borderRadius: 12,
        marginTop: 15,
    },
    button: {
        marginTop: 25,
        backgroundColor: colors.buttonColor,
        paddingVertical: 16,
        paddingHorizontal: 35,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 19,
    },
});
