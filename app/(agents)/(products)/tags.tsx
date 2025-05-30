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

interface Tag {
  id: number;
  name: string;
  image: string;
  notes: string;
}

export default function TagsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState<Partial<Tag>>({
    name: '',
    image: '[]', // Empty JSON array
    notes: ''
  });
  const { profileData } = useOnboarding();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Tags" when the component mounts
  useEffect(() => {
    // Find the Tags item in the product sub-items
    const tagsItem = {
      id: '9',
      name: 'Tags'
    };

    // Set it as the selected product
    setSelectedProduct(tagsItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch tags
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
                sql: "SELECT id, name, image, notes FROM tags ORDER BY name LIMIT 100"
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
            const tagData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                name: row[1].type === 'null' ? '' : row[1].value,
                image: row[2].type === 'null' ? '[]' : row[2].value,
                notes: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed tag data:', JSON.stringify(tagData, null, 2));
            setTags(tagData);
            setFilteredTags(tagData);
          } else {
            console.log('No tag data found in response');
            setTags([]);
            setFilteredTags([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setTags([]);
          setFilteredTags([]);
        }
      } else {
        console.error('Failed to fetch tags:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch tags. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching tags. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = async () => {
    try {
      if (!newTag.name) {
        Alert.alert('Error', 'Tag name is required');
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
              sql: `INSERT INTO tags (
                name, image, notes
              ) VALUES (
                '${(newTag.name || '').replace(/'/g, "''")}',
                '${(newTag.image || '[]').replace(/'/g, "''")}',
                '${(newTag.notes || '').replace(/'/g, "''")}'
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
        setNewTag({
          name: '',
          image: '[]',
          notes: ''
        });
        setModalVisible(false);

        // Refresh the tags list
        fetchTags();
      } else {
        console.error('Failed to add tag:', responseText);
        Alert.alert(
          'Error',
          'Failed to add tag. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the tag. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit tag function
  const editTag = async () => {
    if (!selectedTag) return;

    try {
      if (!selectedTag.name) {
        Alert.alert('Error', 'Tag name is required');
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
              sql: `UPDATE tags SET
                name = '${(selectedTag.name || '').replace(/'/g, "''")}',
                image = '${(selectedTag.image || '[]').replace(/'/g, "''")}',
                notes = '${(selectedTag.notes || '').replace(/'/g, "''")}'
                WHERE id = ${selectedTag.id}`
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
        setSelectedTag(null);
        setEditModalVisible(false);

        // Refresh the tags list
        fetchTags();
      } else {
        console.error('Failed to update tag:', responseText);
        Alert.alert(
          'Error',
          'Failed to update tag. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the tag. Please try again.',
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
      setFilteredTags(tags);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);

      const filtered = tags.filter(tag => {
        if (!tag) return false;

        // Normalize searchable fields to lower case strings
        const name = (tag.name || '').toLowerCase();
        const notes = (tag.notes || '').toLowerCase();

        // Check each search term against all fields
        return searchTerms.some(term =>
          name.includes(term) ||
          notes.includes(term)
        );
      });

      setFilteredTags(filtered);
    }
  };

  // Handle image change
  const handleImageChange = (imageUrl: string) => {
    setNewTag({
      ...newTag,
      image: imageUrl
    });
  };

  // Handle edit button press
  const handleEditTag = (tag: Tag) => {
    setSelectedTag({...tag});
    setEditModalVisible(true);
  };

  // Handle edit image change
  const handleEditImageChange = (imageUrl: string) => {
    if (selectedTag) {
      setSelectedTag({
        ...selectedTag,
        image: imageUrl
      });
    }
  };

  // Fetch tags on component mount
  useEffect(() => {
    fetchTags();
  }, []);

  // Render a tag item
  const renderTagItem = ({ item }: { item: Tag }) => {
    const isMatch = searchQuery.trim() !== '' &&
      (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <TouchableOpacity
        style={[
          styles.tagRow,
          isMatch ? styles.highlightedRow : null
        ]}
        onPress={() => handleEditTag(item)}
      >
        <Text style={styles.tagName}>{item.name || 'Untitled Tag'}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tags found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchTags}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Tags" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tags..."
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
          <Text style={styles.loadingText}>Loading tags...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTags}
          renderItem={renderTagItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Tag Modal */}
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
              <Text style={styles.modalTitle}>New Tag</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addTag}
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
                value={newTag.name}
                onChangeText={(text) => setNewTag({ ...newTag, name: text })}
                placeholder="Tag Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.imageTileContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newTag.image || '[]'}
                  onImageChange={handleImageChange}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newTag.notes}
                onChangeText={(text) => setNewTag({ ...newTag, notes: text })}
                placeholder="Add notes about this tag..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedTag !== null}
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
              <Text style={styles.modalTitle}>Edit Tag</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editTag}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedTag && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.formGroup, styles.titleInputContainer]}>
                <TextInput
                  style={styles.titleInput}
                  value={selectedTag.name}
                  onChangeText={(text) => setSelectedTag({...selectedTag, name: text})}
                  placeholder="Tag Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.imageTileContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedTag.image || '[]'}
                    onImageChange={handleEditImageChange}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.notesInput}
                  value={selectedTag.notes}
                  onChangeText={(text) => setSelectedTag({...selectedTag, notes: text})}
                  placeholder="Add notes about this tag..."
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
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tagName: {
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
