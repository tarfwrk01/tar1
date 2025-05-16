import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';

type AIAgent = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const aiAgents: AIAgent[] = [
  {
    id: '1',
    name: 'Product',
    description: 'Product management',
    icon: '📦',
  },
  {
    id: '2',
    name: 'Sales',
    description: 'Sales & CRM',
    icon: '⚡',
  },
  {
    id: '3',
    name: 'Branding',
    description: 'Brand identity & marketing',
    icon: '🚀',
  },
];

export default function AgentsScreen() {
  const router = useRouter();

  const handleProductAgentPress = () => {
    console.log('Product agent selected - navigating to config screen');
    router.push('/(agents)/(products)/config' as any);
  };

  const handleAgentPress = (agent: AIAgent) => {
    // Navigate to the appropriate agent screen based on ID
    switch (agent.id) {
      case '1':
        handleProductAgentPress();
        break;
      case '2':
        console.log('Sales agent selected');
        // Will navigate to sales agent screen when implemented
        break;
      case '3':
        console.log('Branding agent selected');
        // Will navigate to branding agent screen when implemented
        break;
      default:
        console.log('Unknown agent selected');
    }
  };

  const renderAgentItem = ({ item }: { item: AIAgent }) => (
    <TouchableOpacity
      style={styles.agentItem}
      onPress={() => handleAgentPress(item)}
    >
      <View style={styles.agentIconContainer}>
        <Text style={styles.agentIcon}>{item.icon}</Text>
      </View>
      <View style={styles.agentInfo}>
        <Text style={styles.agentName}>{item.name}</Text>
        <Text style={styles.agentDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleBackPress = () => {
    console.log('Navigating back to app index');
    // Use replace for instant transition without animation
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        showBackButton={true}
        onBackPress={handleBackPress}
      />

      <View style={styles.content}>
        <FlatList
          data={aiAgents}
          renderItem={renderAgentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    flex: 1,
    textAlign: 'left',
    marginLeft: 8,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  rightPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  agentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  agentIcon: {
    fontSize: 24,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
  },
});
