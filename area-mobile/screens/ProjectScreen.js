import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import colors from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIONS = [
    { label: 'Google Calendar', value: 'google_calendar' },
    { label: 'Gmail', value: 'gmail' },
    { label: 'Weather', value: 'weather' },
];
const REACTIONS = [
    { label: 'Spotify Playlist', value: 'spotify_playlist' },
    { label: 'Slack Message', value: 'slack_message' },
    { label: 'Send Email', value: 'send_email' },
];

export default function ProjectScreen({ route }) {
    const { id } = route.params;
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
    useEffect(() => {
        const onChange = ({ window }) => {
            setScreenWidth(window.width);
        };
        const subscription = Dimensions.addEventListener('change', onChange);
        return () => {
            if (subscription?.remove) subscription.remove();
            else Dimensions.removeEventListener('change', onChange);
        };
    }, []);
    const isTablet = screenWidth >= 768;
    const styles = createStyles(isTablet);

    const [workflowName, setWorkflowName] = useState('');
    const [workflowDesc, setWorkflowDesc] = useState('');
    const [links, setLinks] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedReactions, setSelectedReactions] = useState([]);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingLinks, setPendingLinks] = useState([]);

    useEffect(() => {
        AsyncStorage.getItem(`workflow-links-${id}`).then(data => {
            if (data) setLinks(JSON.parse(data));
        });
        AsyncStorage.getItem(`workflow-name-${id}`).then(data => {
            if (data) setWorkflowName(data);
        });
        AsyncStorage.getItem(`workflow-desc-${id}`).then(data => {
            if (data) setWorkflowDesc(data);
        });
    }, [id]);

    const openAddMenu = () => {
        setSelectedAction(null);
        setSelectedReactions([]);
        setModalVisible(true);
    };

    const toggleReaction = (reactionValue) => {
        setSelectedReactions(prev =>
            prev.includes(reactionValue)
                ? prev.filter(r => r !== reactionValue)
                : [...prev, reactionValue]
        );
    };

    const addPendingLinks = () => {
        if (!selectedAction || selectedReactions.length === 0) return;
        const actionObj = ACTIONS.find(a => a.value === selectedAction);
        const newLinks = selectedReactions.map(reactionValue => {
            const reactionObj = REACTIONS.find(r => r.value === reactionValue);
            if (actionObj && reactionObj) {
                return {
                    id: Date.now().toString() + Math.random(),
                    action: actionObj.label,
                    reaction: reactionObj.label
                };
            }
            return null;
        }).filter(Boolean);
        setPendingLinks(prev => [...prev, ...newLinks]);
        setModalVisible(false);
    };

    const validateAllLinks = async () => {
        const newLinks = [...links, ...pendingLinks];
        setLinks(newLinks);
        setPendingLinks([]);
        await AsyncStorage.setItem(`workflow-name-${id}`, workflowName);
        await AsyncStorage.setItem(`workflow-desc-${id}`, workflowDesc);
        await AsyncStorage.setItem(`workflow-links-${id}`, JSON.stringify(newLinks));
        setConfirmVisible(true);
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 150 }}>
                <Text style={styles.title}>Edit Workflow {workflowName}</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Workflow name"
                    placeholderTextColor={colors.textSecondary}
                    value={workflowName}
                    onChangeText={setWorkflowName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Description"
                    placeholderTextColor={colors.textSecondary}
                    value={workflowDesc}
                    onChangeText={setWorkflowDesc}
                />
                <TouchableOpacity style={styles.button} onPress={openAddMenu}>
                    <Text style={styles.buttonText}>Add Action-Reaction</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Action-Reaction Links</Text>
                <View style={{ marginBottom: isTablet ? 30 : 20 }}>
                    {([...links, ...pendingLinks]).length === 0 ? (
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                            No action-reaction links yet.
                        </Text>
                    ) : (
                        Object.entries([...links, ...pendingLinks].reduce((acc, item) => {
                            if (!acc[item.action]) acc[item.action] = [];
                            acc[item.action].push(item.reaction);
                            return acc;
                        }, {})).map(([action, reactions], idx) => (
                            <View key={action + idx} style={styles.linkRowVertical}>
                                <View style={styles.linkCard}>
                                    <Text style={styles.linkCardText}>{action}</Text>
                                </View>

                                <View style={styles.linkLineVertical} />

                                <View style={styles.reactionContainerCard}>
                                    {reactions.map((reaction, rIdx) => (
                                        <View key={rIdx} style={styles.reactionCardNested}>
                                            <Text style={styles.reactionCardText}>{reaction}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.sectionTitle}>Select Action</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                {ACTIONS.map(action => (
                                    <TouchableOpacity
                                        key={action.value}
                                        style={[styles.selectCard, selectedAction === action.value && styles.selectCardSelected]}
                                        onPress={() => setSelectedAction(action.value)}
                                    >
                                        <Text style={styles.selectCardText}>{action.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={styles.sectionTitle}>Select Reactions</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                {REACTIONS.map(reaction => (
                                    <TouchableOpacity
                                        key={reaction.value}
                                        style={[styles.selectCard, selectedReactions.includes(reaction.value) && styles.selectCardSelected]}
                                        onPress={() => toggleReaction(reaction.value)}
                                    >
                                        <Text style={styles.selectCardText}>{reaction.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.button} onPress={addPendingLinks}>
                                    <Text style={styles.buttonText}>Validate</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={confirmVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.sectionTitle}>Validation réussie !</Text>
                            <TouchableOpacity style={styles.button} onPress={() => setConfirmVisible(false)}>
                                <Text style={styles.buttonText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            <TouchableOpacity
                style={[styles.button, { position: 'absolute', bottom: 30, alignSelf: 'center', width: isTablet ? 300 : '80%' }]}
                onPress={validateAllLinks}
            >
                <Text style={styles.buttonText}>Validate All</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (isTablet) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        padding: isTablet ? 60 : 20,
    },
    title: {
        fontSize: isTablet ? 28 : 22,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: isTablet ? 32 : 20,
    },
    input: {
        backgroundColor: colors.cardBgPrimary,
        color: colors.textPrimary,
        borderRadius: 8,
        padding: isTablet ? 20 : 15,
        marginBottom: isTablet ? 20 : 15,
        borderWidth: 1,
        borderColor: 'transparent',
        width: isTablet ? 400 : '80%',
    },
    sectionTitle: {
        fontSize: isTablet ? 24 : 18,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: isTablet ? 18 : 10,
        marginTop: isTablet ? 30 : 20,
    },
    button: {
        backgroundColor: colors.buttonColor,
        paddingVertical: isTablet ? 18 : 14,
        paddingHorizontal: isTablet ? 50 : 30,
        borderRadius: 8,
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: isTablet ? 10 : 5,
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: isTablet ? 20 : 16,
    },
    buttonCancel: {
        backgroundColor: colors.buttonColorDisabled,
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(45,46,46,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 16,
        padding: isTablet ? 40 : 20,
        width: isTablet ? 500 : '90%',
        maxHeight: '80%',
    },
    selectCard: {
        backgroundColor: colors.cardBgSecondary,
        borderRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 28,
        marginRight: 14,
        marginBottom: 6,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    selectCardSelected: {
        backgroundColor: colors.buttonColor,
    },
    selectCardText: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    linkCard: {
        backgroundColor: colors.cardBgSecondary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    linkCardText: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 18,
    },
    linkRowVertical: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 24,
    },
    linkLineVertical: {
        width: 3,
        height: 20,
        backgroundColor: colors.buttonColor,
        marginVertical: 8,
        borderRadius: 2,
    },
    reactionContainerCard: {
        backgroundColor: colors.cardBgSecondary,
        borderRadius: 12,
        padding: 12,
        width: isTablet ? 300 : '90%',
        elevation: 3,
        marginTop: 4,
    },
    reactionCardNested: {
        backgroundColor: '#2E2E2E',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    reactionCardText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});
