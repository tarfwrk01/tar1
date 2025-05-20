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
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
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
      console.log('Response text:', responseText);

      if (response.ok) {
        // Reset form and close modal
        setNewCategory({
          name: '',
          image: '[]',
          notes: '',
          parent: null
        });
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

  // Handle search input
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Start with all categories or filtered by parent if a filter is active
    let baseCategories = categories;
    if (activeFilter) {
      baseCategories = categories.filter(c =>
        activeFilter === 'parent' ? c.parent !== null : c.parent === null
      );
    }

    // Then apply search filter
    if (text.trim() === '') {
      setFilteredCategories(baseCategories);
    } else {
      const filtered = baseCategories.filter(category =>
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

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <Text style={styles.categoryName}>{item.name || 'Untitled Category'}</Text>
      {item.parent !== null && (
        <Text style={styles.categoryParent}>Parent ID: {item.parent}</Text>
      )}
    </View>
  );

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

        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter-outline" size={24} color={activeFilter ? "#0066CC" : "#000"} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
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
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
                placeholder="Category Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Parent Category</Text>
              <TextInput
                style={styles.input}
                value={newCategory.parent?.toString() || ''}
                onChangeText={(text) => {
                  const parentId = text.trim() === '' ? null : parseInt(text, 10);
                  setNewCategory({ ...newCategory, parent: isNaN(parentId) ? null : parentId });
                }}
                placeholder="Parent Category ID (optional)"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category Image</Text>
              <SingleImageUploader
                imageUrl={newCategory.image || '[]'}
                onImageChange={handleImageChange}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
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

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModalContainer}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Categories</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptions}>
              <Text style={styles.filterSectionTitle}>Filter by Parent</Text>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter('parent');
                  setFilteredCategories(categories.filter(c => c.parent !== null));
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Has Parent</Text>
                {activeFilter === 'parent' && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter('root');
                  setFilteredCategories(categories.filter(c => c.parent === null));
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Root Categories</Text>
                {activeFilter === 'root' && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter(null);
                  setFilteredCategories(categories);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>All Categories</Text>
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    marginHorizontal: 10,
    height: 36,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
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
    padding: 16,
    flexGrow: 1,
  },
  categoryItem: {
    padding: 16,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryParent: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
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
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
  },
  saveButton: {
    backgroundColor: '#0066CC',
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    margin: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Add any additional styles here
  filterModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterOptions: {
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterText: {
    fontSize: 16,
  },
});
