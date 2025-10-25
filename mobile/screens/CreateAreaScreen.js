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
    const [currentStep, setCurrentStep] = useState(1);

    const [selectedActionProvider, setSelectedActionProvider] = useState(null);
    const [selectedReactionProvider, setSelectedReactionProvider] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [actionConfig, setActionConfig] = useState({});
    const [reactionConfig, setReactionConfig] = useState({});
    const [actionPlaceholders, setActionPlaceholders] = useState([]);

    // Sub-steps for action and reaction selection
    const [actionSubStep, setActionSubStep] = useState(1); // 1: provider, 2: action
    const [reactionSubStep, setReactionSubStep] = useState(1); // 1: provider, 2: reaction

    useEffect(() => {
        loadActionsAndReactions();
    }, []);

    // Load placeholders when action is selected
    useEffect(() => {
        if (selectedAction) {
            loadActionPlaceholders(selectedAction.name);
        } else {
            setActionPlaceholders([]);
        }
    }, [selectedAction]);

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

    const loadActionPlaceholders = async (actionName) => {
        try {
            const response = await apiDirect.get(`/manager/actions/${actionName}/placeholders`);
            setActionPlaceholders(response.data || []);
        } catch (err) {
            console.error('Failed to load placeholders for action:', actionName, err);
            setActionPlaceholders([]);
        }
    };

    // Get available action providers
    const getActionProviders = () => {
        return Object.entries(actionProviders)
            .filter(([_, data]) => data.isLinked && data.items?.length > 0)
            .map(([provider, data]) => ({
                name: provider,
                displayName: provider.charAt(0).toUpperCase() + provider.slice(1),
                itemCount: data.items.length
            }));
    };

    // Get available reaction providers
    const getReactionProviders = () => {
        return Object.entries(reactionProviders)
            .filter(([_, data]) => data.isLinked && data.items?.length > 0)
            .map(([provider, data]) => ({
                name: provider,
                displayName: provider.charAt(0).toUpperCase() + provider.slice(1),
                itemCount: data.items.length
            }));
    };

    const getActionConfigSchema = () => {
        return selectedAction?.configSchema || [];
    };

    const getReactionConfigSchema = () => {
        return selectedReaction?.configSchema || [];
    };

    const handleActionConfigChange = (key, value) => {
        setActionConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReactionConfigChange = (key, value) => {
        setReactionConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const selectActionProvider = (provider) => {
        setSelectedActionProvider(provider);
        setActionSubStep(2); // Go to action selection
    };

    const selectReactionProvider = (provider) => {
        setSelectedReactionProvider(provider);
        setReactionSubStep(2); // Go to reaction selection
    };

    const selectAction = (action) => {
        setSelectedAction(action);
        setActionConfig({});
        // Initialize config with default values
        if (action.configSchema) {
            const initialConfig = {};
            action.configSchema.forEach(field => {
                initialConfig[field.key || field.name] = field.defaultValue || '';
            });
            setActionConfig(initialConfig);
        }
    };

    const selectReaction = (reaction) => {
        setSelectedReaction(reaction);
        setReactionConfig({});
        // Initialize config with default values
        if (reaction.configSchema) {
            const initialConfig = {};
            reaction.configSchema.forEach(field => {
                initialConfig[field.key || field.name] = field.defaultValue || '';
            });
            setReactionConfig(initialConfig);
        }
    };

    const validateStep = (step) => {
        if (step === 1) {
            if (actionSubStep === 1 && !selectedActionProvider) {
                Alert.alert('Error', 'Please select an action service');
                return false;
            }
            if (actionSubStep === 2 && !selectedAction) {
                Alert.alert('Error', 'Please select an action');
                return false;
            }
        }
        if (step === 2) {
            const schema = getActionConfigSchema();
            for (const field of schema) {
                if (field.required && !actionConfig[field.key || field.name]) {
                    Alert.alert('Error', `Please fill the required field: ${field.label || field.name}`);
                    return false;
                }
            }
        }
        if (step === 3) {
            if (reactionSubStep === 1 && !selectedReactionProvider) {
                Alert.alert('Error', 'Please select a reaction service');
                return false;
            }
            if (reactionSubStep === 2 && !selectedReaction) {
                Alert.alert('Error', 'Please select a reaction');
                return false;
            }
        }
        if (step === 4) {
            const schema = getReactionConfigSchema();
            for (const field of schema) {
                if (field.required && !reactionConfig[field.key || field.name]) {
                    Alert.alert('Error', `Please fill the required field: ${field.label || field.name}`);
                    return false;
                }
            }
        }
        return true;
    };

    const nextStep = () => {
        // Handle sub-steps within main steps
        if (currentStep === 1 && actionSubStep === 1) {
            if (!selectedActionProvider) {
                Alert.alert('Error', 'Please select an action service');
                return;
            }
            setActionSubStep(2);
            return;
        }

        if (currentStep === 3 && reactionSubStep === 1) {
            if (!selectedReactionProvider) {
                Alert.alert('Error', 'Please select a reaction service');
                return;
            }
            setReactionSubStep(2);
            return;
        }

        // Main step validation and navigation
        if (validateStep(currentStep)) {
            if (currentStep === 1 && getActionConfigSchema().length === 0) {
                setCurrentStep(3); // Skip action config if not needed
                setReactionSubStep(1); // Reset reaction sub-step
            } else if (currentStep === 3 && getReactionConfigSchema().length === 0) {
                setCurrentStep(5); // Skip reaction config if not needed
            } else {
                setCurrentStep(currentStep + 1);
                if (currentStep === 2) {
                    setReactionSubStep(1); // Reset reaction sub-step when moving to reaction selection
                }
            }
        }
    };

    const prevStep = () => {
        // Handle sub-steps within main steps
        if (currentStep === 1 && actionSubStep === 2) {
            setActionSubStep(1);
            setSelectedAction(null);
            setActionConfig({});
            return;
        }

        if (currentStep === 3 && reactionSubStep === 2) {
            setReactionSubStep(1);
            setSelectedReaction(null);
            setReactionConfig({});
            return;
        }

        // Main step navigation
        if (currentStep === 3 && getActionConfigSchema().length === 0) {
            setCurrentStep(1); // Skip action config if not needed
            setActionSubStep(2); // Go back to action selection
        } else if (currentStep === 5 && getReactionConfigSchema().length === 0) {
            setCurrentStep(3); // Skip reaction config if not needed
            setReactionSubStep(2); // Go back to reaction selection
        } else {
            setCurrentStep(currentStep - 1);
            if (currentStep === 3) {
                setActionSubStep(2); // Go back to action selection
            }
            if (currentStep === 4) {
                setReactionSubStep(2); // Go back to reaction selection
            }
        }
    };

    const createArea = async () => {
        if (!validateStep(4)) return;

        try {
            setCreating(true);

            const payload = {
                actionName: selectedAction.name,
                reactionName: selectedReaction.name,
                actionConfig,
                reactionConfig
            };

            await apiDirect.post('/manager/areas', payload);

            Alert.alert('Success', 'AREA created successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } catch (err) {
            console.error('Failed to create area:', err);

            const errorMessage = err.response?.data?.message ||
                                err.response?.data?.error ||
                                'Failed to create AREA';

            Alert.alert('Error', errorMessage);
        } finally {
            setCreating(false);
        }
    };

    // Get the actual step number for display (takes into account skipped steps)
    const getDisplayStepNumber = (actualStep) => {
        let displayStep = 1;

        // Step 1: Action provider + selection
        if (actualStep === 1) return 1;

        // Step 2: Action config - only count if action has config
        if (actualStep === 2) return 2;
        if (actualStep >= 3 && getActionConfigSchema().length > 0) displayStep = 3;
        else if (actualStep >= 3) displayStep = 2;

        // Step 3: Reaction provider + selection
        if (actualStep === 3) return displayStep;

        // Step 4: Reaction config - only count if reaction has config
        if (actualStep === 4) return displayStep + 1;
        if (actualStep >= 5 && getReactionConfigSchema().length > 0) displayStep += 2;
        else if (actualStep >= 5) displayStep += 1;

        // Step 5: Summary
        if (actualStep === 5) return displayStep;

        return displayStep;
    };

    const getTotalDisplaySteps = () => {
        let total = 3; // Always have: action selection, reaction selection, summary
        if (getActionConfigSchema().length > 0) total++;
        if (getReactionConfigSchema().length > 0) total++;
        return total;
    };

    const renderStepIndicator = () => {
        const totalSteps = getTotalDisplaySteps();
        const currentDisplayStep = getDisplayStepNumber(currentStep);

        return (
            <View style={stepIndicatorStyle.container}>
                {Array.from({ length: totalSteps }, (_, i) => {
                    const stepNumber = i + 1;
                    let isActive = stepNumber === currentDisplayStep;
                    let isCompleted = stepNumber < currentDisplayStep;

                    return (
                        <View key={stepNumber} style={stepIndicatorStyle.step}>
                            <View style={[
                                stepIndicatorStyle.circle,
                                isActive && stepIndicatorStyle.activeCircle,
                                isCompleted && stepIndicatorStyle.completedCircle
                            ]}>
                                <Text style={[
                                    stepIndicatorStyle.stepText,
                                    (isActive || isCompleted) && stepIndicatorStyle.activeStepText
                                ]}>
                                    {stepNumber}
                                </Text>
                            </View>
                            {i < totalSteps - 1 && (
                                <View style={[
                                    stepIndicatorStyle.line,
                                    isCompleted && stepIndicatorStyle.completedLine
                                ]} />
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderActionProviderSelection = () => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                Step {getDisplayStepNumber(1)}: Choose Action Service
            </Text>
            <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                Select the service that will provide the trigger for your automation
            </Text>

            {getActionProviders().map((provider) => (
                <TouchableOpacity
                    key={provider.name}
                    style={[
                        serviceCardStyle.container,
                        selectedActionProvider === provider.name && serviceCardStyle.selected
                    ]}
                    onPress={() => selectActionProvider(provider.name)}
                >
                    <Text style={serviceCardStyle.title}>{provider.displayName}</Text>
                    <Text style={serviceCardStyle.description}>
                        {provider.itemCount} action{provider.itemCount > 1 ? 's' : ''} available
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderActionSelection = () => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                Step {getDisplayStepNumber(1)}: Choose an Action
            </Text>
            <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                Select the specific action from {selectedActionProvider?.toUpperCase()}
            </Text>

            {actionProviders[selectedActionProvider]?.items?.map((item) => (
                <TouchableOpacity
                    key={`${selectedActionProvider}-${item.name}`}
                    style={[
                        itemCardStyle.container,
                        selectedAction?.name === item.name && itemCardStyle.selected
                    ]}
                    onPress={() => selectAction(item)}
                >
                    <Text style={itemCardStyle.title}>{item.name}</Text>
                    <Text style={itemCardStyle.description}>{item.description}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderReactionProviderSelection = () => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                Step {getDisplayStepNumber(3)}: Choose Reaction Service
            </Text>
            <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                Select the service that will execute the reaction
            </Text>

            {getReactionProviders().map((provider) => (
                <TouchableOpacity
                    key={provider.name}
                    style={[
                        serviceCardStyle.container,
                        selectedReactionProvider === provider.name && serviceCardStyle.selected
                    ]}
                    onPress={() => selectReactionProvider(provider.name)}
                >
                    <Text style={serviceCardStyle.title}>{provider.displayName}</Text>
                    <Text style={serviceCardStyle.description}>
                        {provider.itemCount} reaction{provider.itemCount > 1 ? 's' : ''} available
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderReactionSelection = () => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                Step {getDisplayStepNumber(3)}: Choose a Reaction
            </Text>
            <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                Select the specific reaction from {selectedReactionProvider?.toUpperCase()}
            </Text>

            {reactionProviders[selectedReactionProvider]?.items?.map((item) => (
                <TouchableOpacity
                    key={`${selectedReactionProvider}-${item.name}`}
                    style={[
                        itemCardStyle.container,
                        selectedReaction?.name === item.name && itemCardStyle.selected
                    ]}
                    onPress={() => selectReaction(item)}
                >
                    <Text style={itemCardStyle.title}>{item.name}</Text>
                    <Text style={itemCardStyle.description}>{item.description}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderActionProviderAndSelection = () => {
        if (actionSubStep === 1) {
            return renderActionProviderSelection();
        } else {
            return renderActionSelection();
        }
    };

    const renderReactionProviderAndSelection = () => {
        if (reactionSubStep === 1) {
            return renderReactionProviderSelection();
        } else {
            return renderReactionSelection();
        }
    };

    const renderActionConfig = () => {
        const schema = getActionConfigSchema();
        if (schema.length === 0) return null;

        return (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                    Step {getDisplayStepNumber(2)}: Configure Action
                </Text>
                <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                    Configure the parameters for your action "{selectedAction?.name}"
                </Text>

                {schema.map((field) => (
                    <View key={field.key || field.name} style={{ marginBottom: 16 }}>
                        <Text style={configFieldStyle.label}>
                            {field.label || field.name}
                            {field.required && <Text style={{ color: '#d32f2f' }}> *</Text>}
                        </Text>
                        {field.description && (
                            <Text style={configFieldStyle.description}>
                                {field.description}
                            </Text>
                        )}
                        <TextInput
                            style={configFieldStyle.input}
                            placeholder={field.placeholder || field.label || field.name}
                            placeholderTextColor="#c3c9d5"
                            value={actionConfig[field.key || field.name] || ''}
                            onChangeText={(value) => handleActionConfigChange(field.key || field.name, value)}
                            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                        />
                    </View>
                ))}
            </ScrollView>
        );
    };

    const renderReactionConfig = () => {
        const schema = getReactionConfigSchema();

        if (schema.length === 0) return null;

        return (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                    Step {getDisplayStepNumber(4)}: Configure Reaction
                </Text>
                <Text style={[styles.text, { marginBottom: 20, textAlign: 'center' }]}>
                    Configure the parameters for your reaction "{selectedReaction?.name}"
                </Text>

                {actionPlaceholders.length > 0 && (
                    <Card style={{ marginBottom: 16, padding: 12 }}>
                        <Text style={[styles.text, { fontSize: 14, fontWeight: 'bold', marginBottom: 8 }]}>
                            💡 Available placeholders:
                        </Text>
                        {actionPlaceholders.map((placeholder) => (
                            <Text key={placeholder.key} style={[styles.text, { fontSize: 12, marginBottom: 4 }]}>
                                • {placeholder.key}: {placeholder.description}
                            </Text>
                        ))}
                    </Card>
                )}

                {schema.map((field) => {
                    const fieldKey = field.key || field.name;
                    const fieldValue = reactionConfig[fieldKey] || '';

                    return (
                        <View key={fieldKey} style={{ marginBottom: 16 }}>
                            <Text style={configFieldStyle.label}>
                                {field.label || field.name}
                                {field.required && <Text style={{ color: '#d32f2f' }}> *</Text>}
                            </Text>
                            {field.description && (
                                <Text style={configFieldStyle.description}>
                                    {field.description}
                                </Text>
                            )}

                            {/* Multi-line input for body field */}
                            {(fieldKey === 'body' || field.name === 'body') ? (
                                <TextInput
                                    style={[configFieldStyle.input, { height: 100, textAlignVertical: 'top' }]}
                                    placeholder={field.placeholder || field.label || field.name}
                                    placeholderTextColor="#c3c9d5"
                                    value={fieldValue}
                                    onChangeText={(value) => handleReactionConfigChange(fieldKey, value)}
                                    keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                                    multiline={true}
                                    numberOfLines={4}
                                />
                            ) : (
                                <TextInput
                                    style={configFieldStyle.input}
                                    placeholder={field.placeholder || field.label || field.name}
                                    placeholderTextColor="#c3c9d5"
                                    value={fieldValue}
                                    onChangeText={(value) => handleReactionConfigChange(fieldKey, value)}
                                    keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'}
                                    autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                                />
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    const renderSummary = () => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 16 }]}>
                Step {getDisplayStepNumber(5)}: Summary of your AREA
            </Text>

            <Card style={{ marginBottom: 16, padding: 16 }}>
                <Text style={[styles.text, { fontWeight: 'bold', marginBottom: 8 }]}>Action:</Text>
                <Text style={styles.text}>{selectedAction?.name}</Text>
                <Text style={[styles.text, { fontSize: 12, color: '#888' }]}>
                    {selectedAction?.description}
                </Text>
            </Card>

            <Card style={{ marginBottom: 16, padding: 16 }}>
                <Text style={[styles.text, { fontWeight: 'bold', marginBottom: 8 }]}>Reaction:</Text>
                <Text style={styles.text}>{selectedReaction?.name}</Text>
                <Text style={[styles.text, { fontSize: 12, color: '#888' }]}>
                    {selectedReaction?.description}
                </Text>
            </Card>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
                <Text style={[styles.text, { textAlign: 'center', marginBottom: 20 }]}>
                    Your AREA is ready to be created!
                </Text>
            </View>
        </ScrollView>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderActionProviderAndSelection();
            case 2:
                return renderActionConfig();
            case 3:
                return renderReactionProviderAndSelection();
            case 4:
                return renderReactionConfig();
            case 5:
                return renderSummary();
            default:
                return renderActionProviderAndSelection();
        }
    };

    const getStepTitle = () => {
        const displayStep = getDisplayStepNumber(currentStep);
        switch (currentStep) {
            case 1: return `Step ${displayStep} - Choose Action`;
            case 2: return `Step ${displayStep} - Configure Action`;
            case 3: return `Step ${displayStep} - Choose Reaction`;
            case 4: return `Step ${displayStep} - Configure Reaction`;
            case 5: return `Step ${displayStep} - Finalize`;
            default: return "Create AREA";
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
        <View style={{ flex: 1, backgroundColor: '#1e1e1e' }}>
            {/* Header */}
            <View style={headerStyle.container}>
                <Text style={headerStyle.title}>New AREA</Text>
                <Text style={headerStyle.subtitle}>{getStepTitle()}</Text>
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Error */}
            {error ? (
                <View style={{ padding: 16 }}>
                    <Text style={[styles.text, { color: '#d32f2f', textAlign: 'center' }]}>
                        {error}
                    </Text>
                </View>
            ) : null}

            {/* Content */}
            <View style={{ flex: 1, padding: 16 }}>
                {renderStepContent()}
            </View>

            {/* Navigation */}
            <View style={navigationStyle.container}>
                {(currentStep > 1 || (currentStep === 1 && actionSubStep === 2) || (currentStep === 3 && reactionSubStep === 2)) && (
                    <Button
                        title="Previous"
                        onPress={prevStep}
                        style={navigationStyle.secondaryButton}
                    />
                )}

                {creating ? (
                    <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
                ) : currentStep === 5 || (currentStep === 4 && getReactionConfigSchema().length === 0) || (currentStep === 3 && reactionSubStep === 2 && getReactionConfigSchema().length === 0 && getActionConfigSchema().length === 0) ? (
                    <Button
                        title="Create AREA"
                        onPress={createArea}
                        style={navigationStyle.primaryButton}
                    />
                ) : (
                    <Button
                        title="Next"
                        onPress={nextStep}
                        style={navigationStyle.primaryButton}
                    />
                )}

                <Button
                    title="Cancel"
                    onPress={() => navigation.goBack()}
                    style={navigationStyle.cancelButton}
                />
            </View>
        </View>
    );
}

// Styles
const stepIndicatorStyle = {
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#444',
    },
    activeCircle: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    completedCircle: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    stepText: {
        color: '#888',
        fontWeight: 'bold',
    },
    activeStepText: {
        color: '#fff',
    },
    line: {
        width: 30,
        height: 2,
        backgroundColor: '#444',
        marginHorizontal: 5,
    },
    completedLine: {
        backgroundColor: '#4CAF50',
    },
};

const headerStyle = {
    container: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
    },
};

const itemCardStyle = {
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selected: {
        borderColor: '#4CAF50',
        backgroundColor: '#1a4a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    provider: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
    },
};

const configFieldStyle = {
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2a2a2a',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
};

const navigationStyle = {
    container: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    primaryButton: {
        flex: 2,
        backgroundColor: '#4CAF50',
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#444',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#d32f2f',
    },
};

const serviceCardStyle = {
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selected: {
        borderColor: '#4CAF50',
        backgroundColor: '#1a4a1a',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
    },
};
