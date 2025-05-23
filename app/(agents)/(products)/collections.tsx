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

interface Collection {
  id: number;
  name: string;
  image: string;
  notes: string;
  parent: number | null;
}

export default function CollectionsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [parentCollectionModalVisible, setParentCollectionModalVisible] = useState(false);
  const [selectedParentCollection, setSelectedParentCollection] = useState<Collection | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({
    name: '',
    image: '[]', // Empty JSON array
    notes: '',
    parent: null
  });
  const { profileData } = useOnboarding();

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch collections
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
                sql: "SELECT id, name, image, notes, parent FROM collections ORDER BY name LIMIT 100"
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
            const collectionData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                name: row[1].type === 'null' ? '' : row[1].value,
                image: row[2].type === 'null' ? '[]' : row[2].value,
                notes: row[3].type === 'null' ? '' : row[3].value,
                parent: row[4].type === 'null' ? null : parseInt(row[4].value)
              };
            });

            console.log('Transformed collection data:', JSON.stringify(collectionData, null, 2));
            setCollections(collectionData);
            setFilteredCollections(collectionData);
          } else {
            console.log('No collection data found in response');
            setCollections([]);
            setFilteredCollections([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setCollections([]);
          setFilteredCollections([]);
        }
      } else {
        console.error('Failed to fetch collections:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch collections. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching collections. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addCollection = async () => {
    try {
      if (!newCollection.name) {
        Alert.alert('Error', 'Collection name is required');
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

      // Create the request body with direct SQL values instead of parameters
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO collections (
                name, image, notes, parent
              ) VALUES (
                '${(newCollection.name || '').replace(/'/g, "''")}',
                '${(newCollection.image || '[]').replace(/'/g, "''")}',
                '${(newCollection.notes || '').replace(/'/g, "''")}',
                ${newCollection.parent === null ? 'NULL' : Number(newCollection.parent)}
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
        setNewCollection({
          name: '',
          image: '[]',
          notes: '',
          parent: null
        });
        setSelectedParentCollection(null);
        setModalVisible(false);

        // Refresh the collections list
        fetchCollections();
      } else {
        console.error('Failed to add collection:', responseText);
        Alert.alert(
          'Error',
          'Failed to add collection. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding collection:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the collection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit collection function
  const editCollection = async () => {
    if (!selectedCollection) return;
    
    try {
      if (!selectedCollection.name) {
        Alert.alert('Error', 'Collection name is required');
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
              sql: `UPDATE collections SET
                name = '${(selectedCollection.name || '').replace(/'/g, "''")}',
                image = '${(selectedCollection.image || '[]').replace(/'/g, "''")}',
                notes = '${(selectedCollection.notes || '').replace(/'/g, "''")}',
                parent = ${selectedCollection.parent === null ? 'NULL' : Number(selectedCollection.parent)}
                WHERE id = ${selectedCollection.id}`
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
        setSelectedCollection(null);
        setSelectedParentCollection(null);
        setEditModalVisible(false);

        // Refresh the collections list
        fetchCollections();
      } else {
        console.error('Failed to update collection:', responseText);
        Alert.alert(
          'Error',
          'Failed to update collection. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the collection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input - enhanced for full text search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setFilteredCollections(collections);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      const filtered = collections.filter(collection => {
        // Skip collections that don't have any searchable content
        if (!collection) return false;
        
        // Normalize searchable fields to lower case strings
        const name = (collection.name || '').toLowerCase();
        const notes = (collection.notes || '').toLowerCase();
        
        // Check each search term against all fields
        return searchTerms.some(term => 
          name.includes(term) || 
          notes.includes(term)
        );
      });
      
      setFilteredCollections(filtered);
    }
  };

  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewCollection({
      ...newCollection,
      image: imageUrl
    });
  };

  // Handle parent collection selection
  const handleParentCollectionSelect = (collection: Collection) => {
    setSelectedParentCollection(collection);
    setNewCollection({
      ...newCollection,
      parent: collection.id
    });
    setParentCollectionModalVisible(false);
  };

  // Reset parent collection
  const resetParentCollection = () => {
    setSelectedParentCollection(null);
    setNewCollection({
      ...newCollection,
      parent: null
    });
  };

  // Handle edit button press
  const handleEditCollection = (collection: Collection) => {
    setSelectedCollection({...collection});
    
    // Set the parent collection if it exists
    if (collection.parent !== null) {
      const parentCollection = collections.find(c => c.id === collection.parent);
      if (parentCollection) {
        setSelectedParentCollection(parentCollection);
      } else {
        setSelectedParentCollection(null);
      }
    } else {
      setSelectedParentCollection(null);
    }
    
    setEditModalVisible(true);
  };
  
  // Handle parent collection selection for edit
  const handleEditParentCollectionSelect = (collection: Collection) => {
    setSelectedParentCollection(collection);
    if (selectedCollection) {
      setSelectedCollection({
        ...selectedCollection,
        parent: collection.id
      });
    }
    setParentCollectionModalVisible(false);
  };
  
  // Reset parent collection for edit
  const resetEditParentCollection = () => {
    setSelectedParentCollection(null);
    if (selectedCollection) {
      setSelectedCollection({
        ...selectedCollection,
        parent: null
      });
    }
  };
  
  // Handle edit image change
  const handleEditImageChange = (imageUrl: string) => {
    if (selectedCollection) {
      setSelectedCollection({
        ...selectedCollection,
        image: imageUrl
      });
    }
  };

  // Fetch collections on component mount
  useEffect(() => {
    fetchCollections();
  }, []);

  // Update selected parent collection when collections change
  useEffect(() => {
    if (newCollection.parent && collections.length > 0) {
      const parent = collections.find(c => c.id === newCollection.parent);
      if (parent) {
        setSelectedParentCollection(parent);
      }
    }
  }, [collections, newCollection.parent]);

  // Get parent collections and organize subcollections under them
  const getOrganizedCollections = () => {
    let collectionsToDisplay;
    
    // If we're searching, show all collections that match regardless of hierarchy
    if (searchQuery.trim() !== '') {
      // Find all parent IDs of matched collections to ensure they're shown
      const parentIdsToInclude = new Set<number | null>();
      
      // Add all matched collections
      filteredCollections.forEach(collection => {
        // Include this collection's parent chain
        let current = collection;
        while (current.parent !== null) {
          parentIdsToInclude.add(current.parent);
          const parent = collections.find(c => c.id === current.parent);
          if (!parent) break;
          current = parent;
        }
      });
      
      // Get all collections that should be shown in the list
      collectionsToDisplay = collections.filter(c => 
        // Include if it's in filtered results or if it's a necessary parent
        filteredCollections.some(fc => fc.id === c.id) || 
        parentIdsToInclude.has(c.id)
      );
    } else {
      // Not searching, use normal filtered collections
      collectionsToDisplay = filteredCollections;
    }
    
    // First, identify root collections (no parent)
    const rootCollections = collectionsToDisplay.filter(c => c.parent === null);
    
    // Create a map to hold subcollections for each parent
    const childrenMap = new Map<number, Collection[]>();
    
    // Group children by parent ID
    collectionsToDisplay.forEach(collection => {
      if (collection.parent !== null) {
        const children = childrenMap.get(collection.parent) || [];
        children.push(collection);
        childrenMap.set(collection.parent, children);
      }
    });
    
    // Return the organized structure
    return { rootCollections, childrenMap };
  };

  const { rootCollections, childrenMap } = getOrganizedCollections();

  // Render a root collection with its children
  const renderCollectionWithChildren = ({ item }: { item: Collection }) => {
    const children = childrenMap.get(item.id) || [];
    const isMatch = searchQuery.trim() !== '' && 
      (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <View style={styles.collectionGroup}>
        {/* Parent collection */}
        <TouchableOpacity 
          style={[
            styles.parentCollectionRow,
            isMatch ? styles.highlightedRow : null
          ]}
          onPress={() => handleEditCollection(item)}
        >
          <Text style={styles.collectionName}>{item.name || 'Untitled Collection'}</Text>
        </TouchableOpacity>
        
        {/* Children/subcollections */}
        {children.length > 0 && (
          <View style={styles.childrenContainer}>
            {children.map((child) => {
              // Get grandchildren for this child
              const grandChildren = childrenMap.get(child.id) || [];
              const isChildMatch = searchQuery.trim() !== '' && 
                (child.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (child.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));
              
              return (
                <View key={child.id}>
                  <TouchableOpacity 
                    style={[
                      styles.childCollectionRow,
                      isChildMatch ? styles.highlightedRow : null
                    ]}
                    onPress={() => handleEditCollection(child)}
                  >
                    <Text style={styles.childCollectionName}>{child.name}</Text>
                  </TouchableOpacity>
                  
                  {/* Show grandchildren if they exist */}
                  {grandChildren.length > 0 && (
                    <View style={styles.grandchildrenContainer}>
                      {grandChildren.map((grandChild) => {
                        const isGrandChildMatch = searchQuery.trim() !== '' && 
                          (grandChild.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (grandChild.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));
                          
                        return (
                          <TouchableOpacity 
                            key={grandChild.id}
                            style={[
                              styles.grandchildCollectionRow,
                              isGrandChildMatch ? styles.highlightedRow : null
                            ]}
                            onPress={() => handleEditCollection(grandChild)}
                          >
                            <Text style={styles.grandchildCollectionName}>{grandChild.name}</Text>
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
      <Text style={styles.emptyText}>No collections found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchCollections}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Import the useProduct hook
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Collections" when the component mounts
  useEffect(() => {
    // Find the Collections item in the product sub-items
    const collectionsItem = {
      id: '4',
      name: 'Collections'
    };

    // Set it as the selected product
    setSelectedProduct(collectionsItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  // Get the depth of a collection in the hierarchy
  const getCollectionDepth = (collectionId: number | null, depthMap: Map<number, number> = new Map(), visited: Set<number> = new Set()): number => {
    // Base case: root collection (null parent) has depth 0
    if (collectionId === null) return 0;
    
    // Cycle detection: if we've seen this ID during the current traversal, there's a cycle
    if (visited.has(collectionId)) {
      console.warn(`Circular reference detected in collections hierarchy at ID: ${collectionId}`);
      return 0; // Break the cycle
    }
    
    // If we've already calculated this collection's depth, return it
    if (depthMap.has(collectionId)) return depthMap.get(collectionId)!;
    
    // Add this ID to the visited set
    visited.add(collectionId);
    
    // Find the collection object
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return 0;
    
    // Calculate depth as 1 + parent's depth
    const depth = 1 + getCollectionDepth(collection.parent, depthMap, visited);
    depthMap.set(collectionId, depth);
    
    // Remove this ID from visited set when done with this branch
    visited.delete(collectionId);
    
    return depth;
  };

  // Check if selecting a collection as parent would exceed max depth or create a cycle
  const wouldExceedMaxDepth = (collectionId: number): boolean => {
    // Explicitly setting max depth to 2 (for 3 levels total: parent + child + grandchild)
    const MAX_DEPTH = 2; 
    
    // Special case: if we're in edit mode and this is the selected collection ID,
    // it can't be a parent of itself
    if (selectedCollection && selectedCollection.id === collectionId) {
      return true;
    }
    
    // Calculate current depth of the collection
    const currentDepth = getCollectionDepth(collectionId);
    
    // If the current depth + 1 (for the new child) > MAX_DEPTH, it would exceed
    return currentDepth > MAX_DEPTH;
  };

  // Detect and prevent circular reference in parent selection
  const wouldCreateCycle = (parentId: number): boolean => {
    // If we're in add mode (no selected collection), can't create a cycle
    if (!selectedCollection) {
      return false;
    }
    
    const childId = selectedCollection.id;
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
      
      // Find the parent of the current collection
      const current = collections.find(c => c.id === currentId);
      if (!current || current.parent === null) {
        break;
      }
      
      currentId = current.parent;
    }
    
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Collections" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          {/* Search icon removed */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search collections..."
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
          <Text style={styles.loadingText}>Loading collections...</Text>
        </View>
      ) : (
        <FlatList
          data={rootCollections}
          renderItem={renderCollectionWithChildren}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Collection Modal */}
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
              <Text style={styles.modalTitle}>New Collection</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addCollection}
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
                value={newCollection.name}
                onChangeText={(text) => setNewCollection({ ...newCollection, name: text })}
                placeholder="Collection Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.tilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newCollection.image || '[]'}
                  onImageChange={handleImageChange}
                />
              </View>
              
              <TouchableOpacity
                style={styles.parentTile}
                onPress={() => setParentCollectionModalVisible(true)}
              >
                {selectedParentCollection ? (
                  <View style={styles.selectedParentContainer}>
                    <Text style={styles.selectedParentText}>
                      {selectedParentCollection.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.clearParentButton}
                      onPress={resetParentCollection}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyParentContainer}>
                    <Ionicons name="folder-outline" size={32} color="#999" />
                    <Text style={styles.parentPlaceholder}>Parent Collection</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newCollection.notes}
                onChangeText={(text) => setNewCollection({ ...newCollection, notes: text })}
                placeholder="Add notes about this collection..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Collection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedCollection !== null}
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
              <Text style={styles.modalTitle}>Edit Collection</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editCollection}
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

          {selectedCollection && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.formGroup, styles.titleInputContainer]}>
                <TextInput
                  style={styles.titleInput}
                  value={selectedCollection.name}
                  onChangeText={(text) => setSelectedCollection({...selectedCollection, name: text})}
                  placeholder="Collection Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.tilesContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedCollection.image || '[]'}
                    onImageChange={handleEditImageChange}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.parentTile}
                  onPress={() => setParentCollectionModalVisible(true)}
                >
                  {selectedParentCollection ? (
                    <View style={styles.selectedParentContainer}>
                      <Text style={styles.selectedParentText}>
                        {selectedParentCollection.name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.clearParentButton}
                        onPress={resetEditParentCollection}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.emptyParentContainer}>
                      <Ionicons name="folder-outline" size={32} color="#999" />
                      <Text style={styles.parentPlaceholder}>Parent Collection</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.notesInput}
                  value={selectedCollection.notes}
                  onChangeText={(text) => setSelectedCollection({...selectedCollection, notes: text})}
                  placeholder="Add notes about this collection..."
                  placeholderTextColor="#999"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Parent Collection Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={parentCollectionModalVisible}
        onRequestClose={() => setParentCollectionModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <TouchableOpacity
              onPress={() => setParentCollectionModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.parentModalTitle}>Parent Collection</Text>
          </View>

          <FlatList
            data={collections.filter(c => {
              // Only show root-level collections (no parent)
              if (c.parent !== null) {
                return false;
              }
              
              // When editing, don't show the current collection as a parent option
              // Also check if selecting this collection would create a cycle
              if (selectedCollection) {
                // Don't show the collection itself
                if (c.id === selectedCollection.id) return false;
                
                // Check if this would create a cycle
                if (wouldCreateCycle(c.id)) return false;
              }
              
              // Check if this would exceed max depth
              return !wouldExceedMaxDepth(c.id);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.parentCollectionItem}
                onPress={() => {
                  if (selectedCollection) {
                    handleEditParentCollectionSelect(item);
                  } else {
                    handleParentCollectionSelect(item);
                  }
                }}
              >
                <Text style={styles.parentCollectionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentCollectionDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No collections available as parents</Text>
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
    paddingLeft: 4, // Add a bit of left padding since icon is gone
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
  collectionGroup: {
    marginBottom: 0,
  },
  parentCollectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  collectionName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0066CC', // Changed from '#222' to '#0066CC' for blue color
    flex: 1,
    backgroundColor: 'transparent',
  },
  childrenContainer: {
    marginLeft: 0,
  },
  childCollectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  childCollectionName: {
    fontSize: 16,
    color: '#444', // Keep this black/dark gray
    fontWeight: '400',
    flex: 1,
  },
  grandchildrenContainer: {
    marginLeft: 16,
  },
  grandchildCollectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  grandchildCollectionName: {
    fontSize: 15,
    color: '#666',
    fontWeight: '300',
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: 'transparent',
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
  tilesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
    gap: 0,
  },
  imageTile: {
    width: '50%',
    aspectRatio: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  parentTile: {
    width: '50%',
    aspectRatio: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#eaeaea',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  selectedParentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedParentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  clearParentButton: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  emptyParentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentPlaceholder: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
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
  },
  parentCollectionText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
  },
  parentCollectionItem: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  parentCollectionDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
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
  clearParentButtonHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonHeaderText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff', // Light blue background for matched items
  },
});
