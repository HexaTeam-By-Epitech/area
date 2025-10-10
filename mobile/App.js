import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, ActivityIndicator, Text } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import VerificationScreen from './screens/VerificationScreen';
import HomeScreen from './screens/HomeScreen';
import MyAccountScreen from './screens/MyAccountScreen';
import ServicesScreen from './screens/ServicesScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProjectScreen from './screens/ProjectScreen';
import CreateAreaScreen from './screens/CreateAreaScreen';
import LandingScreen from './screens/LandingScreen';
import './screens/mockBackend';
import colors from './screens/colors';
import styles from './styles';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function ProtectedDrawer() {
    const { email, logout } = useAuth();

    return (
        <Drawer.Navigator
            id="ProtectedDrawer"
            initialRouteName="Home"
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.bgPrimary },
                headerTintColor: colors.textPrimary,
                drawerStyle: {
                    backgroundColor: colors.cardBgPrimary,
                },
                drawerActiveBackgroundColor: colors.buttonColor,
                drawerActiveTintColor: colors.textPrimary,
                drawerInactiveTintColor: colors.textSecondary,
                drawerLabelStyle: {
                    fontWeight: '600',
                    fontSize: 16,
                },
            }}
        >
            <Drawer.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Home' }}
            />
            <Drawer.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'My AREAs' }}
            />
            <Drawer.Screen
                name="Services"
                component={ServicesScreen}
                options={{ title: 'Services' }}
            />
            <Drawer.Screen
                name="MyAccount"
                component={MyAccountScreen}
                options={{ title: 'My Account' }}
            />
        </Drawer.Navigator>
    );
}

function AppNavigator() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.text, { marginTop: 16 }]}>Loading...</Text>
            </View>
        );
    }

    return (
        <Stack.Navigator
            id="RootStack"
            initialRouteName={isAuthenticated ? "Protected" : "Landing"}
            screenOptions={{ headerShown: false }}
        >
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Landing" component={LandingScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen
                        name="Verification"
                        component={VerificationScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Email Verification',
                            headerStyle: { backgroundColor: colors.bgPrimary },
                            headerTintColor: colors.textPrimary,
                        }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="Protected" component={ProtectedDrawer} />
                    <Stack.Screen
                        name="CreateArea"
                        component={CreateAreaScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Create AREA',
                            headerStyle: { backgroundColor: colors.bgPrimary },
                            headerTintColor: colors.textPrimary,
                        }}
                    />
                    <Stack.Screen
                        name="Project"
                        component={ProjectScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Project',
                            headerStyle: { backgroundColor: colors.bgPrimary },
                            headerTintColor: colors.textPrimary,
                        }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <AppNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}
