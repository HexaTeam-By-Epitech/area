import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles';
import Card from '../components/Card';
import Button from '../components/Button';

export default function DashboardScreen({ navigation }) {
    const [workflows, setWorkflows] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('workflow-ids').then(data => {
            const ids = data ? JSON.parse(data) : [];
            Promise.all(
                ids.map(async id => {
                    const name = await AsyncStorage.getItem(`workflow-name-${id}`) || `Workflow ${id}`;
                    const description = await AsyncStorage.getItem(`workflow-desc-${id}`) || `Description ${id}`;
                    return { id, name, description };
                })
            ).then(setWorkflows);
        });
    }, []);

    const addWorkflow = async () => {
        const id = Date.now().toString() + Math.random();
        const ids = workflows.map(w => w.id);
        const newIds = [...ids, id];
        await AsyncStorage.setItem('workflow-ids', JSON.stringify(newIds));
        await AsyncStorage.setItem(`workflow-name-${id}`, newName || `Workflow ${newIds.length}`);
        await AsyncStorage.setItem(`workflow-desc-${id}`, newDesc || 'Description');
        setWorkflows([...workflows, { id, name: newName || `Workflow ${newIds.length}`, description: newDesc || 'Description' }]);
        setModalVisible(false);
        setNewName('');
        setNewDesc('');
    };

    const deleteWorkflow = async (id) => {
        const newWorkflows = workflows.filter(w => w.id !== id);
        const newIds = newWorkflows.map(w => w.id);
        await AsyncStorage.setItem('workflow-ids', JSON.stringify(newIds));
        await AsyncStorage.removeItem(`workflow-name-${id}`);
        await AsyncStorage.removeItem(`workflow-desc-${id}`);
        await AsyncStorage.removeItem(`workflow-links-${id}`);
        setWorkflows(newWorkflows);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Workflows</Text>
            <FlatList
                data={workflows}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <Card style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Button
                                title={item.name}
                                style={{ flex: 1, backgroundColor: 'transparent', color: styles.title.color, fontWeight: 'bold', fontSize: 18 }}
                                onPress={() => navigation.navigate('Project', { id: item.id })}
                            />
                            <Button
                                title={<Ionicons name="trash" size={24} color="#d32f2f" />}
                                style={{ backgroundColor: 'transparent', marginLeft: 10 }}
                                onPress={() => deleteWorkflow(item.id)}
                            />
                        </View>
                        <Text style={styles.text}>{item.description}</Text>
                    </Card>
                )}
                ListEmptyComponent={<Text style={styles.text}>No workflow yet.</Text>}
            />
            <Button title="Add Workflow" onPress={() => setModalVisible(true)} style={{ position: 'absolute', bottom: 30, alignSelf: 'center', width: '80%' }} />
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Card style={{ width: '90%' }}>
                        <Text style={styles.title}>Create a new workflow</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Workflow name"
                            placeholderTextColor="#c3c9d5"
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            placeholderTextColor="#c3c9d5"
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />
                        <Button title="Create" onPress={addWorkflow} />
                        <Button title="Cancel" onPress={() => setModalVisible(false)} style={{ backgroundColor: '#d32f2f' }} />
                    </Card>
                </View>
            </Modal>
        </View>
    );
}
