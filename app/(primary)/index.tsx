import { StyleSheet, Text, View } from 'react-native';
import ProductContent from '../../components/ProductContent';
import { useProduct } from '../context/product';

export default function WorkspaceScreen() {
  const { selectedProduct } = useProduct();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {selectedProduct ? (
          <ProductContent selectedProduct={selectedProduct} />
        ) : (
          <Text style={styles.welcomeText}>Welcome to your workspace! Select a product from the menu.</Text>
        )}
      </View>
    </View>
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
