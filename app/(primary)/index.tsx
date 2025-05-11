import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';

export default function WorkspaceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TopBar title="Workspace" />
      <ScrollView style={styles.content}>
        <Text style={styles.welcomeText}>Welcome to your workspace!</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
  },
});
