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
        getReactionConfigSchema
    } = state;

    const {
        setCurrentStep,
        setActionSubStep,
        setReactionSubStep,
        setSelectedAction,
        setSelectedReaction,
        setActionConfig,
        setReactionConfig
    } = actions;

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
