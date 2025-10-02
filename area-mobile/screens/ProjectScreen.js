import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, ScrollView } from 'react-native';
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

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
                <Text style={styles.title}>Edit Workflow {workflowName}</Text>
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
                <Button title="Add Action-Reaction" onPress={openAddMenu} />
                <Text style={[styles.title, { fontSize: 18, marginTop: 24 }]}>Action-Reaction Links</Text>
                <View style={{ marginBottom: 20 }}>
                    {([...links, ...pendingLinks]).length === 0 ? (
                        <Text style={styles.text}>No action-reaction links yet.</Text>
                    ) : (
                        Object.entries([...links, ...pendingLinks].reduce((acc, item) => {
                            if (!acc[item.action]) acc[item.action] = [];
                            acc[item.action].push(item.reaction);
                            return acc;
                        }, {})).map(([action, reactions], idx) => (
                            <Card key={action + idx} style={{ marginBottom: 8 }}>
                                <Text style={styles.title}>{action}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {reactions.map((reaction, rIdx) => (
                                        <Card key={rIdx} style={{ margin: 4, padding: 8 }}>
                                            <Text style={styles.text}>{reaction}</Text>
                                        </Card>
                                    ))}
                                </View>
                            </Card>
                        ))
                    )}
                </View>
                <Button title="Save" onPress={validateAllLinks} />
            </ScrollView>
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Card style={{ width: '90%' }}>
                        <Text style={styles.title}>Select Action</Text>
                        {ACTIONS.map(action => (
                            <Button
                                key={action.value}
                                title={action.label}
                                onPress={() => setSelectedAction(action.value)}
                                style={{ backgroundColor: selectedAction === action.value ? '#2196f3' : undefined }}
                            />
                        ))}
                        <Text style={[styles.title, { fontSize: 18, marginTop: 16 }]}>Select Reactions</Text>
                        {REACTIONS.map(reaction => (
                            <Button
                                key={reaction.value}
                                title={reaction.label}
                                onPress={() => toggleReaction(reaction.value)}
                                style={{ backgroundColor: selectedReactions.includes(reaction.value) ? '#2196f3' : undefined }}
                            />
                        ))}
                        <Button title="Add" onPress={addPendingLinks} />
                        <Button title="Cancel" onPress={() => setModalVisible(false)} style={{ backgroundColor: '#d32f2f' }} />
                    </Card>
                </View>
            </Modal>
            <Modal visible={confirmVisible} animationType="fade" transparent>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Card style={{ width: '80%' }}>
                        <Text style={styles.title}>Workflow saved!</Text>
                        <Button title="OK" onPress={() => setConfirmVisible(false)} />
                    </Card>
                </View>
            </Modal>
        </View>
    );
}
