import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput } from 'react-native';
import colors from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
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

    const [workflows, setWorkflows] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Charge la liste des workflows dynamiquement
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

    // Ajout d'un workflow
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

    // Suppression d'un workflow
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
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Project', { id: item.id })}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <Text style={styles.cardDesc}>{item.description}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteWorkflow(item.id)} style={{ marginLeft: 10 }}>
                                <Ionicons name="trash" size={28} color={colors.buttonColorError} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No workflow yet.</Text>}
            />
            <TouchableOpacity style={[styles.button, {position: 'absolute', bottom: 30, alignSelf: 'center', width: isTablet ? 300 : '80%'}]} onPress={() => setModalVisible(true)}>
                <Text style={styles.buttonText}>Add Workflow</Text>
            </TouchableOpacity>
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.sectionTitle}>Create a new workflow</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Workflow name"
                            placeholderTextColor={colors.textSecondary}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            placeholderTextColor={colors.textSecondary}
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.button} onPress={addWorkflow}>
                                <Text style={styles.buttonText}>Validate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
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
        fontSize: isTablet ? 32 : 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: isTablet ? 32 : 20,
    },
    card: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: isTablet ? 30 : 20,
        marginBottom: isTablet ? 22 : 15,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: isTablet ? 22 : 18,
    },
    cardDesc: {
        color: colors.textSecondary,
        fontSize: isTablet ? 18 : 14,
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
    input: {
        backgroundColor: colors.cardBgPrimary,
        color: colors.textPrimary,
        borderRadius: 8,
        padding: isTablet ? 20 : 15,
        marginBottom: isTablet ? 20 : 15,
        borderWidth: 1,
        borderColor: 'transparent',
        width: isTablet ? 400 : '80%',
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: isTablet ? 24 : 18,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: isTablet ? 18 : 10,
        marginTop: isTablet ? 30 : 20,
        textAlign: 'center',
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
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
});
