import React from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import styles from '../styles';
import Button from '../components/Button';
import { useCreateAreaLogic } from './CreateAreaScreen/hooks';
import { useNavigation } from './CreateAreaScreen/navigation';
import { StepIndicator } from './CreateAreaScreen/StepIndicator';
import {
    ActionProviderSelection,
    ActionSelection,
    ReactionProviderSelection,
    ReactionSelection,
    ActionConfig,
    ReactionConfig,
    Summary
} from './CreateAreaScreen/steps';
import { headerStyle, navigationStyle } from './CreateAreaScreen/styles';

export default function CreateAreaScreen({ navigation }) {
    const logic = useCreateAreaLogic();

    const nav = useNavigation(
        {
            currentStep: logic.currentStep,
            actionSubStep: logic.actionSubStep,
            reactionSubStep: logic.reactionSubStep,
            selectedActionProvider: logic.selectedActionProvider,
            selectedReactionProvider: logic.selectedReactionProvider,
            selectedAction: logic.selectedAction,
            selectedReaction: logic.selectedReaction,
            actionConfig: logic.actionConfig,
            reactionConfig: logic.reactionConfig,
            getActionConfigSchema: logic.getActionConfigSchema,
            getReactionConfigSchema: logic.getReactionConfigSchema
        },
        {
            setCurrentStep: logic.setCurrentStep,
            setActionSubStep: logic.setActionSubStep,
            setReactionSubStep: logic.setReactionSubStep
        }
    );

    const renderActionProviderAndSelection = () => {
        if (logic.actionSubStep === 1) {
            return (
                <ActionProviderSelection
                    getActionProviders={logic.getActionProviders}
                    selectedActionProvider={logic.selectedActionProvider}
                    selectActionProvider={logic.selectActionProvider}
                    getDisplayStepNumber={nav.getDisplayStepNumber}
                />
            );
        } else {
            return (
                <ActionSelection
                    actionProviders={logic.actionProviders}
                    selectedActionProvider={logic.selectedActionProvider}
                    selectedAction={logic.selectedAction}
                    selectAction={logic.selectAction}
                    getDisplayStepNumber={nav.getDisplayStepNumber}
                />
            );
        }
    };

    const renderReactionProviderAndSelection = () => {
        if (logic.reactionSubStep === 1) {
            return (
                <ReactionProviderSelection
                    getReactionProviders={logic.getReactionProviders}
                    selectedReactionProvider={logic.selectedReactionProvider}
                    selectReactionProvider={logic.selectReactionProvider}
                    getDisplayStepNumber={nav.getDisplayStepNumber}
                />
            );
        } else {
            return (
                <ReactionSelection
                    reactionProviders={logic.reactionProviders}
                    selectedReactionProvider={logic.selectedReactionProvider}
                    selectedReaction={logic.selectedReaction}
                    selectReaction={logic.selectReaction}
                    getDisplayStepNumber={nav.getDisplayStepNumber}
                />
            );
        }
    };

    const renderStepContent = () => {
        switch (logic.currentStep) {
            case 1:
                return renderActionProviderAndSelection();
            case 2:
                return (
                    <ActionConfig
                        getActionConfigSchema={logic.getActionConfigSchema}
                        selectedAction={logic.selectedAction}
                        actionConfig={logic.actionConfig}
                        handleActionConfigChange={logic.handleActionConfigChange}
                        getDisplayStepNumber={nav.getDisplayStepNumber}
                        isLoading={logic.isActionSchemaLoading}
                        notionDatabases={logic.notionDatabases}
                        loadingNotionDatabases={logic.loadingNotionDatabases}
                        loadNotionDatabaseSchema={logic.loadNotionDatabaseSchema}
                    />
                );
            case 3:
                return renderReactionProviderAndSelection();
            case 4:
                return (
                    <ReactionConfig
                        getReactionConfigSchema={logic.getReactionConfigSchema}
                        selectedReaction={logic.selectedReaction}
                        reactionConfig={logic.reactionConfig}
                        handleReactionConfigChange={logic.handleReactionConfigChange}
                        actionPlaceholders={logic.actionPlaceholders}
                        getDisplayStepNumber={nav.getDisplayStepNumber}
                        isLoading={logic.isReactionSchemaLoading}
                        notionDatabases={logic.notionDatabases}
                        loadingNotionDatabases={logic.loadingNotionDatabases}
                        loadNotionDatabaseSchema={logic.loadNotionDatabaseSchema}
                    />
                );
            case 5:
                return (
                    <Summary
                        selectedAction={logic.selectedAction}
                        selectedReaction={logic.selectedReaction}
                        getDisplayStepNumber={nav.getDisplayStepNumber}
                    />
                );
            default:
                return renderActionProviderAndSelection();
        }
    };

    const handleCreateArea = async () => {
        // Check that we have both an action and a reaction selected
        if (!logic.selectedAction || !logic.selectedReaction) {
            Alert.alert('Error', 'Please select both an action and a reaction before creating the AREA');
            return;
        }

        // Validate required action config fields
        const actionSchema = logic.getActionConfigSchema();
        for (const field of actionSchema) {
            const key = field.key || field.name;
            if (field.required && !logic.actionConfig[key]) {
                Alert.alert('Error', `Please fill in the required action field: ${field.label || field.name}`);
                return;
            }
        }

        // Validate required reaction config fields
        const reactionSchema = logic.getReactionConfigSchema();
        for (const field of reactionSchema) {
            const key = field.key || field.name;
            if (field.required && !logic.reactionConfig[key]) {
                Alert.alert('Error', `Please fill in the required reaction field: ${field.label || field.name}`);
                return;
            }
        }

        const result = await logic.createArea();
        if (result.success) {
            Alert.alert('Success', 'AREA created successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } else {
            Alert.alert('Error', result.error);
        }
    };

    // Function to determine if we can create the AREA
    const canCreateArea = () => {
        return logic.currentStep === 5 && logic.selectedAction && logic.selectedReaction;
    };

    if (logic.loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.text, { marginTop: 16 }]}>Loading...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#1e1e1e' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={headerStyle.container}>
                <Text style={headerStyle.title}>New AREA</Text>
                <Text style={headerStyle.subtitle}>{nav.getStepTitle()}</Text>
            </View>

            {/* Step Indicator */}
            <StepIndicator
                currentDisplayStep={nav.getDisplayStepNumber(logic.currentStep)}
                totalSteps={nav.getTotalDisplaySteps()}
            />

            {/* Error */}
            {logic.error ? (
                <View style={{ padding: 16 }}>
                    <Text style={[styles.text, { color: '#d32f2f', textAlign: 'center' }]}>
                        {logic.error}
                    </Text>
                </View>
            ) : null}

            {/* Content */}
            <View style={{ flex: 1, padding: 16 }}>
                {renderStepContent()}
            </View>

            {/* Navigation */}
            <View style={navigationStyle.container}>
                {(logic.currentStep > 1 || (logic.currentStep === 1 && logic.actionSubStep === 2) || (logic.currentStep === 3 && logic.reactionSubStep === 2)) && (
                    <Button
                        title="Previous"
                        onPress={nav.prevStep}
                        style={navigationStyle.secondaryButton}
                    />
                )}

                {logic.creating ? (
                    <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
                ) : canCreateArea() ? (
                    <Button
                        title="Create AREA"
                        onPress={handleCreateArea}
                        style={navigationStyle.primaryButton}
                    />
                ) : (
                    <Button
                        title="Next"
                        onPress={nav.nextStep}
                        style={navigationStyle.primaryButton}
                    />
                )}

                <Button
                    title="Cancel"
                    onPress={() => navigation.goBack()}
                    style={navigationStyle.cancelButton}
                />
            </View>
        </KeyboardAvoidingView>
    );
}
