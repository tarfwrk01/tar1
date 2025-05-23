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

interface Metafield {
  id: number;
  parentid: number | null;
  title: string;
  value: string;
}

export default function MetafieldsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [metafields, setMetafields] = useState<Metafield[]>([]);
  const [filteredMetafields, setFilteredMetafields] = useState<Metafield[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [parentMetafieldModalVisible, setParentMetafieldModalVisible] = useState(false);
  const [selectedParentMetafield, setSelectedParentMetafield] = useState<Metafield | null>(null);
  const [selectedMetafield, setSelectedMetafield] = useState<Metafield | null>(null);
  const [newMetafield, setNewMetafield] = useState<Partial<Metafield>>({
    title: '',
    value: '',
    parentid: null
  });
  const { profileData } = useOnboarding();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Metafields" when the component mounts
  useEffect(() => {
    const metafieldsItem = {
      id: '10',
      name: 'Metafields'
    };
    setSelectedProduct(metafieldsItem);

    // Clean up when component unmounts
    return () => {
      setSelectedProduct(null);
    };
  }, []);

  const fetchMetafields = async () => {
    try {
      setIsLoading(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch metafields
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
                sql: "SELECT id, parentid, title, value FROM metafields ORDER BY title LIMIT 100"
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
            const metafieldData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                parentid: row[1].type === 'null' ? null : parseInt(row[1].value),
                title: row[2].type === 'null' ? '' : row[2].value,
                value: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed metafield data:', JSON.stringify(metafieldData, null, 2));
            setMetafields(metafieldData);
            setFilteredMetafields(metafieldData);
          } else {
            console.log('No metafield data found in response');
            setMetafields([]);
            setFilteredMetafields([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setMetafields([]);
          setFilteredMetafields([]);
        }
      } else {
        console.error('Failed to fetch metafields:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch metafields. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching metafields:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching metafields. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addMetafield = async () => {
    try {
      if (!newMetafield.title) {
        Alert.alert('Error', 'Metafield title is required');
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
              sql: `INSERT INTO metafields (
                parentid, title, value
              ) VALUES (
                ${newMetafield.parentid === null ? 'NULL' : Number(newMetafield.parentid)},
                '${(newMetafield.title || '').replace(/'/g, "''")}',
                '${(newMetafield.value || '').replace(/'/g, "''")}'
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
        setNewMetafield({
          title: '',
          value: '',
          parentid: null
        });
        setSelectedParentMetafield(null);
        setModalVisible(false);

        // Refresh the metafields list
        fetchMetafields();
      } else {
        console.error('Failed to add metafield:', responseText);
        Alert.alert(
          'Error',
          'Failed to add metafield. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding metafield:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the metafield. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit metafield function
  const editMetafield = async () => {
    if (!selectedMetafield) return;
    
    try {
      if (!selectedMetafield.title) {
        Alert.alert('Error', 'Metafield title is required');
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
              sql: `UPDATE metafields SET
                title = '${(selectedMetafield.title || '').replace(/'/g, "''")}',
                value = '${(selectedMetafield.value || '').replace(/'/g, "''")}',
                parentid = ${selectedMetafield.parentid === null ? 'NULL' : Number(selectedMetafield.parentid)}
                WHERE id = ${selectedMetafield.id}`
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
        setSelectedMetafield(null);
        setSelectedParentMetafield(null);
        setEditModalVisible(false);

        // Refresh the metafields list
        fetchMetafields();
      } else {
        console.error('Failed to update metafield:', responseText);
        Alert.alert(
          'Error',
          'Failed to update metafield. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating metafield:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the metafield. Please try again.',
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
      setFilteredMetafields(metafields);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      const filtered = metafields.filter(metafield => {
        if (!metafield) return false;
        
        // Normalize searchable fields to lower case strings
        const title = (metafield.title || '').toLowerCase();
        const value = (metafield.value || '').toLowerCase();
        
        // Check each search term against all fields
        return searchTerms.some(term => 
          title.includes(term) || 
          value.includes(term)
        );
      });
      
      setFilteredMetafields(filtered);
    }
  };

  // Handle parent metafield selection
  const handleParentMetafieldSelect = (metafield: Metafield) => {
    setSelectedParentMetafield(metafield);
    setNewMetafield({
      ...newMetafield,
      parentid: metafield.id
    });
    setParentMetafieldModalVisible(false);
  };

  // Reset parent metafield
  const resetParentMetafield = () => {
    setSelectedParentMetafield(null);
    setNewMetafield({
      ...newMetafield,
      parentid: null
    });
  };

  // Handle edit button press
  const handleEditMetafield = (metafield: Metafield) => {
    setSelectedMetafield({...metafield});
    
    // Set the parent metafield if it exists
    if (metafield.parentid !== null) {
      const parentMetafield = metafields.find(m => m.id === metafield.parentid);
      if (parentMetafield) {
        setSelectedParentMetafield(parentMetafield);
      } else {
        setSelectedParentMetafield(null);
      }
    } else {
      setSelectedParentMetafield(null);
    }
    
    setEditModalVisible(true);
  };
  
  // Handle parent metafield selection for edit
  const handleEditParentMetafieldSelect = (metafield: Metafield) => {
    setSelectedParentMetafield(metafield);
    if (selectedMetafield) {
      setSelectedMetafield({
        ...selectedMetafield,
        parentid: metafield.id
      });
    }
    setParentMetafieldModalVisible(false);
  };
  
  // Reset parent metafield for edit
  const resetEditParentMetafield = () => {
    setSelectedParentMetafield(null);
    if (selectedMetafield) {
      setSelectedMetafield({
        ...selectedMetafield,
        parentid: null
      });
    }
  };

  // Fetch metafields on component mount
  useEffect(() => {
    fetchMetafields();
  }, []);

  // Update selected parent metafield when metafields change
  useEffect(() => {
    if (newMetafield.parentid && metafields.length > 0) {
      const parent = metafields.find(m => m.id === newMetafield.parentid);
      if (parent) {
        setSelectedParentMetafield(parent);
      }
    }
  }, [metafields, newMetafield.parentid]);

  // Get parent metafields and organize children under them
  const getOrganizedMetafields = () => {
    let metafieldsToDisplay;
    
    // If we're searching, show all metafields that match regardless of hierarchy
    if (searchQuery.trim() !== '') {
      // Find all parent IDs of matched metafields to ensure they're shown
      const parentIdsToInclude = new Set<number | null>();
      
      // Add all matched metafields
      filteredMetafields.forEach(metafield => {
        // Include this metafield's parent chain
        let current = metafield;
        while (current.parentid !== null) {
          parentIdsToInclude.add(current.parentid);
          const parent = metafields.find(m => m.id === current.parentid);
          if (!parent) break;
          current = parent;
        }
      });
      
      // Get all metafields that should be shown in the list
      metafieldsToDisplay = metafields.filter(m => 
        // Include if it's in filtered results or if it's a necessary parent
        filteredMetafields.some(fm => fm.id === m.id) || 
        parentIdsToInclude.has(m.id)
      );
    } else {
      // Not searching, use normal filtered metafields
      metafieldsToDisplay = filteredMetafields;
    }
    
    // First, identify root metafields (no parent)
    const rootMetafields = metafieldsToDisplay.filter(m => m.parentid === null);
    
    // Create a map to hold sub-metafields for each parent
    const childrenMap = new Map<number, Metafield[]>();
    
    // Group children by parent ID
    metafieldsToDisplay.forEach(metafield => {
      if (metafield.parentid !== null) {
        const children = childrenMap.get(metafield.parentid) || [];
        children.push(metafield);
        childrenMap.set(metafield.parentid, children);
      }
    });
    
    // Return the organized structure
    return { rootMetafields, childrenMap };
  };

  const { rootMetafields, childrenMap } = getOrganizedMetafields();

  // Render a root metafield with its children
  const renderMetafieldWithChildren = ({ item }: { item: Metafield }) => {
    const children = childrenMap.get(item.id) || [];
    const isMatch = searchQuery.trim() !== '' && 
      (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (item.value || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <View style={styles.metafieldGroup}>
        {/* Parent metafield */}
        <TouchableOpacity 
          style={[
            styles.parentMetafieldRow,
            isMatch ? styles.highlightedRow : null
          ]}
          onPress={() => handleEditMetafield(item)}
        >
          <View style={styles.metafieldInfo}>
            <Text style={styles.metafieldTitle}>{item.title || 'Untitled Metafield'}</Text>
            <Text style={styles.metafieldValue}>{item.value}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Children/sub-metafields */}
        {children.length > 0 && (
          <View style={styles.childrenContainer}>
            {children.map((child) => {
              // Get grandchildren for this child
              const grandChildren = childrenMap.get(child.id) || [];
              const isChildMatch = searchQuery.trim() !== '' && 
                (child.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (child.value || '').toLowerCase().includes(searchQuery.toLowerCase()));
              
              return (
                <View key={child.id}>
                  <TouchableOpacity 
                    style={[
                      styles.childMetafieldRow,
                      isChildMatch ? styles.highlightedRow : null
                    ]}
                    onPress={() => handleEditMetafield(child)}
                  >
                    <View style={styles.metafieldInfo}>
                      <Text style={styles.childMetafieldTitle}>{child.title}</Text>
                      <Text style={styles.childMetafieldValue}>{child.value}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Show grandchildren if they exist */}
                  {grandChildren.length > 0 && (
                    <View style={styles.grandchildrenContainer}>
                      {grandChildren.map((grandChild) => {
                        const isGrandChildMatch = searchQuery.trim() !== '' && 
                          (grandChild.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (grandChild.value || '').toLowerCase().includes(searchQuery.toLowerCase()));
                          
                        return (
                          <TouchableOpacity 
                            key={grandChild.id}
                            style={[
                              styles.grandchildMetafieldRow,
                              isGrandChildMatch ? styles.highlightedRow : null
                            ]}
                            onPress={() => handleEditMetafield(grandChild)}
                          >
                            <View style={styles.metafieldInfo}>
                              <Text style={styles.grandchildMetafieldTitle}>{grandChild.title}</Text>
                              <Text style={styles.grandchildMetafieldValue}>{grandChild.value}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No metafields found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMetafields}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Get the depth of a metafield in the hierarchy
  const getMetafieldDepth = (metafieldId: number | null, depthMap: Map<number, number> = new Map(), visited: Set<number> = new Set()): number => {
    // Base case: root metafield (null parent) has depth 0
    if (metafieldId === null) return 0;
    
    // Cycle detection
    if (visited.has(metafieldId)) {
      console.warn(`Circular reference detected in metafields hierarchy at ID: ${metafieldId}`);
      return 0; // Break the cycle
    }
    
    // If we've already calculated this metafield's depth, return it
    if (depthMap.has(metafieldId)) return depthMap.get(metafieldId)!;
    
    // Add this ID to the visited set
    visited.add(metafieldId);
    
    // Find the metafield object
    const metafield = metafields.find(m => m.id === metafieldId);
    if (!metafield) return 0;
    
    // Calculate depth as 1 + parent's depth
    const depth = 1 + getMetafieldDepth(metafield.parentid, depthMap, visited);
    depthMap.set(metafieldId, depth);
    
    // Remove this ID from visited set when done with this branch
    visited.delete(metafieldId);
    
    return depth;
  };

  // Check if selecting a metafield as parent would exceed max depth or create a cycle
  const wouldExceedMaxDepth = (metafieldId: number): boolean => {
    // Explicitly setting max depth to 2 (for 3 levels total: parent + child + grandchild)
    const MAX_DEPTH = 2; 
    
    // Special case: if we're in edit mode and this is the selected metafield ID,
    // it can't be a parent of itself
    if (selectedMetafield && selectedMetafield.id === metafieldId) {
      return true;
    }
    
    // Calculate current depth of the metafield
    const currentDepth = getMetafieldDepth(metafieldId);
    
    // If the current depth + 1 (for the new child) > MAX_DEPTH, it would exceed
    return currentDepth > MAX_DEPTH;
  };

  // Detect and prevent circular reference in parent selection
  const wouldCreateCycle = (parentId: number): boolean => {
    // If we're in add mode (no selected metafield), can't create a cycle
    if (!selectedMetafield) {
      return false;
    }
    
    const childId = selectedMetafield.id;
    let currentId = parentId;
    const visited = new Set<number>();
    
    // Walk up the ancestor chain
    while (currentId !== null) {
      // If we find the child ID in the ancestors, it would create a cycle
      if (currentId === childId) {
        return true;
      }
      
      // Avoid infinite loops due to existing cycles
      if (visited.has(currentId)) {
        return true;
      }
      
      visited.add(currentId);
      
      // Find the parent of the current metafield
      const current = metafields.find(m => m.id === currentId);
      if (!current || current.parentid === null) {
        break;
      }
      
      currentId = current.parentid;
    }
    
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Metafields" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search metafields..."
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
          <Text style={styles.loadingText}>Loading metafields...</Text>
        </View>
      ) : (
        <FlatList
          data={rootMetafields}
          renderItem={renderMetafieldWithChildren}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Metafield Modal */}
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
              <Text style={styles.modalTitle}>New Metafield</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addMetafield}
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
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.titleInput}
                value={newMetafield.title}
                onChangeText={(text) => setNewMetafield({ ...newMetafield, title: text })}
                placeholder="Metafield Title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Value</Text>
              <TextInput
                style={styles.valueInput}
                value={newMetafield.value}
                onChangeText={(text) => setNewMetafield({ ...newMetafield, value: text })}
                placeholder="Metafield Value"
                placeholderTextColor="#999"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Parent Metafield</Text>
              <TouchableOpacity
                style={styles.parentSelector}
                onPress={() => setParentMetafieldModalVisible(true)}
              >
                {selectedParentMetafield ? (
                  <View style={styles.selectedParentContainer}>
                    <Text style={styles.selectedParentText}>
                      {selectedParentMetafield.title}
                    </Text>
                    <TouchableOpacity 
                      style={styles.clearParentButton}
                      onPress={resetParentMetafield}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.parentPlaceholder}>Select a parent metafield (optional)</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Metafield Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedMetafield !== null}
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
              <Text style={styles.modalTitle}>Edit Metafield</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editMetafield}
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

          {selectedMetafield && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={selectedMetafield.title}
                  onChangeText={(text) => setSelectedMetafield({...selectedMetafield, title: text})}
                  placeholder="Metafield Title"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Value</Text>
                <TextInput
                  style={styles.valueInput}
                  value={selectedMetafield.value}
                  onChangeText={(text) => setSelectedMetafield({...selectedMetafield, value: text})}
                  placeholder="Metafield Value"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Parent Metafield</Text>
                <TouchableOpacity
                  style={styles.parentSelector}
                  onPress={() => setParentMetafieldModalVisible(true)}
                >
                  {selectedParentMetafield ? (
                    <View style={styles.selectedParentContainer}>
                      <Text style={styles.selectedParentText}>
                        {selectedParentMetafield.title}
                      </Text>
                      <TouchableOpacity 
                        style={styles.clearParentButton}
                        onPress={resetEditParentMetafield}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.parentPlaceholder}>Select a parent metafield (optional)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Parent Metafield Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={parentMetafieldModalVisible}
        onRequestClose={() => setParentMetafieldModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <TouchableOpacity
              onPress={() => setParentMetafieldModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.parentModalTitle}>Parent Metafield</Text>
          </View>

          <FlatList
            data={metafields.filter(m => {
              // Only show root-level metafields (no parent) and metafields with depth < 2
              if (m.parentid !== null && getMetafieldDepth(m.id) >= 2) {
                return false;
              }
              
              // When editing, don't show the current metafield as a parent option
              // Also check if selecting this metafield would create a cycle
              if (selectedMetafield) {
                // Don't show the metafield itself
                if (m.id === selectedMetafield.id) return false;
                
                // Check if this would create a cycle
                if (wouldCreateCycle(m.id)) return false;
              }
              
              // Check if this would exceed max depth
              return !wouldExceedMaxDepth(m.id);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.parentMetafieldItem}
                onPress={() => {
                  if (selectedMetafield) {
                    handleEditParentMetafieldSelect(item);
                  } else {
                    handleParentMetafieldSelect(item);
                  }
                }}
              >
                <Text style={styles.parentMetafieldTitle}>{item.title}</Text>
                <Text style={styles.parentMetafieldValue}>{item.value}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentMetafieldDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No metafields available as parents</Text>
              </View>
            )}
          />
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
  metafieldGroup: {
    marginBottom: 0,
  },
  parentMetafieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  metafieldInfo: {
    flex: 1,
  },
  metafieldTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0066CC',
    flex: 1,
    backgroundColor: 'transparent',
  },
  metafieldValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  childrenContainer: {
    marginLeft: 0,
  },
  childMetafieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  childMetafieldTitle: {
    fontSize: 16,
    color: '#444',
    fontWeight: '400',
  },
  childMetafieldValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  grandchildrenContainer: {
    marginLeft: 16,
  },
  grandchildMetafieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  grandchildMetafieldTitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '300',
  },
  grandchildMetafieldValue: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
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
  modalContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  titleInput: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  valueInput: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    minHeight: 100,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  parentSelector: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  selectedParentContainer: {
    padding: 4,
  },
  selectedParentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  clearParentButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  parentPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  parentModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  parentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  parentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  parentMetafieldItem: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  parentMetafieldTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  parentMetafieldValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  parentMetafieldDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff',
  },
});
