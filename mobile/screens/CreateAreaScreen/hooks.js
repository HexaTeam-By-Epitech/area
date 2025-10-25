// Custom hooks for CreateAreaScreen logic

import { useState, useEffect } from 'react';
import { apiDirect } from '../../utils/api';

export const useCreateAreaLogic = () => {
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

    const createArea = async () => {
        try {
            setCreating(true);

            const payload = {
                actionName: selectedAction.name,
                reactionName: selectedReaction.name,
                actionConfig,
                reactionConfig
            };

            await apiDirect.post('/manager/areas', payload);
            return { success: true };
        } catch (err) {
            console.error('Failed to create area:', err);

            const errorMessage = err.response?.data?.message ||
                                err.response?.data?.error ||
                                'Failed to create AREA';

            return { success: false, error: errorMessage };
        } finally {
            setCreating(false);
        }
    };

    return {
        // State
        actionProviders,
        reactionProviders,
        loading,
        creating,
        error,
        currentStep,
        selectedActionProvider,
        selectedReactionProvider,
        selectedAction,
        selectedReaction,
        actionConfig,
        reactionConfig,
        actionPlaceholders,
        actionSubStep,
        reactionSubStep,

        // Setters
        setCurrentStep,
        setActionSubStep,
        setReactionSubStep,

        // Functions
        getActionProviders,
        getReactionProviders,
        getActionConfigSchema,
        getReactionConfigSchema,
        handleActionConfigChange,
        handleReactionConfigChange,
        selectActionProvider,
        selectReactionProvider,
        selectAction,
        selectReaction,
        createArea
    };
};
