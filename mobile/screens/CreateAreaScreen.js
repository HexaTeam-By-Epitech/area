import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiDirect } from '../utils/api';

export default function CreateAreaScreen({ navigation }) {
    const [actionProviders, setActionProviders] = useState({});
    const [reactionProviders, setReactionProviders] = useState({});
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const [selectedAction, setSelectedAction] = useState('');
    const [selectedReaction, setSelectedReaction] = useState('');
    const [actionConfig, setActionConfig] = useState({});
    const [reactionConfig, setReactionConfig] = useState({});
    const [reactionConfigSchema, setReactionConfigSchema] = useState([]);

    useEffect(() => {
        loadActionsAndReactions();
    }, []);

    const loadActionsAndReactions = async () => {
        try {
            setLoading(true);
            setError('');

            const [actionsRes, reactionsRes] = await Promise.all([
                apiDirect.get('/manager/actions'),
                apiDirect.get('/manager/reactions')
            ]);

            setActionProviders(actionsRes.data || {});
            setReactionProviders(reactionsRes.data || {});
        } catch (err) {
            console.error('Failed to load actions/reactions:', err);
            setError(err.response?.data?.message || 'Failed to load available actions and reactions');
        } finally {
            setLoading(false);
        }
    };

    // Flatten actions from providers for the picker
    const flattenedActions = Object.entries(actionProviders).flatMap(([provider, data]) =>
        data.isLinked ? data.items || [] : []
    );

    // Flatten reactions from providers for the picker
    const flattenedReactions = Object.entries(reactionProviders).flatMap(([provider, data]) =>
        data.isLinked ? data.items || [] : []
    );

    const loadReactionConfigSchema = async (reactionName) => {
        try {
            const response = await apiDirect.get(`/manager/reactions/${reactionName}/config-schema`);
            setReactionConfigSchema(response.data || []);
        } catch (err) {
            console.error('Failed to load reaction config schema:', err);
            setReactionConfigSchema([]);
        }
    };

    const handleReactionChange = (reactionName) => {
        setSelectedReaction(reactionName);
        setReactionConfig({});
        if (reactionName) {
            loadReactionConfigSchema(reactionName);
        } else {
            setReactionConfigSchema([]);
        }
    };

    const getSelectedReactionSchema = () => {
        return reactionConfigSchema;
    };

    const handleConfigChange = (key, value) => {
        setReactionConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const createArea = async () => {
        if (!selectedAction) {
            Alert.alert('Error', 'Please select an action');
            return;
        }

        if (!selectedReaction) {
            Alert.alert('Error', 'Please select a reaction');
            return;
        }

        // Validate required config fields
        const schema = getSelectedReactionSchema();
        for (const field of schema) {
            if (field.required && !reactionConfig[field.name]) {
                Alert.alert('Error', `Please fill in the required field: ${field.label || field.name}`);
                return;
            }
        }

        try {
            setCreating(true);
            await apiDirect.post('/manager/areas', {
                actionName: selectedAction,
                reactionName: selectedReaction,
                actionConfig: actionConfig,
                reactionConfig: reactionConfig
            });

            Alert.alert('Success', 'AREA created successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } catch (err) {
            console.error('Failed to create area:', err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to create AREA');
        } finally {
            setCreating(false);
        }
    };

    const isActionsArray = Array.isArray(flattenedActions);
    const isReactionsArray = Array.isArray(flattenedReactions);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.text, { marginTop: 16 }]}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#1e1e1e' }}>
            <View style={[styles.container, { paddingTop: 32 }]}>
                <Text style={styles.title}>Create New AREA</Text>

                {error ? (
                    <Text style={[styles.text, { color: '#d32f2f', marginBottom: 16, textAlign: 'center' }]}>
                        {error}
                    </Text>
                ) : null}

                {/* Action Selection */}
                <Card style={{ marginBottom: 20, padding: 16 }}>
                    <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>Select Action</Text>
                    <Text style={[styles.text, { fontSize: 14, marginBottom: 8 }]}>
                        The trigger that will start your automation
                    </Text>
                    <View style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: 8,
                        overflow: 'hidden'
                    }}>
                        <Picker
                            selectedValue={selectedAction}
                            onValueChange={(value) => setSelectedAction(value)}
                            style={{ color: '#fff' }}
                            dropdownIconColor="#fff"
                        >
                            <Picker.Item label="Select an action..." value="" />
                            {isActionsArray ? flattenedActions.map((action) => (
                                <Picker.Item
                                    key={action.name}
                                    label={`${action.name} - ${action.description}`}
                                    value={action.name}
                                />
                            )) : <Picker.Item label="No actions available" value="" />}
                        </Picker>
                    </View>
                </Card>

                {/* Reaction Selection */}
                <Card style={{ marginBottom: 20, padding: 16 }}>
                    <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>Select Reaction</Text>
                    <Text style={[styles.text, { fontSize: 14, marginBottom: 8 }]}>The action that will be performed when triggered</Text>
                    <View style={{ backgroundColor: '#2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
                        <Picker
                            selectedValue={selectedReaction}
                            onValueChange={handleReactionChange}
                            style={{ color: '#fff' }}
                            dropdownIconColor="#fff"
                        >
                            <Picker.Item label="Select a reaction..." value="" />
                            {isReactionsArray ? flattenedReactions.map((reaction) => (
                                <Picker.Item
                                    key={reaction.name}
                                    label={`${reaction.name} - ${reaction.description}`}
                                    value={reaction.name}
                                />
                            )) : <Picker.Item label="No reactions available" value="" />}
                        </Picker>
                    </View>
                </Card>

                {/* Reaction Configuration */}
                {selectedReaction && getSelectedReactionSchema().length > 0 && (
                    <Card style={{ marginBottom: 20, padding: 16 }}>
                        <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>
                            Configure Reaction
                        </Text>
                        {getSelectedReactionSchema().map((field) => (
                            <View key={field.name} style={{ marginBottom: 12 }}>
                                <Text style={[styles.text, { fontSize: 14, marginBottom: 4 }]}>
                                    {field.label || field.name}{field.required && <Text style={{ color: '#d32f2f' }}> *</Text>}
                                </Text>
                                <TextInput
                                    style={[styles.input, { marginBottom: 0 }]}
                                    placeholder={field.placeholder || field.label || field.name}
                                    placeholderTextColor="#c3c9d5"
                                    value={reactionConfig[field.name] || ''}
                                    onChangeText={(value) => handleConfigChange(field.name, value)}
                                    keyboardType={field.type === 'email' ? 'email-address' : field.type === 'number' ? 'numeric' : 'default'}
                                />
                            </View>
                        ))}
                    </Card>
                )}

                {/* Create Button */}
                <View style={{ marginBottom: 40 }}>
                    {creating ? (
                        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
                    ) : (
                        <>
                            <Button
                                title="Create AREA"
                                onPress={createArea}
                                style={{ backgroundColor: '#4CAF50', marginBottom: 12 }}
                            />
                            <Button
                                title="Cancel"
                                onPress={() => navigation.goBack()}
                                style={{ backgroundColor: '#d32f2f' }}
                            />
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
