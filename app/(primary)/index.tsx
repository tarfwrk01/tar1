import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductContent from '../../components/ProductContent';
import TopBar from '../../components/TopBar';
import { useProduct } from '../context/product';

export default function WorkspaceScreen() {
  const { selectedProduct } = useProduct();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TopBar title="Workspace" />
      <View style={styles.content}>
        {selectedProduct ? (
          <ProductContent selectedProduct={selectedProduct} />
        ) : (
          <Text style={styles.welcomeText}>Welcome to your workspace! Select a product from the menu.</Text>
        )}
      </View>
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
