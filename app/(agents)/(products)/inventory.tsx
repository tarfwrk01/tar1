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

type InventoryItem = {
  id: number;
  productId: number;
  sku: string;
  image: string;
  option1: string;
  option2: string;
  option3: string;
  reorderlevel: number;
  reorderqty: number;
  warehouse: string;
  expiry: string;
  batchno: string;
  quantity: number;
  cost: number;
  price: number;
  margin: number;
  saleprice: number;
};

export default function InventoryScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [newInventoryItem, setNewInventoryItem] = useState<Partial<InventoryItem>>({
    productId: 1,
    sku: '',
    image: '[]', // Empty JSON array
    option1: '',
    option2: '',
    option3: '',
    reorderlevel: 0,
    reorderqty: 0,
    warehouse: '',
    expiry: '',
    batchno: '',
    quantity: 1,
    cost: 0,
    price: 0,
    margin: 0,
    saleprice: 0,
  });
  const { getCredentials } = useTursoCredentialsLazy();

  const fetchInventory = async () => {
    try {
      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create request body with direct SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "SELECT id, productId, sku, quantity, warehouse, cost, price FROM inventory ORDER BY id DESC LIMIT 100"
            }
          }
        ]
      };

      console.log('Fetching inventory from:', apiUrl);
      console.log('Fetch request body:', JSON.stringify(requestBody, null, 2));

      // Fetch inventory
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
            const inventoryData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                productId: parseInt(row[1].value),
                sku: row[2].type === 'null' ? '' : row[2].value,
                quantity: row[3].type === 'null' ? 0 : parseInt(row[3].value),
                warehouse: row[4].type === 'null' ? '' : row[4].value,
                cost: row[5].type === 'null' ? 0 : parseFloat(row[5].value),
                price: row[6].type === 'null' ? 0 : parseFloat(row[6].value)
              };
            });

            console.log('Transformed inventory data:', JSON.stringify(inventoryData, null, 2));
            setInventory(inventoryData);
            setFilteredInventory(inventoryData);
          } else {
            console.log('No inventory data found in response');
            setInventory([]);
            setFilteredInventory([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setInventory([]);
          setFilteredInventory([]);
        }
      } else {
        console.error('Failed to fetch inventory:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch inventory. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching inventory. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addInventoryItem = async () => {
    try {
      if (!newInventoryItem.sku || !newInventoryItem.sku.trim()) {
        Alert.alert('Error', 'SKU is required');
        return;
      }

      if (!newInventoryItem.productId || newInventoryItem.productId <= 0) {
        Alert.alert('Error', 'Valid Product ID is required');
        return;
      }

      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the request body with direct SQL values instead of parameters
      const sqlQuery = `INSERT INTO inventory (
        productId, sku, image, option1, option2, option3,
        reorderlevel, reorderqty, warehouse, expiry, batchno,
        quantity, cost, price, margin, saleprice
      ) VALUES (
        ${newInventoryItem.productId || 1},
        '${(newInventoryItem.sku || '').replace(/'/g, "''")}',
        '${(newInventoryItem.image || '').replace(/'/g, "''")}',
        '${(newInventoryItem.option1 || '').replace(/'/g, "''")}',
        '${(newInventoryItem.option2 || '').replace(/'/g, "''")}',
        '${(newInventoryItem.option3 || '').replace(/'/g, "''")}',
        ${newInventoryItem.reorderlevel || 0},
        ${newInventoryItem.reorderqty || 0},
        '${(newInventoryItem.warehouse || '').replace(/'/g, "''")}',
        '${(newInventoryItem.expiry || '').replace(/'/g, "''")}',
        '${(newInventoryItem.batchno || '').replace(/'/g, "''")}',
        ${newInventoryItem.quantity || 1},
        ${newInventoryItem.cost || 0},
        ${newInventoryItem.price || 0},
        ${newInventoryItem.margin || 0},
        ${newInventoryItem.saleprice || 0}
      )`;

      console.log('Generated SQL Query:', sqlQuery);

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: sqlQuery
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('API URL:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Create inventory item
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
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed response data:', JSON.stringify(data, null, 2));

          // Check if the operation was successful
          if (data.results && data.results[0] && data.results[0].response) {
            console.log('Inventory item created successfully');

            // Reset form and close modal
            setNewInventoryItem({
              productId: 1,
              sku: '',
              image: '[]',
              option1: '',
              option2: '',
              option3: '',
              reorderlevel: 0,
              reorderqty: 0,
              warehouse: '',
              expiry: '',
              batchno: '',
              quantity: 1,
              cost: 0,
              price: 0,
              margin: 0,
              saleprice: 0,
            });
            setModalVisible(false);

            // Refresh inventory list
            fetchInventory();

            Alert.alert('Success', 'Inventory item added successfully');
          } else {
            console.error('Unexpected response structure:', data);
            Alert.alert(
              'Error',
              'Unexpected response from server. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.log('Raw response text:', responseText);
          Alert.alert(
            'Error',
            'Error parsing server response. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('Failed to add inventory item:', responseText);
        Alert.alert(
          'Error',
          `Failed to add inventory item. Status: ${response.status}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the inventory item. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateInventoryItem = async () => {
    try {
      if (!selectedInventoryItem) {
        Alert.alert('Error', 'No inventory item selected');
        return;
      }



      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create the request body with direct SQL values for UPDATE
      const sqlQuery = `UPDATE inventory SET
        image = '${(selectedInventoryItem.image || '').replace(/'/g, "''")}',
        reorderlevel = ${selectedInventoryItem.reorderlevel || 0},
        reorderqty = ${selectedInventoryItem.reorderqty || 0},
        warehouse = '${(selectedInventoryItem.warehouse || '').replace(/'/g, "''")}',
        expiry = '${(selectedInventoryItem.expiry || '').replace(/'/g, "''")}',
        batchno = '${(selectedInventoryItem.batchno || '').replace(/'/g, "''")}',
        quantity = ${selectedInventoryItem.quantity || 1},
        cost = ${selectedInventoryItem.cost || 0},
        price = ${selectedInventoryItem.price || 0},
        margin = ${selectedInventoryItem.margin || 0},
        saleprice = ${selectedInventoryItem.saleprice || 0}
        WHERE id = ${selectedInventoryItem.id}`;

      console.log('Generated UPDATE SQL Query:', sqlQuery);

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: sqlQuery
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('API URL:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Update inventory item
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
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed response data:', JSON.stringify(data, null, 2));

          // Check if the operation was successful
          if (data.results && data.results[0] && data.results[0].response) {
            console.log('Inventory item updated successfully');

            // Close modal and reset selection
            setEditModalVisible(false);
            setSelectedInventoryItem(null);

            // Refresh inventory list
            fetchInventory();
          } else {
            console.error('Unexpected response structure:', data);
            Alert.alert(
              'Error',
              'Unexpected response from server. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.log('Raw response text:', responseText);
          Alert.alert(
            'Error',
            'Error parsing server response. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('Failed to update inventory item:', responseText);
        Alert.alert(
          'Error',
          `Failed to update inventory item. Status: ${response.status}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the inventory item. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Start with all inventory or filtered by warehouse if a filter is active
    let baseInventory = inventory;
    if (activeFilter) {
      baseInventory = inventory.filter(item => item.warehouse === activeFilter);
    }

    // Then apply search filter
    if (text.trim() === '') {
      setFilteredInventory(baseInventory);
    } else {
      const filtered = baseInventory.filter(item =>
        item.sku?.toLowerCase().includes(text.toLowerCase()) ||
        item.warehouse?.toLowerCase().includes(text.toLowerCase()) ||
        item.batchno?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredInventory(filtered);
    }
  };

  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewInventoryItem({
      ...newInventoryItem,
      image: imageUrl
    });
  };

  // Fetch inventory on component mount
  useEffect(() => {
    fetchInventory();
  }, []);

  // Handle edit inventory item
  const handleEditInventoryItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setEditModalVisible(true);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={styles.inventoryItem}
      onPress={() => handleEditInventoryItem(item)}
    >
      <View style={styles.inventoryRow}>
        <Text style={styles.inventoryTitle}>{item.sku || 'No SKU'}</Text>
        <Text style={styles.inventoryQuantity}>{item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No inventory items found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchInventory}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Import the useProduct hook
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Inventory" when the component mounts
  useEffect(() => {
    // Find the Inventory item in the product sub-items
    const inventoryItem = {
      id: '2',
      name: 'Inventory'
    };

    // Set it as the selected product
    setSelectedProduct(inventoryItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Inventory" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter-outline" size={24} color={activeFilter ? "#0066CC" : "#000"} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Inventory Item Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Inventory Item</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addInventoryItem}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Basic Information Tile */}
            <View style={styles.formTile}>
              <View style={styles.tileHeader}>
                <Ionicons name="cube-outline" size={20} color="#0066CC" />
                <Text style={styles.tileTitle}>Basic Information</Text>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Product ID *</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.productId?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, productId: parseInt(text) || 1})}
                    placeholder="Product ID"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>SKU *</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.sku}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, sku: text})}
                    placeholder="Stock Keeping Unit"
                  />
                </View>
              </View>

              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Product Image</Text>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={newInventoryItem.image || '[]'}
                    onImageChange={handleImageChange}
                  />
                </View>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Warehouse</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.warehouse}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, warehouse: text})}
                    placeholder="Warehouse location"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Batch Number</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.batchno}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, batchno: text})}
                    placeholder="Batch number"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={newInventoryItem.expiry}
                  onChangeText={(text) => setNewInventoryItem({...newInventoryItem, expiry: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Product Options Tile */}
            <View style={styles.formTile}>
              <View style={styles.tileHeader}>
                <Ionicons name="options-outline" size={20} color="#0066CC" />
                <Text style={styles.tileTitle}>Product Options</Text>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Option 1</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.option1}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, option1: text})}
                    placeholder="e.g., Size"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Option 2</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.option2}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, option2: text})}
                    placeholder="e.g., Color"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Option 3</Text>
                <TextInput
                  style={styles.input}
                  value={newInventoryItem.option3}
                  onChangeText={(text) => setNewInventoryItem({...newInventoryItem, option3: text})}
                  placeholder="e.g., Material"
                />
              </View>
            </View>

            {/* Stock Management Tile */}
            <View style={styles.formTile}>
              <View style={styles.tileHeader}>
                <Ionicons name="layers-outline" size={20} color="#0066CC" />
                <Text style={styles.tileTitle}>Stock Management</Text>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.quantity?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, quantity: parseInt(text) || 1})}
                    placeholder="Current quantity"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Reorder Level</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.reorderlevel?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, reorderlevel: parseInt(text) || 0})}
                    placeholder="Min stock level"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Reorder Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={newInventoryItem.reorderqty?.toString()}
                  onChangeText={(text) => setNewInventoryItem({...newInventoryItem, reorderqty: parseInt(text) || 0})}
                  placeholder="Quantity to reorder"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Pricing Tile */}
            <View style={styles.formTile}>
              <View style={styles.tileHeader}>
                <Ionicons name="cash-outline" size={20} color="#0066CC" />
                <Text style={styles.tileTitle}>Pricing</Text>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Cost *</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.cost?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, cost: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.price?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, price: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.tileRow}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Sale Price</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.saleprice?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, saleprice: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Margin</Text>
                  <TextInput
                    style={styles.input}
                    value={newInventoryItem.margin?.toString()}
                    onChangeText={(text) => setNewInventoryItem({...newInventoryItem, margin: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Inventory Item Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedInventoryItem !== null}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              {selectedInventoryItem?.sku || 'Edit Inventory Item'}
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={updateInventoryItem}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedInventoryItem && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              {/* Basic Information Tiles */}
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}>
                  <Text style={styles.orgTileLabel}>Warehouse</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.warehouse}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, warehouse: text})}
                    placeholder="Enter warehouse"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Batch Number</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.batchno}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, batchno: text})}
                    placeholder="Enter batch"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.expiry}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, expiry: text})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Stock Management Tiles */}
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}>
                  <Text style={styles.orgTileLabel}>Quantity</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.quantity?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, quantity: parseInt(text) || 1})}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Reorder Level</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.reorderlevel?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, reorderlevel: parseInt(text) || 0})}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Reorder Quantity</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.reorderqty?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, reorderqty: parseInt(text) || 0})}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Pricing Tiles */}
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}>
                  <Text style={styles.orgTileLabel}>Cost</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.cost?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, cost: parseFloat(text) || 0})}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Price</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.price?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, price: parseFloat(text) || 0})}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Sale Price</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.saleprice?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, saleprice: parseFloat(text) || 0})}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Margin</Text>
                  <TextInput
                    style={styles.tileInput}
                    value={selectedInventoryItem.margin?.toString()}
                    onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, margin: parseFloat(text) || 0})}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptions}>
              <Text style={styles.filterSectionTitle}>Filter by Warehouse</Text>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter(null);
                  setFilteredInventory(inventory);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Show All</Text>
                {activeFilter === null && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginHorizontal: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
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
  inventoryItem: {
    padding: 16,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  inventoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  inventoryQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inventorySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  inventoryPrice: {
    fontSize: 14,
    color: '#0066CC',
  },
  // Modal header styles
  headerSpacer: {
    width: 48,
    height: 48,
  },
  // Tab content styles
  tabContent: {
    padding: 16,
  },
  // Organization tiles styles
  orgTilesContainer: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    marginHorizontal: -16,
    marginTop: 0,
  },
  tile: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  orgTileSingle: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  orgTileLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'center',
  },
  tileInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    minWidth: 80,
    padding: 0,
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
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
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '80%',
    maxWidth: 320,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  filterOptions: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterText: {
    fontSize: 16,
    color: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  backButton: {
    padding: 12,
    height: 48,
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  formField: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
  // Tile-based form styles
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formTile: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfField: {
    flex: 0.48,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageTile: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
});
