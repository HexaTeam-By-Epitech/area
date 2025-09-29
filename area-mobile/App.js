import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MyAccountScreen from './screens/MyAccountScreen';
import ServicesScreen from './screens/ServicesScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProjectScreen from './screens/ProjectScreen';
import LandingScreen from './screens/LandingScreen';
import './screens/mockBackend';
import colors from './screens/colors';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function ProtectedDrawer({ route }) {
    const { token, email } = route.params || {};
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
                initialParams={{ token, email }}
            />
            <Drawer.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Workflows' }}
                initialParams={{ token, email }}
            />
            <Drawer.Screen
                name="Services"
                component={ServicesScreen}
                options={{ title: 'Services' }}
                initialParams={{ token, email }}
            />
            <Drawer.Screen
                name="MyAccount"
                component={MyAccountScreen}
                options={{ title: 'My Account' }}
                initialParams={{ token, email }}
            />
        </Drawer.Navigator>
    );
}

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                id="RootStack"
                initialRouteName="Landing"
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="Landing" component={LandingScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Protected" component={ProtectedDrawer} />
                <Stack.Screen name="Project" component={ProjectScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
