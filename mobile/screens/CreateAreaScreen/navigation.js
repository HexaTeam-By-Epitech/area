// Navigation utilities for CreateAreaScreen

import { Alert } from 'react-native';

export const useNavigation = (state, actions) => {
    const {
        currentStep,
        actionSubStep,
        reactionSubStep,
        selectedActionProvider,
        selectedReactionProvider,
        selectedAction,
        selectedReaction,
        actionConfig,
        reactionConfig,
        getActionConfigSchema,
        getReactionConfigSchema,
        // New: loading flags exposed by hook
        isActionSchemaLoading = false,
        isReactionSchemaLoading = false,
    } = state;

    const {
        setCurrentStep,
        setActionSubStep,
        setReactionSubStep
    } = actions;

    // Helpers to safely access schemas
    const safeGetActionConfigSchema = () => {
        try {
            return getActionConfigSchema() || [];
        } catch (error) {
            return [];
        }
    };

    const safeGetReactionConfigSchema = () => {
        try {
            return getReactionConfigSchema() || [];
        } catch (error) {
            return [];
        }
    };

    const hasActionConfig = () => isActionSchemaLoading || (safeGetActionConfigSchema().length > 0);
    const hasReactionConfig = () => isReactionSchemaLoading || (safeGetReactionConfigSchema().length > 0);

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
            if (isActionSchemaLoading) {
                Alert.alert('Please wait', 'Loading action configuration...');
                return false;
            }
            const schema = safeGetActionConfigSchema();
            for (const field of schema) {
                const key = field.key || field.name;
                if (field.required && !actionConfig[key]) {
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
            if (isReactionSchemaLoading) {
                Alert.alert('Please wait', 'Loading reaction configuration...');
                return false;
            }
            const schema = safeGetReactionConfigSchema();
            for (const field of schema) {
                const key = field.key || field.name;
                if (field.required && !reactionConfig[key]) {
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
            if (currentStep === 1) {
                // If an action is selected and it has or may have config, go to step 2
                if (selectedAction && hasActionConfig()) {
                    setCurrentStep(2);
                    return;
                }
                // Otherwise skip to reaction selection
                if (!hasActionConfig()) {
                    setCurrentStep(3);
                    setReactionSubStep(1); // Reset reaction sub-step
                    return;
                }
            }

            if (currentStep === 3) {
                // If a reaction is selected and it has or may have config, go to step 4
                if (selectedReaction && hasReactionConfig()) {
                    setCurrentStep(4);
                    return;
                }
                // Otherwise skip to summary
                if (!hasReactionConfig()) {
                    setCurrentStep(5);
                    return;
                }
            }

            // Generic advance
            setCurrentStep(currentStep + 1);
            if (currentStep === 2) {
                setReactionSubStep(1); // Reset reaction sub-step when moving to reaction selection
            }
        }
    };

    const prevStep = () => {
        // Handle sub-steps within main steps
        if (currentStep === 1 && actionSubStep === 2) {
            setActionSubStep(1);
            return;
        }

        if (currentStep === 3 && reactionSubStep === 2) {
            setReactionSubStep(1);
            return;
        }

        // Main step navigation
        if (currentStep === 3 && !hasActionConfig()) {
            setCurrentStep(1); // Skip action config if not needed
            setActionSubStep(2); // Go back to action selection
        } else if (currentStep === 5 && !hasReactionConfig()) {
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

    // Get the actual step number for display (takes into account skipped steps)
    const getDisplayStepNumber = (actualStep) => {
        let displayStep = 1;

        // Step 1: Action provider + selection
        if (actualStep === 1) return 1;

        // Step 2: Action config - count if action has config (or still loading)
        if (actualStep === 2) return 2;
        if (actualStep >= 3 && hasActionConfig()) displayStep = 3;
        else if (actualStep >= 3) displayStep = 2;

        // Step 3: Reaction provider + selection
        if (actualStep === 3) return displayStep;

        // Step 4: Reaction config - count if reaction has config (or still loading)
        if (actualStep === 4) return displayStep + 1;
        if (actualStep >= 5 && hasReactionConfig()) displayStep += 2;
        else if (actualStep >= 5) displayStep += 1;

        // Step 5: Summary
        if (actualStep === 5) return displayStep;

        return displayStep;
    };

    const getTotalDisplaySteps = () => {
        let total = 3; // Always have: action selection, reaction selection, summary
        if (hasActionConfig()) total++;
        if (hasReactionConfig()) total++;
        return total;
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

    return {
        nextStep,
        prevStep,
        getDisplayStepNumber,
        getTotalDisplaySteps,
        getStepTitle
    };
};
