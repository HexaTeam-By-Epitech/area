// Step components for CreateAreaScreen

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import styles from '../../styles';
import Card from '../../components/Card';
import { serviceCardStyle, itemCardStyle, configFieldStyle } from './styles';

export const ActionProviderSelection = ({ 
    getActionProviders, 
    selectedActionProvider, 
    selectActionProvider,
    getDisplayStepNumber 
}) => (
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

export const ActionSelection = ({ 
    actionProviders,
    selectedActionProvider, 
    selectedAction,
    selectAction,
    getDisplayStepNumber 
}) => (
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

export const ReactionProviderSelection = ({ 
    getReactionProviders, 
    selectedReactionProvider, 
    selectReactionProvider,
    getDisplayStepNumber 
}) => (
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

export const ReactionSelection = ({ 
    reactionProviders,
    selectedReactionProvider, 
    selectedReaction,
    selectReaction,
    getDisplayStepNumber 
}) => (
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

export const ActionConfig = ({ 
    getActionConfigSchema,
    selectedAction,
    actionConfig,
    handleActionConfigChange,
    getDisplayStepNumber 
}) => {
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

export const ReactionConfig = ({ 
    getReactionConfigSchema,
    selectedReaction,
    reactionConfig,
    handleReactionConfigChange,
    actionPlaceholders,
    getDisplayStepNumber 
}) => {
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

export const Summary = ({ selectedAction, selectedReaction, getDisplayStepNumber }) => (
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
