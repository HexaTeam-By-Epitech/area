import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../styles';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiDirect } from '../utils/api';

export default function CreateAreaScreen({ navigation }) {
    const [actions, setActions] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const [selectedAction, setSelectedAction] = useState('');
    const [selectedReaction, setSelectedReaction] = useState('');
    const [reactionConfig, setReactionConfig] = useState({});

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

            setActions(actionsRes.data || []);
            setReactions(reactionsRes.data || []);
        } catch (err) {
            console.error('Failed to load actions/reactions:', err);
            setError(err.response?.data?.message || 'Failed to load available actions and reactions');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedReactionSchema = () => {
        const reaction = reactions.find(r => r.name === selectedReaction);
        return reaction?.configSchema || [];
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
            if (field.required && !reactionConfig[field.key]) {
                Alert.alert('Error', `Please fill in the required field: ${field.label}`);
                return;
            }
        }

        try {
            setCreating(true);
            await apiDirect.post('/manager/areas', {
                actionName: selectedAction,
                reactionName: selectedReaction,
                config: reactionConfig
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
                            {actions.map((action) => (
                                <Picker.Item
                                    key={action.name}
                                    label={`${action.name} - ${action.description}`}
                                    value={action.name}
                                />
                            ))}
                        </Picker>
                    </View>
                </Card>

                {/* Reaction Selection */}
                <Card style={{ marginBottom: 20, padding: 16 }}>
                    <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>Select Reaction</Text>
                    <Text style={[styles.text, { fontSize: 14, marginBottom: 8 }]}>
                        The action that will be performed when triggered
                    </Text>
                    <View style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: 8,
                        overflow: 'hidden'
                    }}>
                        <Picker
                            selectedValue={selectedReaction}
                            onValueChange={(value) => {
                                setSelectedReaction(value);
                                setReactionConfig({});
                            }}
                            style={{ color: '#fff' }}
                            dropdownIconColor="#fff"
                        >
                            <Picker.Item label="Select a reaction..." value="" />
                            {reactions.map((reaction) => (
                                <Picker.Item
                                    key={reaction.name}
                                    label={`${reaction.name} - ${reaction.description}`}
                                    value={reaction.name}
                                />
                            ))}
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
                            <View key={field.key} style={{ marginBottom: 12 }}>
                                <Text style={[styles.text, { fontSize: 14, marginBottom: 4 }]}>
                                    {field.label}{field.required && <Text style={{ color: '#d32f2f' }}> *</Text>}
                                </Text>
                                {field.description && (
                                    <Text style={[styles.text, { fontSize: 12, color: '#888', marginBottom: 4 }]}>
                                        {field.description}
                                    </Text>
                                )}
                                <TextInput
                                    style={[styles.input, { marginBottom: 0 }]}
                                    placeholder={field.placeholder || field.label}
                                    placeholderTextColor="#c3c9d5"
                                    value={reactionConfig[field.key] || ''}
                                    onChangeText={(value) => handleConfigChange(field.key, value)}
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
