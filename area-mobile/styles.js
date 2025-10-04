import { StyleSheet } from 'react-native';
import colors from './screens/colors';

export default StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.bgPrimary,
    },

    // Typography
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 40,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
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
    text: {
        fontSize: 16,
        color: colors.textSecondary,
    },

    // Inputs
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

    // Buttons
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
        fontWeight: '600',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: colors.buttonColor,
    },

    // Cards
    card: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: 16,
        marginVertical: 8,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    // Ajout pour DashboardScreen
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
    },
    cardCompact: {
        backgroundColor: colors.cardBgPrimary,
        borderRadius: 10,
        padding: 12,
        margin: '2.5%',
        width: '45%',
        minHeight: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Sections
    section: {
        marginBottom: 30,
        width: '100%',
        alignItems: 'center',
    },
});
