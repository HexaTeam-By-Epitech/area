// Mock for @expo/vector-icons
const React = require('react');

const createIconMock = (name) => {
    return (props) => React.createElement('Text', props, name);
};

module.exports = {
    Ionicons: createIconMock('Ionicons'),
    MaterialIcons: createIconMock('MaterialIcons'),
    FontAwesome: createIconMock('FontAwesome'),
    FontAwesome5: createIconMock('FontAwesome5'),
    MaterialCommunityIcons: createIconMock('MaterialCommunityIcons'),
    Entypo: createIconMock('Entypo'),
    AntDesign: createIconMock('AntDesign'),
    Feather: createIconMock('Feather'),
};
