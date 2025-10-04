import React from 'react';
import { View, Text, useWindowDimensions, FlatList } from 'react-native';
import Card from '../components/Card';

export default function HomeScreen({ route }) {
    const { email } = route.params || {};
    const { width } = useWindowDimensions();

    const gap = 16;
    const numColumns = 2;
    const totalGap = gap * (numColumns + 1); // gaps à gauche, entre, à droite
    const cardWidth = (width - totalGap) / numColumns;

    const data = [
        { title: 'Mock name', subtitle: 'Mock sub', value: 0 },
        { title: 'Mock name', subtitle: 'Mock sub', value: 0 },
        { title: 'Mock name', subtitle: 'Mock sub', value: 0 },
        { title: 'Mock name', subtitle: 'Mock sub', value: 0 },
    ];

    const renderItem = ({ item, index }) => (
        <View
            style={{
                width: cardWidth,
                marginLeft: index % numColumns === 0 ? gap : gap / 2,
                marginRight: index % numColumns === numColumns - 1 ? gap : gap / 2,
                marginBottom: gap,
            }}
        >
            <Card
                style={{
                    flex: 1,
                    backgroundColor: '#2c2c2c',
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 12,
                }}
            >
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>{item.title}</Text>
                <Text style={{ fontSize: 14, color: '#aaa', marginBottom: 12 }}>{item.subtitle}</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>{item.value}</Text>
            </Card>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#1e1e1e', paddingTop: 40 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 24 }}>
                Beautiful dashboard
            </Text>

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                numColumns={numColumns}
                scrollEnabled={false}
            />
        </View>
    );
}
