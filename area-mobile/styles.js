import { StyleSheet } from 'react-native';
import colors from './screens/colors';

export default StyleSheet.create({
    section: {
        marginBottom: 30,
        width: '100%',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 24,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    bullet: {
        fontSize: 17,
        color: colors.textPrimary,
        marginBottom: 6,
        marginLeft: 12,
    },
    button: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        backgroundColor: colors.buttonColor,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonSecondary: {
        backgroundColor: colors.cardBgSecondary,
        borderWidth: 1,
        borderColor: colors.buttonColor,
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: colors.buttonColor,
    },
    card: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.bgPrimary,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 40,
        color: colors.textPrimary,
    },
    text: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    input: {
        width: '100%',
        padding: 15,
        marginBottom: 15,
        borderRadius: 8,
        backgroundColor: colors.cardBgPrimary,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.buttonColor,
    },
});
