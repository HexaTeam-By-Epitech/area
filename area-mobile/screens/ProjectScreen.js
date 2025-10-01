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

    // Persistance des liens
    useEffect(() => {
        AsyncStorage.getItem(`workflow-links-${id}`).then(data => {
            if (data) setLinks(JSON.parse(data));
        });
        // Récupération du nom et de la description
        AsyncStorage.getItem(`workflow-name-${id}`).then(data => {
            if (data) setWorkflowName(data);
        });
        AsyncStorage.getItem(`workflow-desc-${id}`).then(data => {
            if (data) setWorkflowDesc(data);
        });
    }, [id]);

    // Ajout d'un état temporaire pour les nouveaux liens
    const [pendingLinks, setPendingLinks] = useState([]);

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
        // Sauvegarde du nom et de la description du workflow
        await AsyncStorage.setItem(`workflow-name-${id}`, workflowName);
        await AsyncStorage.setItem(`workflow-desc-${id}`, workflowDesc);
        await AsyncStorage.setItem(`workflow-links-${id}`, JSON.stringify(newLinks));
        setConfirmVisible(true);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Workflow {workflowName}</Text>
            <TextInput style={styles.input} placeholder="Workflow name" placeholderTextColor={colors.textSecondary} value={workflowName} onChangeText={setWorkflowName} />
            <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.textSecondary} value={workflowDesc} onChangeText={setWorkflowDesc} />
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
                    [...links, ...pendingLinks].map((item, idx) => (
                        <View key={item.id || idx} style={styles.linkRowVertical}>
                            <View style={styles.linkCard}>
                                <Text style={styles.linkCardText}>{item.action}</Text>
                            </View>
                            <View style={styles.linkLineVertical} />
                            <View style={styles.linkCard}>
                                <Text style={styles.linkCardText}>{item.reaction}</Text>
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
            <TouchableOpacity style={[styles.button, {position: 'absolute', bottom: 30, alignSelf: 'center', width: isTablet ? 300 : '80%'}]} onPress={validateAllLinks}>
                <Text style={styles.buttonText}>Validate All</Text>
            </TouchableOpacity>
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
    card: {
        backgroundColor: colors.cardBgSecondary,
        borderRadius: 10,
        padding: isTablet ? 22 : 15,
        marginBottom: isTablet ? 18 : 10,
    },
    cardText: {
        color: colors.textPrimary,
        fontSize: isTablet ? 20 : 16,
        textAlign: 'center',
    },
    action: {
        color: colors.buttonColor,
        fontWeight: '700',
    },
    reaction: {
        color: colors.buttonHover,
        fontWeight: '700',
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
    // Ajout des styles pour les cards liées
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        justifyContent: 'center',
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
    linkLine: {
        width: 40,
        height: 3,
        backgroundColor: colors.buttonColor,
        marginHorizontal: 10,
        borderRadius: 2,
    },
    // Ajout des styles pour affichage vertical
    linkRowVertical: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 18,
        justifyContent: 'center',
    },
    linkLineVertical: {
        width: 3,
        height: 30,
        backgroundColor: colors.buttonColor,
        marginVertical: 6,
        borderRadius: 2,
    },
});
