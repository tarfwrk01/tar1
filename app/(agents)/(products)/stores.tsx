import { useProduct } from '@/app/context/product';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../../components/TopBar';
import { useTursoCredentialsLazy } from '../../hooks/useTursoCredentials';
import SingleImageUploader from './SingleImageUploader';

interface Store {
  id: number;
  name: string;
  image: string;
  notes: string;
}

export default function StoresScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [newStore, setNewStore] = useState<Partial<Store>>({
    name: '',
    image: '[]', // Empty JSON array
    notes: ''
  });
  const { getCredentials } = useTursoCredentialsLazy();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Stores" when the component mounts
  useEffect(() => {
    // Find the Stores item in the product sub-items
    const storesItem = {
      id: '8',
      name: 'Stores'
    };

    // Set it as the selected product
    setSelectedProduct(storesItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch stores
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
                sql: "SELECT id, name, image, notes FROM stores ORDER BY name LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      console.log('Fetch response status:', response.status);
      console.log('Fetch response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed data:', JSON.stringify(data, null, 2));

          if (data.results &&
              data.results[0] &&
              data.results[0].response &&
              data.results[0].response.result &&
              data.results[0].response.result.rows) {

            // Extract the rows from the nested structure
            const rows = data.results[0].response.result.rows;
            console.log('Raw rows:', JSON.stringify(rows, null, 2));

            // Transform the rows into a more usable format
            const storeData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                name: row[1].type === 'null' ? '' : row[1].value,
                image: row[2].type === 'null' ? '[]' : row[2].value,
                notes: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed store data:', JSON.stringify(storeData, null, 2));
            setStores(storeData);
            setFilteredStores(storeData);
          } else {
            console.log('No store data found in response');
            setStores([]);
            setFilteredStores([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setStores([]);
          setFilteredStores([]);
        }
      } else {
        console.error('Failed to fetch stores:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch stores. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching stores. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addStore = async () => {
    try {
      if (!newStore.name) {
        Alert.alert('Error', 'Store name is required');
        return;
      }

      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the request body with direct SQL values
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO stores (
                name, image, notes
              ) VALUES (
                '${(newStore.name || '').replace(/'/g, "''")}',
                '${(newStore.image || '[]').replace(/'/g, "''")}',
                '${(newStore.notes || '').replace(/'/g, "''")}'
              )`
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('API URL:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Send the request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Get the response text
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (response.ok) {
        // Reset form and close modal
        setNewStore({
          name: '',
          image: '[]',
          notes: ''
        });
        setModalVisible(false);

        // Refresh the stores list
        fetchStores();
      } else {
        console.error('Failed to add store:', responseText);
        Alert.alert(
          'Error',
          'Failed to add store. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding store:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the store. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit store function
  const editStore = async () => {
    if (!selectedStore) return;

    try {
      if (!selectedStore.name) {
        Alert.alert('Error', 'Store name is required');
        return;
      }

      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the update SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `UPDATE stores SET
                name = '${(selectedStore.name || '').replace(/'/g, "''")}',
                image = '${(selectedStore.image || '[]').replace(/'/g, "''")}',
                notes = '${(selectedStore.notes || '').replace(/'/g, "''")}'
                WHERE id = ${selectedStore.id}`
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('Edit API URL:', apiUrl);
      console.log('Edit Request body:', JSON.stringify(requestBody, null, 2));

      // Send the request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Get the response text
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (response.ok) {
        // Reset form and close modal
        setSelectedStore(null);
        setEditModalVisible(false);

        // Refresh the stores list
        fetchStores();
      } else {
        console.error('Failed to update store:', responseText);
        Alert.alert(
          'Error',
          'Failed to update store. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating store:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the store. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setFilteredStores(stores);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);

      const filtered = stores.filter(store => {
        if (!store) return false;

        // Normalize searchable fields to lower case strings
        const name = (store.name || '').toLowerCase();
        const notes = (store.notes || '').toLowerCase();

        // Check each search term against all fields
        return searchTerms.some(term =>
          name.includes(term) ||
          notes.includes(term)
        );
      });

      setFilteredStores(filtered);
    }
  };

  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewStore({
      ...newStore,
      image: imageUrl
    });
  };

  // Handle edit button press
  const handleEditStore = (store: Store) => {
    setSelectedStore({...store});
    setEditModalVisible(true);
  };

  // Handle edit image change
  const handleEditImageChange = (imageUrl: string) => {
    if (selectedStore) {
      setSelectedStore({
        ...selectedStore,
        image: imageUrl
      });
    }
  };

  // Fetch stores on component mount
  useEffect(() => {
    fetchStores();
  }, []);

  // Render a store item
  const renderStoreItem = ({ item }: { item: Store }) => {
    const isMatch = searchQuery.trim() !== '' &&
      (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <TouchableOpacity
        style={[
          styles.storeRow,
          isMatch ? styles.highlightedRow : null
        ]}
        onPress={() => handleEditStore(item)}
      >
        <Text style={styles.storeName}>{item.name || 'Untitled Store'}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No stores found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchStores}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Stores" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Light divider added below search */}
      <View style={styles.searchDivider} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          renderItem={renderStoreItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Store Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>New Store</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addStore}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formGroup, styles.titleInputContainer]}>
              <TextInput
                style={styles.titleInput}
                value={newStore.name}
                onChangeText={(text) => setNewStore({ ...newStore, name: text })}
                placeholder="Store Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.imageTileContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newStore.image || '[]'}
                  onImageChange={handleImageChange}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newStore.notes}
                onChangeText={(text) => setNewStore({ ...newStore, notes: text })}
                placeholder="Add notes about this store..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Store Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedStore !== null}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>Edit Store</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editStore}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedStore && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.formGroup, styles.titleInputContainer]}>
                <TextInput
                  style={styles.titleInput}
                  value={selectedStore.name}
                  onChangeText={(text) => setSelectedStore({...selectedStore, name: text})}
                  placeholder="Store Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.imageTileContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedStore.image || '[]'}
                    onImageChange={handleEditImageChange}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.notesInput}
                  value={selectedStore.notes}
                  onChangeText={(text) => setSelectedStore({...selectedStore, notes: text})}
                  placeholder="Add notes about this store..."
                  placeholderTextColor="#999"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginLeft: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
    paddingLeft: 4,
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 0,
    paddingTop: 8,
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0066CC',
    flex: 1,
    backgroundColor: 'transparent',
  },
  separator: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  refreshButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 8,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: '#0066CC',
    borderRadius: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    width: 50,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imageTileContainer: {
    marginBottom: 24,
    width: '100%',
  },
  imageTile: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  modalContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  formGroup: {
    marginBottom: 24,
  },
  titleInputContainer: {
    marginTop: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
    padding: 0,
    marginBottom: 24,
    borderWidth: 0,
    backgroundColor: '#fff',
  },
  notesInput: {
    fontSize: 16,
    color: '#333',
    padding: 0,
    borderWidth: 0,
    minHeight: 100,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  }
});
