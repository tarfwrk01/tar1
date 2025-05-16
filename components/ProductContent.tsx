import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useOnboarding } from '../app/context/onboarding';
import { ProductSubItem } from '../app/context/product';

interface ProductContentProps {
  selectedProduct: ProductSubItem;
}

// Generic type for different data items
type DataItem = {
  id: number;
  [key: string]: any;
};

export default function ProductContent({ selectedProduct }: ProductContentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  const { profileData } = useOnboarding();

  useEffect(() => {
    if (selectedProduct) {
      fetchData();
    }
  }, [selectedProduct]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Determine the SQL query based on the selected product
      let sql = '';
      switch (selectedProduct.name.toLowerCase()) {
        case 'products':
          sql = "SELECT id, title, price, type FROM products ORDER BY id DESC LIMIT 50";
          break;
        case 'inventory':
          sql = "SELECT i.id, i.sku, i.quantity, i.productId, p.title as productTitle FROM inventory i LEFT JOIN products p ON i.productId = p.id LIMIT 50";
          break;
        case 'categories':
          sql = "SELECT id, name, parent FROM categories ORDER BY name LIMIT 50";
          break;
        case 'collections':
          sql = "SELECT id, name, parent FROM collections ORDER BY name LIMIT 50";
          break;
        case 'vendors':
          sql = "SELECT id, name, notes FROM vendors ORDER BY name LIMIT 50";
          break;
        case 'brands':
          sql = "SELECT id, name, notes FROM brands ORDER BY name LIMIT 50";
          break;
        case 'warehouses':
          sql = "SELECT id, name, notes FROM warehouses ORDER BY name LIMIT 50";
          break;
        case 'stores':
          sql = "SELECT id, name, notes FROM stores ORDER BY name LIMIT 50";
          break;
        case 'tags':
          sql = "SELECT id, name, notes FROM tags ORDER BY name LIMIT 50";
          break;
        case 'metafields':
          sql = "SELECT id, namespace, key, value FROM metafields ORDER BY namespace, key LIMIT 50";
          break;
        case 'options':
          sql = "SELECT id, name, position FROM options ORDER BY position LIMIT 50";
          break;
        case 'media':
          sql = "SELECT id, parentid, type, url, 'order' FROM media ORDER BY 'order' LIMIT 50";
          break;
        default:
          sql = "";
      }

      if (!sql) {
        setIsLoading(false);
        return;
      }

      // Fetch data
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: {
                sql
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.results && result.results[0] && result.results[0].rows) {
        setData(result.results[0].rows);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error(`Error fetching ${selectedProduct.name}:`, error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DataItem }) => {
    // Render different item layouts based on the selected product
    switch (selectedProduct.name.toLowerCase()) {
      case 'products':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.title || 'Untitled Product'}</Text>
            <Text style={styles.itemDetail}>${item.price?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.itemSubDetail}>{item.type || 'No type'}</Text>
          </View>
        );
      case 'inventory':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.sku || 'No SKU'}</Text>
            <Text style={styles.itemDetail}>{item.productTitle || `Product ID: ${item.productId}`}</Text>
            <Text style={styles.itemSubDetail}>Qty: {item.quantity || 0}</Text>
          </View>
        );
      case 'categories':
      case 'collections':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            {item.parent && <Text style={styles.itemSubDetail}>Parent ID: {item.parent}</Text>}
          </View>
        );
      case 'vendors':
      case 'brands':
      case 'warehouses':
      case 'stores':
      case 'tags':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            {item.notes && <Text style={styles.itemSubDetail}>{item.notes}</Text>}
          </View>
        );
      case 'metafields':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.namespace}.{item.key}</Text>
            <Text style={styles.itemSubDetail}>{item.value}</Text>
          </View>
        );
      case 'options':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubDetail}>Position: {item.position}</Text>
          </View>
        );
      case 'media':
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>Media ID: {item.id}</Text>
            <Text style={styles.itemDetail}>Type: {item.type}</Text>
            <Text style={styles.itemSubDetail}>Parent ID: {item.parentid}</Text>
          </View>
        );
      default:
        return (
          <View style={styles.itemContainer}>
            <Text style={styles.itemTitle}>ID: {item.id}</Text>
          </View>
        );
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No {selectedProduct.name.toLowerCase()} found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{selectedProduct.name}</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading {selectedProduct.name.toLowerCase()}...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    flexGrow: 1,
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  itemSubDetail: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
