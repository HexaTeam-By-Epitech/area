import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles';
import Card from '../components/Card';
import Button from '../components/Button';

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

    const groupedLinks = [...links, ...pendingLinks].reduce((acc, link) => {
        if (!acc[link.action]) acc[link.action] = [];
        acc[link.action].push(link.reaction);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
                    <Text style={styles.title}>Editing: {workflowName}</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Workflow name"
                        placeholderTextColor="#c3c9d5"
                        value={workflowName}
                        onChangeText={setWorkflowName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Description"
                        placeholderTextColor="#c3c9d5"
                        value={workflowDesc}
                        onChangeText={setWorkflowDesc}
                    />

                    <Button title="Add Action + Reaction" onPress={openAddMenu} />

                    <Text style={styles.sectionTitle}>Action → Reaction Links</Text>

                    {Object.keys(groupedLinks).length === 0 ? (
                        <Text style={styles.text}>No links yet.</Text>
                    ) : (
                        Object.entries(groupedLinks).map(([action, reactions], idx) => (
                            <View key={idx} style={{ width: '100%', alignItems: 'center', marginBottom: 24 }}>
                                <Card style={[styles.card, { marginBottom: 0, alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={[styles.subtitle, { fontSize: 18, marginBottom: 0, textAlign: 'center' }]}>{action}</Text>
                                </Card>
                                {/* Trait vertical avec couleur string */}
                                <View style={{ width: 4, height: 32, backgroundColor: styles.button.backgroundColor || '#2196f3', borderRadius: 2, marginVertical: 4 }} />
                                <Card style={[styles.card, { width: '98%', flexDirection: 'column', alignItems: 'center', marginTop: 0 }]}>
                                    {reactions.map((reaction, rIdx) => (
                                        <Card
                                            key={rIdx}
                                            style={[styles.card, {
                                                width: '98%',
                                                marginVertical: 4,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                paddingVertical: 10
                                            }]}
                                        >
                                            <Text style={[styles.text, { textAlign: 'center', fontSize: 15 }]}>{reaction}</Text>
                                        </Card>
                                    ))}
                                </Card>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    right: 20,
                }}>
                    <Button title="Save" onPress={validateAllLinks} />
                </View>
            </KeyboardAvoidingView>

            {/* Modal - Add Action + Reactions */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: 20,
                }}>
                    <Card style={{ width: '100%' }}>
                        <Text style={styles.title}>Select an Action</Text>
                        {ACTIONS.map(action => (
                            <Button
                                key={action.value}
                                title={action.label}
                                onPress={() => setSelectedAction(action.value)}
                                style={{
                                    backgroundColor: selectedAction === action.value ? '#2196f3' : undefined,
                                }}
                            />
                        ))}

                        <Text style={[styles.subtitle, { marginTop: 16 }]}>Select Reactions</Text>
                        {REACTIONS.map(reaction => (
                            <Button
                                key={reaction.value}
                                title={reaction.label}
                                onPress={() => toggleReaction(reaction.value)}
                                style={{
                                    backgroundColor: selectedReactions.includes(reaction.value) ? '#2196f3' : undefined,
                                }}
                            />
                        ))}

                        <Button title="Add" onPress={addPendingLinks} />
                        <Button title="Cancel" onPress={() => setModalVisible(false)} style={{ backgroundColor: '#d32f2f' }} />
                    </Card>
                </View>
            </Modal>

            {/* Modal - Save Confirmation */}
            <Modal visible={confirmVisible} animationType="fade" transparent>
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)'
                }}>
                    <Card style={{ width: '80%' }}>
                        <Text style={styles.title}>Workflow saved</Text>
                        <Button title="OK" onPress={() => setConfirmVisible(false)} />
                    </Card>
                </View>
            </Modal>
        </View>
    );
}
