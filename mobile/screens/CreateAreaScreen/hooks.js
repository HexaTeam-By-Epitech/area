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

    // New: keep schema state locally; backend provides dedicated endpoints
    const [actionConfigSchema, setActionConfigSchema] = useState([]);
    const [reactionConfigSchema, setReactionConfigSchema] = useState([]);

    // Optional: loading flags for schemas (could be used by UI later)
    const [actionSchemaLoading, setActionSchemaLoading] = useState(false);
    const [reactionSchemaLoading, setReactionSchemaLoading] = useState(false);

    // Sub-steps for action and reaction selection
    const [actionSubStep, setActionSubStep] = useState(1); // 1: provider, 2: action
    const [reactionSubStep, setReactionSubStep] = useState(1); // 1: provider, 2: reaction

    useEffect(() => {
        loadActionsAndReactions();
    }, []);

    // Load placeholders when action is selected
    useEffect(() => {
        if (selectedAction && selectedAction.name) {
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
        try {
            // Prefer fetched schema; fallback to selectedAction if present (legacy)
            if (Array.isArray(actionConfigSchema)) return actionConfigSchema;
            if (!selectedAction || typeof selectedAction !== 'object') {
                return [];
            }
            return selectedAction.configSchema || [];
        } catch (error) {
            console.warn('Error getting action config schema:', error);
            return [];
        }
    };

    const getReactionConfigSchema = () => {
        try {
            if (Array.isArray(reactionConfigSchema)) return reactionConfigSchema;
            if (!selectedReaction || typeof selectedReaction !== 'object') {
                return [];
            }
            return selectedReaction.configSchema || [];
        } catch (error) {
            console.warn('Error getting reaction config schema:', error);
            return [];
        }
    };

    const initializeConfigFromSchema = (schemaArray) => {
        const initialConfig = {};
        if (Array.isArray(schemaArray)) {
            schemaArray.forEach(field => {
                const key = field.key || field.name;
                if (key) {
                    // If defaultValue provided, use it; otherwise empty string
                    initialConfig[key] = field.defaultValue !== undefined ? field.defaultValue : '';
                }
            });
        }
        return initialConfig;
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

    const fetchAndSetActionSchema = async (actionName) => {
        try {
            setActionSchemaLoading(true);
            const res = await apiDirect.get(`/manager/actions/${actionName}/config-schema`);
            const schema = Array.isArray(res.data) ? res.data : [];
            setActionConfigSchema(schema);
            setActionConfig(initializeConfigFromSchema(schema));
        } catch (err) {
            // If endpoint returns 404 or error, assume no config required
            console.warn(`No action config schema for '${actionName}' or failed to load.`, err?.response?.data || err?.message);
            setActionConfigSchema([]);
            setActionConfig({});
        } finally {
            setActionSchemaLoading(false);
        }
    };

    const fetchAndSetReactionSchema = async (reactionName) => {
        try {
            setReactionSchemaLoading(true);
            const res = await apiDirect.get(`/manager/reactions/${reactionName}/config-schema`);
            const schema = Array.isArray(res.data) ? res.data : [];
            setReactionConfigSchema(schema);
            setReactionConfig(initializeConfigFromSchema(schema));
        } catch (err) {
            console.warn(`No reaction config schema for '${reactionName}' or failed to load.`, err?.response?.data || err?.message);
            setReactionConfigSchema([]);
            setReactionConfig({});
        } finally {
            setReactionSchemaLoading(false);
        }
    };

    const selectAction = (action) => {
        setSelectedAction(action);
        // Reset current config and schema before fetching new one
        setActionConfig({});
        setActionConfigSchema([]);
        if (action && action.name) {
            fetchAndSetActionSchema(action.name);
        }
    };

    const selectReaction = (reaction) => {
        setSelectedReaction(reaction);
        // Reset current config and schema before fetching new one
        setReactionConfig({});
        setReactionConfigSchema([]);
        if (reaction && reaction.name) {
            fetchAndSetReactionSchema(reaction.name);
        }
    };

    const createArea = async () => {
        try {
            setCreating(true);

            // Security check before accessing properties
            if (!selectedAction || !selectedReaction) {
                return { success: false, error: 'Please select both an action and a reaction' };
            }

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
        // expose schema loading flags
        isActionSchemaLoading: actionSchemaLoading,
        isReactionSchemaLoading: reactionSchemaLoading,

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
