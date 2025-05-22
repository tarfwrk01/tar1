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

type Category = {
  id: number;
  name: string;
  image: string;
  notes: string;
  parent: number | null;
};

export default function CategoriesScreen() {  
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [parentCategoryModalVisible, setParentCategoryModalVisible] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    image: '[]', // Empty JSON array
    notes: '',
    parent: null
  });
  const { profileData } = useOnboarding();

  const fetchCategories = async () => {
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

      // Fetch categories
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
                sql: "SELECT id, name, image, notes, parent FROM categories ORDER BY name LIMIT 100"
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
            const categoryData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                name: row[1].type === 'null' ? '' : row[1].value,
                image: row[2].type === 'null' ? '[]' : row[2].value,
                notes: row[3].type === 'null' ? '' : row[3].value,
                parent: row[4].type === 'null' ? null : parseInt(row[4].value)
              };
            });

            console.log('Transformed category data:', JSON.stringify(categoryData, null, 2));
            setCategories(categoryData);
            setFilteredCategories(categoryData);
          } else {
            console.log('No category data found in response');
            setCategories([]);
            setFilteredCategories([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setCategories([]);
          setFilteredCategories([]);
        }
      } else {
        console.error('Failed to fetch categories:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch categories. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching categories. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async () => {
    try {
      if (!newCategory.name) {
        Alert.alert('Error', 'Category name is required');
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

      // Current date for created/updated timestamps
      const now = new Date().toISOString();

      // Create the request body with direct SQL values instead of parameters
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO categories (
                name, image, notes, parent
              ) VALUES (
                '${(newCategory.name || '').replace(/'/g, "''")}',
                '${(newCategory.image || '[]').replace(/'/g, "''")}',
                '${(newCategory.notes || '').replace(/'/g, "''")}',
                ${newCategory.parent === null ? 'NULL' : Number(newCategory.parent)}
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
      console.log('Response text:', responseText);      if (response.ok) {
      // Reset form and close modal
        setNewCategory({
          name: '',
          image: '[]',
          notes: '',
          parent: null
        });
        setSelectedParentCategory(null);
        setModalVisible(false);

        // Refresh the categories list
        fetchCategories();

        Alert.alert(
          'Success',
          'Category added successfully',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to add category:', responseText);
        Alert.alert(
          'Error',
          'Failed to add category. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the category. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit category function
  const editCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      if (!selectedCategory.name) {
        Alert.alert('Error', 'Category name is required');
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
              sql: `UPDATE categories SET
                name = '${(selectedCategory.name || '').replace(/'/g, "''")}',
                image = '${(selectedCategory.image || '[]').replace(/'/g, "''")}',
                notes = '${(selectedCategory.notes || '').replace(/'/g, "''")}',
                parent = ${selectedCategory.parent === null ? 'NULL' : Number(selectedCategory.parent)}
                WHERE id = ${selectedCategory.id}`
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
        setSelectedCategory(null);
        setSelectedParentCategory(null);
        setEditModalVisible(false);

        // Refresh the categories list
        fetchCategories();

        Alert.alert(
          'Success',
          'Category updated successfully',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to update category:', responseText);
        Alert.alert(
          'Error',
          'Failed to update category. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the category. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input - simplified without filter logic
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  };
  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewCategory({
      ...newCategory,
      image: imageUrl
    });
  };
  // Handle parent category selection
  const handleParentCategorySelect = (category: Category) => {
    setSelectedParentCategory(category);
    setNewCategory({
      ...newCategory,
      parent: category.id
    });
    setParentCategoryModalVisible(false);
  };

  // Reset parent category
  const resetParentCategory = () => {
    setSelectedParentCategory(null);
    setNewCategory({
      ...newCategory,
      parent: null
    });
  };

  // Handle edit button press
  const handleEditCategory = (category: Category) => {
    setSelectedCategory({...category});
    
    // Set the parent category if it exists
    if (category.parent !== null) {
      const parentCategory = categories.find(c => c.id === category.parent);
      if (parentCategory) {
        setSelectedParentCategory(parentCategory);
      } else {
        setSelectedParentCategory(null);
      }
    } else {
      setSelectedParentCategory(null);
    }
    
    setEditModalVisible(true);
  };
  
  // Handle parent category selection for edit
  const handleEditParentCategorySelect = (category: Category) => {
    setSelectedParentCategory(category);
    if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        parent: category.id
      });
    }
    setParentCategoryModalVisible(false);
  };
  
  // Reset parent category for edit
  const resetEditParentCategory = () => {
    setSelectedParentCategory(null);
    if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        parent: null
      });
    }
  };
  
  // Handle edit image change
  const handleEditImageChange = (imageUrl: string) => {
    if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        image: imageUrl
      });
    }
  };

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Update selected parent category when categories change
  useEffect(() => {
    if (newCategory.parent && categories.length > 0) {
      const parent = categories.find(c => c.id === newCategory.parent);
      if (parent) {
        setSelectedParentCategory(parent);
      }
    }
  }, [categories, newCategory.parent]);

  // Get parent categories and organize subcategories under them
  const getOrganizedCategories = () => {
    // First, identify root categories (no parent)
    const rootCategories = filteredCategories.filter(c => c.parent === null);
    
    // Create a map to hold subcategories for each parent
    const childrenMap = new Map<number, Category[]>();
    
    // Group children by parent ID
    filteredCategories.forEach(category => {
      if (category.parent !== null) {
        const children = childrenMap.get(category.parent) || [];
        children.push(category);
        childrenMap.set(category.parent, children);
      }
    });
    
    // Return the organized structure
    return { rootCategories, childrenMap };
  };

  const { rootCategories, childrenMap } = getOrganizedCategories();

  // Render a root category with its children
  const renderCategoryWithChildren = ({ item }: { item: Category }) => {
    const children = childrenMap.get(item.id) || [];
    
    return (
      <View style={styles.categoryGroup}>
        {/* Parent category */}
        <TouchableOpacity 
          style={styles.parentCategoryRow}
          onPress={() => handleEditCategory(item)}
        >
          <Text style={styles.categoryName}>{item.name || 'Untitled Category'}</Text>
        </TouchableOpacity>
        
        {/* Children/subcategories */}
        {children.length > 0 && (
          <View style={styles.childrenContainer}>
            {children.map((child) => {
              // Get grandchildren for this child
              const grandChildren = childrenMap.get(child.id) || [];
              
              return (
                <View key={child.id}>
                  <TouchableOpacity 
                    style={styles.childCategoryRow}
                    onPress={() => handleEditCategory(child)}
                  >
                    <Text style={styles.childCategoryName}>{child.name}</Text>
                  </TouchableOpacity>
                  
                  {/* Show grandchildren if they exist */}
                  {grandChildren.length > 0 && (
                    <View style={styles.grandchildrenContainer}>
                      {grandChildren.map((grandChild) => (
                        <TouchableOpacity 
                          key={grandChild.id}
                          style={styles.grandchildCategoryRow}
                          onPress={() => handleEditCategory(grandChild)}
                        >
                          <Text style={styles.grandchildCategoryName}>{grandChild.name}</Text>
                        </TouchableOpacity>
                      ))}
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
      <Text style={styles.emptyText}>No categories found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchCategories}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Import the useProduct hook
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Categories" when the component mounts
  useEffect(() => {
    // Find the Categories item in the product sub-items
    const categoriesItem = {
      id: '3',
      name: 'Categories'
    };

    // Set it as the selected product
    setSelectedProduct(categoriesItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  // Get the depth of a category in the hierarchy
  const getCategoryDepth = (categoryId: number | null, depthMap: Map<number, number> = new Map()): number => {
    // Base case: root category (null parent) has depth 0
    if (categoryId === null) return 0;
    
    // If we've already calculated this category's depth, return it
    if (depthMap.has(categoryId)) return depthMap.get(categoryId)!;
    
    // Find the category object
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;
    
    // Calculate depth as 1 + parent's depth
    const depth = 1 + getCategoryDepth(category.parent, depthMap);
    depthMap.set(categoryId, depth);
    
    return depth;
  };

  // Check if selecting a category as parent would exceed max depth
  const wouldExceedMaxDepth = (categoryId: number): boolean => {
    // Max depth allowed is 3
    const MAX_DEPTH = 2; // 0-indexed, so 2 means 3 levels
    
    // Calculate current depth of the category
    const currentDepth = getCategoryDepth(categoryId);
    
    // If the current depth + 1 (for the new child) > MAX_DEPTH, it would exceed
    return currentDepth > MAX_DEPTH;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Categories" />

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
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Filter button removed */}
      </View>
      
      {/* Light divider added below search */}
      <View style={styles.searchDivider} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={rootCategories}
          renderItem={renderCategoryWithChildren}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Category Modal */}
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
              <Text style={styles.modalTitle}>New Category</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addCategory}
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
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
                placeholder="Category Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.tilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newCategory.image || '[]'}
                  onImageChange={handleImageChange}
                />
              </View>
              
              <TouchableOpacity
                style={styles.parentTile}
                onPress={() => setParentCategoryModalVisible(true)}
              >
                {selectedParentCategory ? (
                  <View style={styles.selectedParentContainer}>
                    <Text style={styles.selectedParentText}>
                      {selectedParentCategory.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.clearParentButton}
                      onPress={resetParentCategory}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyParentContainer}>
                    <Ionicons name="folder-outline" size={32} color="#999" />
                    <Text style={styles.parentPlaceholder}>Parent Category</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newCategory.notes}
                onChangeText={(text) => setNewCategory({ ...newCategory, notes: text })}
                placeholder="Add notes about this category..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedCategory !== null}
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
              <Text style={styles.modalTitle}>Edit Category</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editCategory}
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

          {selectedCategory && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.formGroup, styles.titleInputContainer]}>
                <TextInput
                  style={styles.titleInput}
                  value={selectedCategory.name}
                  onChangeText={(text) => setSelectedCategory({...selectedCategory, name: text})}
                  placeholder="Category Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.tilesContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedCategory.image || '[]'}
                    onImageChange={handleEditImageChange}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.parentTile}
                  onPress={() => setParentCategoryModalVisible(true)}
                >
                  {selectedParentCategory ? (
                    <View style={styles.selectedParentContainer}>
                      <Text style={styles.selectedParentText}>
                        {selectedParentCategory.name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.clearParentButton}
                        onPress={resetEditParentCategory}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.emptyParentContainer}>
                      <Ionicons name="folder-outline" size={32} color="#999" />
                      <Text style={styles.parentPlaceholder}>Parent Category</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.notesInput}
                  value={selectedCategory.notes}
                  onChangeText={(text) => setSelectedCategory({...selectedCategory, notes: text})}
                  placeholder="Add notes about this category..."
                  placeholderTextColor="#999"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Parent Category Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={parentCategoryModalVisible}
        onRequestClose={() => setParentCategoryModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <TouchableOpacity
              onPress={() => setParentCategoryModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.parentModalTitle}>Parent Category</Text>
            {/* Clear button removed from header */}
          </View>

          <FlatList
            data={categories.filter(c => {
              // Don't show the current category or any categories that would exceed max depth
              const isCurrentCategory = selectedCategory ? c.id === selectedCategory.id : c.id === newCategory.id;
              const exceedsMaxDepth = wouldExceedMaxDepth(c.id);
              return !isCurrentCategory && !exceedsMaxDepth;
            })}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.parentCategoryItem}
                onPress={() => handleParentCategorySelect(item)}
              >
                <Text style={styles.parentCategoryText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentCategoryDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No categories available as parents</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Filter Modal removed */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Restore background color
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
  searchIcon: {
    marginRight: 6,
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
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
    padding: 0, // Remove padding from the list container
    paddingTop: 8, // Add a bit of top padding only
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  categoryGroup: {
    marginBottom: 0,
  },
  parentCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    flex: 1,
    backgroundColor: 'transparent',
  },
  childrenContainer: {
    marginLeft: 0, // Remove margin for second hierarchy to align with first level
  },
  childCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  childCategoryName: {
    fontSize: 16,
    color: '#444',
    fontWeight: '400',
    flex: 1,
  },
  grandchildrenContainer: {
    marginLeft: 16, // Keep margin only for third hierarchy
  },
  grandchildCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    // Removed borderBottomWidth and borderBottomColor
  },
  grandchildCategoryName: {
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
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff', // Restore background color
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Restore border color
    backgroundColor: '#fff', // Restore background color
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
    backgroundColor: '#0066CC', // Restore blue background
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
    backgroundColor: '#fff', // Restore background color
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
    backgroundColor: '#fff', // Restore background color
  },
  notesInput: {
    fontSize: 16,
    color: '#333',
    padding: 0,
    borderWidth: 0,
    minHeight: 100,
    backgroundColor: '#fff', // Restore background color
    borderBottomWidth: 1, // Add bottom border
    borderBottomColor: '#f0f0f0', // Add bottom border color
  },
  parentCategoryText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
  },
  parentCategoryItem: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  parentCategoryDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
  },
  parentModalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  parentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
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
});
