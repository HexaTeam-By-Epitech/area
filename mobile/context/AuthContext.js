import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        accessToken: null,
        email: null,
        userId: null,
        isLoading: true,
        isAuthenticated: false
    });

    // Load auth state from AsyncStorage on mount
    useEffect(() => {
        loadAuthState();
    }, []);

    const loadAuthState = async () => {
        try {
            const [accessToken, email, userId] = await Promise.all([
                AsyncStorage.getItem('accessToken'),
                AsyncStorage.getItem('email'),
                AsyncStorage.getItem('userId')
            ]);

            if (accessToken && email && userId) {
                setAuthState({
                    accessToken,
                    email,
                    userId,
                    isLoading: false,
                    isAuthenticated: true
                });
            } else {
                setAuthState({
                    accessToken: null,
                    email: null,
                    userId: null,
                    isLoading: false,
                    isAuthenticated: false
                });
            }
        } catch (error) {
            console.error('Failed to load auth state:', error);
            setAuthState({
                accessToken: null,
                email: null,
                userId: null,
                isLoading: false,
                isAuthenticated: false
            });
        }
    };

    const login = async (email, accessToken, userId) => {
        try {
            await Promise.all([
                AsyncStorage.setItem('accessToken', accessToken),
                AsyncStorage.setItem('email', email),
                AsyncStorage.setItem('userId', userId)
            ]);

            setAuthState({
                accessToken,
                email,
                userId,
                isLoading: false,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Failed to save auth state:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await Promise.all([
                AsyncStorage.removeItem('accessToken'),
                AsyncStorage.removeItem('email'),
                AsyncStorage.removeItem('userId')
            ]);

            setAuthState({
                accessToken: null,
                email: null,
                userId: null,
                isLoading: false,
                isAuthenticated: false
            });
        } catch (error) {
            console.error('Failed to clear auth state:', error);
            throw error;
        }
    };

    const getToken = () => authState.accessToken;

    return (
        <AuthContext.Provider value={{
            ...authState,
            login,
            logout,
            getToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
