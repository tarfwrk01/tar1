import { useOnboarding } from '@/app/context/onboarding';
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
import SingleImageUploader from './SingleImageUploader';

interface Warehouse {
  id: number;
  name: string;
  image: string;
  notes: string;
}

export default function WarehousesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
    name: '',
    image: '[]', // Empty JSON array
    notes: ''
  });
  const { profileData } = useOnboarding();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Warehouses" when the component mounts
  useEffect(() => {
    // Find the Warehouses item in the product sub-items
    const warehousesItem = {
      id: '7',
      name: 'Warehouses'
    };

    // Set it as the selected product
    setSelectedProduct(warehousesItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch warehouses
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
                sql: "SELECT id, name, image, notes FROM warehouses ORDER BY name LIMIT 100"
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
            const warehouseData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                name: row[1].type === 'null' ? '' : row[1].value,
                image: row[2].type === 'null' ? '[]' : row[2].value,
                notes: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed warehouse data:', JSON.stringify(warehouseData, null, 2));
            setWarehouses(warehouseData);
            setFilteredWarehouses(warehouseData);
          } else {
            console.log('No warehouse data found in response');
            setWarehouses([]);
            setFilteredWarehouses([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setWarehouses([]);
          setFilteredWarehouses([]);
        }
      } else {
        console.error('Failed to fetch warehouses:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch warehouses. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching warehouses. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addWarehouse = async () => {
    try {
      if (!newWarehouse.name) {
        Alert.alert('Error', 'Warehouse name is required');
        return;
      }

      setIsLoading(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the request body with direct SQL values
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO warehouses (
                name, image, notes
              ) VALUES (
                '${(newWarehouse.name || '').replace(/'/g, "''")}',
                '${(newWarehouse.image || '[]').replace(/'/g, "''")}',
                '${(newWarehouse.notes || '').replace(/'/g, "''")}'
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
        setNewWarehouse({
          name: '',
          image: '[]',
          notes: ''
        });
        setModalVisible(false);

        // Refresh the warehouses list
        fetchWarehouses();
      } else {
        console.error('Failed to add warehouse:', responseText);
        Alert.alert(
          'Error',
          'Failed to add warehouse. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding warehouse:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the warehouse. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit warehouse function
  const editWarehouse = async () => {
    if (!selectedWarehouse) return;
    
    try {
      if (!selectedWarehouse.name) {
        Alert.alert('Error', 'Warehouse name is required');
        return;
      }

      setIsLoading(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the update SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `UPDATE warehouses SET
                name = '${(selectedWarehouse.name || '').replace(/'/g, "''")}',
                image = '${(selectedWarehouse.image || '[]').replace(/'/g, "''")}',
                notes = '${(selectedWarehouse.notes || '').replace(/'/g, "''")}'
                WHERE id = ${selectedWarehouse.id}`
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
        setSelectedWarehouse(null);
        setEditModalVisible(false);

        // Refresh the warehouses list
        fetchWarehouses();
      } else {
        console.error('Failed to update warehouse:', responseText);
        Alert.alert(
          'Error',
          'Failed to update warehouse. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating warehouse:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the warehouse. Please try again.',
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
      setFilteredWarehouses(warehouses);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      const filtered = warehouses.filter(warehouse => {
        if (!warehouse) return false;
        
        // Normalize searchable fields to lower case strings
        const name = (warehouse.name || '').toLowerCase();
        const notes = (warehouse.notes || '').toLowerCase();
        
        // Check each search term against all fields
        return searchTerms.some(term => 
          name.includes(term) || 
          notes.includes(term)
        );
      });
      
      setFilteredWarehouses(filtered);
    }
  };

  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewWarehouse({
      ...newWarehouse,
      image: imageUrl
    });
  };

  // Handle edit button press
  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse({...warehouse});
    setEditModalVisible(true);
  };
  
  // Handle edit image change
  const handleEditImageChange = (imageUrl: string) => {
    if (selectedWarehouse) {
      setSelectedWarehouse({
        ...selectedWarehouse,
        image: imageUrl
      });
    }
  };

  // Fetch warehouses on component mount
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Render a warehouse item
  const renderWarehouseItem = ({ item }: { item: Warehouse }) => {
    const isMatch = searchQuery.trim() !== '' && 
      (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <TouchableOpacity 
        style={[
          styles.warehouseRow,
          isMatch ? styles.highlightedRow : null
        ]}
        onPress={() => handleEditWarehouse(item)}
      >
        <Text style={styles.warehouseName}>{item.name || 'Untitled Warehouse'}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No warehouses found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchWarehouses}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Warehouses" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search warehouses..."
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
          <Text style={styles.loadingText}>Loading warehouses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredWarehouses}
          renderItem={renderWarehouseItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Warehouse Modal */}
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
              <Text style={styles.modalTitle}>New Warehouse</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addWarehouse}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formGroup, styles.titleInputContainer]}>
              <TextInput
                style={styles.titleInput}
                value={newWarehouse.name}
                onChangeText={(text) => setNewWarehouse({ ...newWarehouse, name: text })}
                placeholder="Warehouse Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.imageTileContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newWarehouse.image || '[]'}
                  onImageChange={handleImageChange}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newWarehouse.notes}
                onChangeText={(text) => setNewWarehouse({ ...newWarehouse, notes: text })}
                placeholder="Add notes about this warehouse..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedWarehouse !== null}
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
              <Text style={styles.modalTitle}>Edit Warehouse</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editWarehouse}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedWarehouse && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.formGroup, styles.titleInputContainer]}>
                <TextInput
                  style={styles.titleInput}
                  value={selectedWarehouse.name}
                  onChangeText={(text) => setSelectedWarehouse({...selectedWarehouse, name: text})}
                  placeholder="Warehouse Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.imageTileContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedWarehouse.image || '[]'}
                    onImageChange={handleEditImageChange}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.notesInput}
                  value={selectedWarehouse.notes}
                  onChangeText={(text) => setSelectedWarehouse({...selectedWarehouse, notes: text})}
                  placeholder="Add notes about this warehouse..."
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
  warehouseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  warehouseName: {
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
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    margin: 0,
    right: 0,
    position: 'absolute',
  },
  saveButtonText: {
    color: '#fff',
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
