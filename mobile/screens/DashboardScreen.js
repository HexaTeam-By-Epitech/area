import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Modal,
    TextInput,
    TouchableOpacity
} from 'react-native';
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
        setWorkflows([
            ...workflows,
            {
                id,
                name: newName || `Workflow ${newIds.length}`,
                description: newDesc || 'Description',
            },
        ]);
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

    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Project', { id: item.id })}
            style={{ marginBottom: 12 }}
        >
            <View style={[styles.card, {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
            }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{
                        fontWeight: 'bold',
                        fontSize: 17,
                        color: styles.title.color,
                        marginBottom: 4
                    }}>
                        {item.name}
                    </Text>
                    <Text style={styles.text} numberOfLines={2} ellipsizeMode="tail">
                        {item.description}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => deleteWorkflow(item.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash" size={22} color="#d32f2f" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 32 }]}>
            <Text style={styles.title}>Your Workflows</Text>

            <FlatList
                data={workflows}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{
                    paddingBottom: 100,
                    paddingHorizontal: 20,
                }}
                ListEmptyComponent={
                    <Text style={[styles.text, { textAlign: 'center', marginTop: 32 }]}>
                        No workflow at this time.
                    </Text>
                }
            />

            <Button
                title="Ajouter un Workflow"
                onPress={() => setModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 30,
                    alignSelf: 'center',
                    width: '80%',
                }}
            />

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    paddingHorizontal: 20,
                }}>
                    <Card style={{ width: '100%', maxWidth: 500 }}>
                        <Text style={styles.title}>Create a new workflow</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nom du workflow"
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
                        <Button title="Créer" onPress={addWorkflow} />
                        <Button title="Annuler" onPress={() => setModalVisible(false)} style={{ backgroundColor: '#d32f2f' }} />
                    </Card>
                </View>
            </Modal>
        </View>
    );
}
