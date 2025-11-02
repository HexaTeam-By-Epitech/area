// Styles for CreateAreaScreen components

export const stepIndicatorStyle = {
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#444',
    },
    activeCircle: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    completedCircle: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    stepText: {
        color: '#888',
        fontWeight: 'bold',
    },
    activeStepText: {
        color: '#fff',
    },
    line: {
        width: 30,
        height: 2,
        backgroundColor: '#444',
        marginHorizontal: 5,
    },
    completedLine: {
        backgroundColor: '#4CAF50',
    },
};

export const headerStyle = {
    container: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
    },
};

export const itemCardStyle = {
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selected: {
        borderColor: '#4CAF50',
        backgroundColor: '#1a4a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    provider: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
    },
};

export const configFieldStyle = {
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2a2a2a',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
};

export const navigationStyle = {
    container: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    primaryButton: {
        flex: 2,
        backgroundColor: '#4CAF50',
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#444',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#d32f2f',
    },
};

export const serviceCardStyle = {
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selected: {
        borderColor: '#4CAF50',
        backgroundColor: '#1a4a1a',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
    },
};
