import { useProduct } from '@/app/context/product';
import { useTursoCredentialsLazy } from '@/app/hooks/useTursoCredentials';
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

interface Option {
  id: number;
  parentid: number | null;
  title: string;
  value: string;
}

export default function OptionsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [parentOptionModalVisible, setParentOptionModalVisible] = useState(false);
  const [selectedParentOption, setSelectedParentOption] = useState<Option | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [newOption, setNewOption] = useState<Partial<Option>>({
    title: '',
    value: '',
    parentid: null
  });
  const { getCredentials } = useTursoCredentialsLazy();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Options" when the component mounts
  useEffect(() => {
    const optionsItem = {
      id: '11',
      name: 'Options'
    };
    setSelectedProduct(optionsItem);

    // Clean up when component unmounts
    return () => {
      setSelectedProduct(null);
    };
  }, []);

  const fetchOptions = async () => {
    try {
      setIsLoading(true);

      // Get credentials from cache or database
      const credentials = await getCredentials();
      const { tursoDbName, tursoApiToken } = credentials;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch options
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
                sql: "SELECT id, parentid, title, value FROM options ORDER BY title LIMIT 100"
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
            const optionData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                parentid: row[1].type === 'null' ? null : parseInt(row[1].value),
                title: row[2].type === 'null' ? '' : row[2].value,
                value: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed option data:', JSON.stringify(optionData, null, 2));
            setOptions(optionData);
            setFilteredOptions(optionData);
          } else {
            console.log('No option data found in response');
            setOptions([]);
            setFilteredOptions([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setOptions([]);
          setFilteredOptions([]);
        }
      } else {
        console.error('Failed to fetch options:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch options. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching options:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching options. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addOption = async () => {
    try {
      if (!newOption.title) {
        Alert.alert('Error', 'Option title is required');
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
              sql: `INSERT INTO options (
                parentid, title, value
              ) VALUES (
                ${newOption.parentid === null ? 'NULL' : Number(newOption.parentid)},
                '${(newOption.title || '').replace(/'/g, "''")}',
                '${(newOption.value || '').replace(/'/g, "''")}'
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
        setNewOption({
          title: '',
          value: '',
          parentid: null
        });
        setSelectedParentOption(null);
        setModalVisible(false);

        // Refresh the options list
        fetchOptions();
      } else {
        console.error('Failed to add option:', responseText);
        Alert.alert(
          'Error',
          'Failed to add option. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding option:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the option. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit option function
  const editOption = async () => {
    if (!selectedOption) return;

    try {
      if (!selectedOption.title) {
        Alert.alert('Error', 'Option title is required');
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
              sql: `UPDATE options SET
                title = '${(selectedOption.title || '').replace(/'/g, "''")}',
                value = '${(selectedOption.value || '').replace(/'/g, "''")}',
                parentid = ${selectedOption.parentid === null ? 'NULL' : Number(selectedOption.parentid)}
                WHERE id = ${selectedOption.id}`
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
        setSelectedOption(null);
        setSelectedParentOption(null);
        setEditModalVisible(false);

        // Refresh the options list
        fetchOptions();
      } else {
        console.error('Failed to update option:', responseText);
        Alert.alert(
          'Error',
          'Failed to update option. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating option:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the option. Please try again.',
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
      setFilteredOptions(options);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);

      const filtered = options.filter(option => {
        if (!option) return false;

        // Normalize searchable fields to lower case strings
        const title = (option.title || '').toLowerCase();
        const value = (option.value || '').toLowerCase();

        // Check each search term against all fields
        return searchTerms.some(term =>
          title.includes(term) ||
          value.includes(term)
        );
      });

      setFilteredOptions(filtered);
    }
  };

  // Handle parent option selection
  const handleParentOptionSelect = (option: Option) => {
    setSelectedParentOption(option);
    setNewOption({
      ...newOption,
      parentid: option.id
    });
    setParentOptionModalVisible(false);
  };

  // Reset parent option
  const resetParentOption = () => {
    setSelectedParentOption(null);
    setNewOption({
      ...newOption,
      parentid: null
    });
  };

  // Handle edit button press
  const handleEditOption = (option: Option) => {
    setSelectedOption({...option});

    // Set the parent option if it exists
    if (option.parentid !== null) {
      const parentOption = options.find(m => m.id === option.parentid);
      if (parentOption) {
        setSelectedParentOption(parentOption);
      } else {
        setSelectedParentOption(null);
      }
    } else {
      setSelectedParentOption(null);
    }

    setEditModalVisible(true);
  };

  // Handle parent option selection for edit
  const handleEditParentOptionSelect = (option: Option) => {
    setSelectedParentOption(option);
    if (selectedOption) {
      setSelectedOption({
        ...selectedOption,
        parentid: option.id
      });
    }
    setParentOptionModalVisible(false);
  };

  // Reset parent option for edit
  const resetEditParentOption = () => {
    setSelectedParentOption(null);
    if (selectedOption) {
      setSelectedOption({
        ...selectedOption,
        parentid: null
      });
    }
  };

  // Fetch options on component mount
  useEffect(() => {
    fetchOptions();
  }, []);

  // Update selected parent option when options change
  useEffect(() => {
    if (newOption.parentid && options.length > 0) {
      const parent = options.find(m => m.id === newOption.parentid);
      if (parent) {
        setSelectedParentOption(parent);
      }
    }
  }, [options, newOption.parentid]);

  // Get parent options and organize children under them
  const getOrganizedOptions = () => {
    let optionsToDisplay;

    // If we're searching, show all options that match regardless of hierarchy
    if (searchQuery.trim() !== '') {
      // Find all parent IDs of matched options to ensure they're shown
      const parentIdsToInclude = new Set<number | null>();

      // Add all matched options
      filteredOptions.forEach(option => {
        // Include this option's parent chain
        let current = option;
        while (current.parentid !== null) {
          parentIdsToInclude.add(current.parentid);
          const parent = options.find(m => m.id === current.parentid);
          if (!parent) break;
          current = parent;
        }
      });

      // Get all options that should be shown in the list
      optionsToDisplay = options.filter(m =>
        // Include if it's in filtered results or if it's a necessary parent
        filteredOptions.some(fm => fm.id === m.id) ||
        parentIdsToInclude.has(m.id)
      );
    } else {
      // Not searching, use normal filtered options
      optionsToDisplay = filteredOptions;
    }

    // First, identify root options (no parent)
    const rootOptions = optionsToDisplay.filter(m => m.parentid === null);

    // Create a map to hold sub-options for each parent
    const childrenMap = new Map<number, Option[]>();

    // Group children by parent ID
    optionsToDisplay.forEach(option => {
      if (option.parentid !== null) {
        const children = childrenMap.get(option.parentid) || [];
        children.push(option);
        childrenMap.set(option.parentid, children);
      }
    });

    // Return the organized structure
    return { rootOptions, childrenMap };
  };

  const { rootOptions, childrenMap } = getOrganizedOptions();

  // Render a root option with its children
  const renderOptionWithChildren = ({ item }: { item: Option }) => {
    const children = childrenMap.get(item.id) || [];
    const isMatch = searchQuery.trim() !== '' &&
      (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (item.value || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <View style={styles.optionGroup}>
        {/* Parent option */}
        <TouchableOpacity
          style={[
            styles.parentOptionRow,
            isMatch ? styles.highlightedRow : null
          ]}
          onPress={() => handleEditOption(item)}
        >
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{item.title || 'Untitled Option'}</Text>
            <Text style={styles.optionValue}>{item.value}</Text>
          </View>
        </TouchableOpacity>

        {/* Children/sub-options */}
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
                      styles.childOptionRow,
                      isChildMatch ? styles.highlightedRow : null
                    ]}
                    onPress={() => handleEditOption(child)}
                  >
                    <View style={styles.optionInfo}>
                      <Text style={styles.childOptionTitle}>{child.title}</Text>
                      <Text style={styles.childOptionValue}>{child.value}</Text>
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
                              styles.grandchildOptionRow,
                              isGrandChildMatch ? styles.highlightedRow : null
                            ]}
                            onPress={() => handleEditOption(grandChild)}
                          >
                            <View style={styles.optionInfo}>
                              <Text style={styles.grandchildOptionTitle}>{grandChild.title}</Text>
                              <Text style={styles.grandchildOptionValue}>{grandChild.value}</Text>
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
      <Text style={styles.emptyText}>No options found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchOptions}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Get the depth of an option in the hierarchy
  const getOptionDepth = (optionId: number | null, depthMap: Map<number, number> = new Map(), visited: Set<number> = new Set()): number => {
    // Base case: root option (null parent) has depth 0
    if (optionId === null) return 0;

    // Cycle detection
    if (visited.has(optionId)) {
      console.warn(`Circular reference detected in options hierarchy at ID: ${optionId}`);
      return 0; // Break the cycle
    }

    // If we've already calculated this option's depth, return it
    if (depthMap.has(optionId)) return depthMap.get(optionId)!;

    // Add this ID to the visited set
    visited.add(optionId);

    // Find the option object
    const option = options.find(m => m.id === optionId);
    if (!option) return 0;

    // Calculate depth as 1 + parent's depth
    const depth = 1 + getOptionDepth(option.parentid, depthMap, visited);
    depthMap.set(optionId, depth);

    // Remove this ID from visited set when done with this branch
    visited.delete(optionId);

    return depth;
  };

  // Check if selecting an option as parent would exceed max depth or create a cycle
  const wouldExceedMaxDepth = (optionId: number): boolean => {
    // Explicitly setting max depth to 2 (for 3 levels total: parent + child + grandchild)
    const MAX_DEPTH = 2;

    // Special case: if we're in edit mode and this is the selected option ID,
    // it can't be a parent of itself
    if (selectedOption && selectedOption.id === optionId) {
      return true;
    }

    // Calculate current depth of the option
    const currentDepth = getOptionDepth(optionId);

    // If the current depth + 1 (for the new child) > MAX_DEPTH, it would exceed
    return currentDepth > MAX_DEPTH;
  };

  // Detect and prevent circular reference in parent selection
  const wouldCreateCycle = (parentId: number): boolean => {
    // If we're in add mode (no selected option), can't create a cycle
    if (!selectedOption) {
      return false;
    }

    const childId = selectedOption.id;
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

      // Find the parent of the current option
      const current = options.find(m => m.id === currentId);
      if (!current || current.parentid === null) {
        break;
      }

      currentId = current.parentid;
    }

    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Options" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search options..."
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
          <Text style={styles.loadingText}>Loading options...</Text>
        </View>
      ) : (
        <FlatList
          data={rootOptions}
          renderItem={renderOptionWithChildren}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Option Modal */}
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
              <Text style={styles.modalTitle}>New Option</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addOption}
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
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.titleInput}
                value={newOption.title}
                onChangeText={(text) => setNewOption({ ...newOption, title: text })}
                placeholder="Option Title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Value</Text>
              <TextInput
                style={styles.valueInput}
                value={newOption.value}
                onChangeText={(text) => setNewOption({ ...newOption, value: text })}
                placeholder="Option Value"
                placeholderTextColor="#999"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Parent Option</Text>
              <TouchableOpacity
                style={styles.parentSelector}
                onPress={() => setParentOptionModalVisible(true)}
              >
                {selectedParentOption ? (
                  <View style={styles.selectedParentContainer}>
                    <Text style={styles.selectedParentText}>
                      {selectedParentOption.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.clearParentButton}
                      onPress={resetParentOption}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.parentPlaceholder}>Select a parent option (optional)</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Option Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedOption !== null}
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
              <Text style={styles.modalTitle}>Edit Option</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editOption}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedOption && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={selectedOption.title}
                  onChangeText={(text) => setSelectedOption({...selectedOption, title: text})}
                  placeholder="Option Title"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Value</Text>
                <TextInput
                  style={styles.valueInput}
                  value={selectedOption.value}
                  onChangeText={(text) => setSelectedOption({...selectedOption, value: text})}
                  placeholder="Option Value"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Parent Option</Text>
                <TouchableOpacity
                  style={styles.parentSelector}
                  onPress={() => setParentOptionModalVisible(true)}
                >
                  {selectedParentOption ? (
                    <View style={styles.selectedParentContainer}>
                      <Text style={styles.selectedParentText}>
                        {selectedParentOption.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.clearParentButton}
                        onPress={resetEditParentOption}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.parentPlaceholder}>Select a parent option (optional)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Parent Option Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={parentOptionModalVisible}
        onRequestClose={() => setParentOptionModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <TouchableOpacity
              onPress={() => setParentOptionModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.parentModalTitle}>Parent Option</Text>
          </View>

          <FlatList
            data={options.filter(m => {
              // Only show root-level options (no parent) and options with depth < 2
              if (m.parentid !== null && getOptionDepth(m.id) >= 2) {
                return false;
              }

              // When editing, don't show the current option as a parent option
              // Also check if selecting this option would create a cycle
              if (selectedOption) {
                // Don't show the option itself
                if (m.id === selectedOption.id) return false;

                // Check if this would create a cycle
                if (wouldCreateCycle(m.id)) return false;
              }

              // Check if this would exceed max depth
              return !wouldExceedMaxDepth(m.id);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.parentOptionItem}
                onPress={() => {
                  if (selectedOption) {
                    handleEditParentOptionSelect(item);
                  } else {
                    handleParentOptionSelect(item);
                  }
                }}
              >
                <Text style={styles.parentOptionTitle}>{item.title}</Text>
                <Text style={styles.parentOptionValue}>{item.value}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentOptionDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No options available as parents</Text>
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
  optionGroup: {
    marginBottom: 0,
  },
  parentOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0066CC',
    flex: 1,
    backgroundColor: 'transparent',
  },
  optionValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  childrenContainer: {
    marginLeft: 0,
  },
  childOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  childOptionTitle: {
    fontSize: 16,
    color: '#444',
    fontWeight: '400',
  },
  childOptionValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  grandchildrenContainer: {
    marginLeft: 16,
  },
  grandchildOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  grandchildOptionTitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '300',
  },
  grandchildOptionValue: {
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
  parentOptionItem: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  parentOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  parentOptionValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  parentOptionDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff',
  },
});
