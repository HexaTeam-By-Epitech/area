import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import styles from '../styles';
import Button from '../components/Button';

export default function LandingScreen({ navigation }) {
    return (
        <ScrollView contentContainerStyle={[styles.container, styles.scrollContent]}>
            {/* Hero Section */}
            <Text style={[styles.title, styles.title]}>
                Supercharge Your Day with AREA
            </Text>
            <Text style={[styles.text, styles.sectionTitle]}>
                Automate. Simplify. Achieve more.
            </Text>

            {/* Why AREA */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why AREA?</Text>
                <Text style={styles.paragraph}>
                    Stop wasting time on repetitive tasks. AREA automates your apps so you can focus on what really matters.
                    Connect everything in one place and let your digital life flow seamlessly.
                </Text>
            </View>

            {/* Benefits */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Benefits You'll Love</Text>
                <Text style={styles.bullet}>• Save hours every week</Text>
                <Text style={styles.bullet}>• Stay organized effortlessly</Text>
                <Text style={styles.bullet}>• Get smart notifications when it matters</Text>
                <Text style={styles.bullet}>• Keep all your favorite services connected</Text>
            </View>

            {/* Use Cases */}
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
                style={styles.button}
                textStyle={styles.buttonText}
            />
        </ScrollView>
    );
}

