import { useOnboarding } from '@/app/context/onboarding';
import { useProduct } from '@/app/context/product';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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

interface Media {
  id: number;
  parentid: number | null;
  type: string;
  url: string;
  order: number;
}

export default function MediaScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [filteredMediaItems, setFilteredMediaItems] = useState<Media[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [parentMediaModalVisible, setParentMediaModalVisible] = useState(false);
  const [selectedParentMedia, setSelectedParentMedia] = useState<Media | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [newMedia, setNewMedia] = useState<Partial<Media>>({
    type: 'image',
    url: '',
    order: 0,
    parentid: null
  });
  const { profileData } = useOnboarding();
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Media" when the component mounts
  useEffect(() => {
    const mediaItem = {
      id: '12',
      name: 'Media'
    };
    setSelectedProduct(mediaItem);

    // Clean up when component unmounts
    return () => {
      setSelectedProduct(null);
    };
  }, []);

  const fetchMedia = async () => {
    try {
      setIsLoading(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch media
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
                sql: 'SELECT id, parentid, type, url, "order" FROM media ORDER BY "order" LIMIT 100'
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
            const mediaData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                parentid: row[1].type === 'null' ? null : parseInt(row[1].value),
                type: row[2].type === 'null' ? '' : row[2].value,
                url: row[3].type === 'null' ? '' : row[3].value,
                order: row[4].type === 'null' ? 0 : parseInt(row[4].value)
              };
            });

            console.log('Transformed media data:', JSON.stringify(mediaData, null, 2));
            setMediaItems(mediaData);
            setFilteredMediaItems(mediaData);
          } else {
            console.log('No media data found in response');
            setMediaItems([]);
            setFilteredMediaItems([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setMediaItems([]);
          setFilteredMediaItems([]);
        }
      } else {
        console.error('Failed to fetch media:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch media. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching media. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addMedia = async () => {
    try {
      if (!newMedia.url) {
        Alert.alert('Error', 'Media URL is required');
        return;
      }

      if (!newMedia.type) {
        Alert.alert('Error', 'Media type is required');
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
              sql: `INSERT INTO media (
                parentid, type, url, "order"
              ) VALUES (
                ${newMedia.parentid === null ? 'NULL' : Number(newMedia.parentid)},
                '${(newMedia.type || '').replace(/'/g, "''")}',
                '${(newMedia.url || '').replace(/'/g, "''")}',
                ${newMedia.order || 0}
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
        setNewMedia({
          type: 'image',
          url: '',
          order: 0,
          parentid: null
        });
        setSelectedParentMedia(null);
        setModalVisible(false);

        // Refresh the media list
        fetchMedia();

        Alert.alert(
          'Success',
          'Media added successfully',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to add media:', responseText);
        Alert.alert(
          'Error',
          'Failed to add media. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the media. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Edit media function
  const editMedia = async () => {
    if (!selectedMedia) return;
    
    try {
      if (!selectedMedia.url) {
        Alert.alert('Error', 'Media URL is required');
        return;
      }

      if (!selectedMedia.type) {
        Alert.alert('Error', 'Media type is required');
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
              sql: `UPDATE media SET
                type = '${(selectedMedia.type || '').replace(/'/g, "''")}',
                url = '${(selectedMedia.url || '').replace(/'/g, "''")}',
                "order" = ${selectedMedia.order || 0},
                parentid = ${selectedMedia.parentid === null ? 'NULL' : Number(selectedMedia.parentid)}
                WHERE id = ${selectedMedia.id}`
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
        setSelectedMedia(null);
        setSelectedParentMedia(null);
        setEditModalVisible(false);

        // Refresh the media list
        fetchMedia();

        Alert.alert(
          'Success',
          'Media updated successfully',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to update media:', responseText);
        Alert.alert(
          'Error',
          'Failed to update media. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating media:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the media. Please try again.',
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
      setFilteredMediaItems(mediaItems);
    } else {
      const searchTerms = text.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      const filtered = mediaItems.filter(media => {
        if (!media) return false;
        
        // Normalize searchable fields to lower case strings
        const type = (media.type || '').toLowerCase();
        const url = (media.url || '').toLowerCase();
        
        // Check each search term against all fields
        return searchTerms.some(term => 
          type.includes(term) || 
          url.includes(term)
        );
      });
      
      setFilteredMediaItems(filtered);
    }
  };

  // Handle URL change
  const handleUrlChange = (url: string) => {
    setNewMedia({
      ...newMedia,
      url
    });
  };

  // Handle parent media selection
  const handleParentMediaSelect = (media: Media) => {
    setSelectedParentMedia(media);
    setNewMedia({
      ...newMedia,
      parentid: media.id
    });
    setParentMediaModalVisible(false);
  };

  // Reset parent media
  const resetParentMedia = () => {
    setSelectedParentMedia(null);
    setNewMedia({
      ...newMedia,
      parentid: null
    });
  };

  // Handle edit button press
  const handleEditMedia = (media: Media) => {
    setSelectedMedia({...media});
    
    // Set the parent media if it exists
    if (media.parentid !== null) {
      const parentMedia = mediaItems.find(m => m.id === media.parentid);
      if (parentMedia) {
        setSelectedParentMedia(parentMedia);
      } else {
        setSelectedParentMedia(null);
      }
    } else {
      setSelectedParentMedia(null);
    }
    
    setEditModalVisible(true);
  };
  
  // Handle parent media selection for edit
  const handleEditParentMediaSelect = (media: Media) => {
    setSelectedParentMedia(media);
    if (selectedMedia) {
      setSelectedMedia({
        ...selectedMedia,
        parentid: media.id
      });
    }
    setParentMediaModalVisible(false);
  };
  
  // Reset parent media for edit
  const resetEditParentMedia = () => {
    setSelectedParentMedia(null);
    if (selectedMedia) {
      setSelectedMedia({
        ...selectedMedia,
        parentid: null
      });
    }
  };
  
  // Handle edit URL change
  const handleEditUrlChange = (url: string) => {
    if (selectedMedia) {
      setSelectedMedia({
        ...selectedMedia,
        url
      });
    }
  };

  // Fetch media on component mount
  useEffect(() => {
    fetchMedia();
  }, []);

  // Update selected parent media when mediaItems change
  useEffect(() => {
    if (newMedia.parentid && mediaItems.length > 0) {
      const parent = mediaItems.find(m => m.id === newMedia.parentid);
      if (parent) {
        setSelectedParentMedia(parent);
      }
    }
  }, [mediaItems, newMedia.parentid]);

  // Get parent mediaItems and organize children under them
  const getOrganizedMedia = () => {
    let mediaToDisplay;
    
    // If we're searching, show all media that match regardless of hierarchy
    if (searchQuery.trim() !== '') {
      // Find all parent IDs of matched media to ensure they're shown
      const parentIdsToInclude = new Set<number | null>();
      
      // Add all matched media
      filteredMediaItems.forEach(media => {
        // Include this media's parent chain
        let current = media;
        while (current.parentid !== null) {
          parentIdsToInclude.add(current.parentid);
          const parent = mediaItems.find(m => m.id === current.parentid);
          if (!parent) break;
          current = parent;
        }
      });
      
      // Get all media that should be shown in the list
      mediaToDisplay = mediaItems.filter(m => 
        // Include if it's in filtered results or if it's a necessary parent
        filteredMediaItems.some(fm => fm.id === m.id) || 
        parentIdsToInclude.has(m.id)
      );
    } else {
      // Not searching, use normal filtered media
      mediaToDisplay = filteredMediaItems;
    }
    
    // First, identify root media (no parent)
    const rootMedia = mediaToDisplay.filter(m => m.parentid === null);
    
    // Create a map to hold sub-media for each parent
    const childrenMap = new Map<number, Media[]>();
    
    // Group children by parent ID
    mediaToDisplay.forEach(media => {
      if (media.parentid !== null) {
        const children = childrenMap.get(media.parentid) || [];
        children.push(media);
        childrenMap.set(media.parentid, children);
      }
    });
    
    // Return the organized structure
    return { rootMedia, childrenMap };
  };

  const { rootMedia, childrenMap } = getOrganizedMedia();

  // Helper function to get media type display name
  const getMediaTypeDisplay = (type: string) => {
    switch(type.toLowerCase()) {
      case 'image': return 'Image';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'document': return 'Document';
      default: return type;
    }
  };

  // Media type options for selection
  const mediaTypeOptions = [
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'document', label: 'Document' },
  ];

  // Handle media type selection
  const handleMediaTypeSelect = (type: string) => {
    setNewMedia({
      ...newMedia,
      type
    });
  };

  // Handle editing media type
  const handleEditMediaTypeSelect = (type: string) => {
    if (selectedMedia) {
      setSelectedMedia({
        ...selectedMedia,
        type
      });
    }
  };

  // Render a root media item with its children
  const renderMediaWithChildren = ({ item }: { item: Media }) => {
    const children = childrenMap.get(item.id) || [];
    const isMatch = searchQuery.trim() !== '' && 
      ((item.type || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
       (item.url || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <View style={styles.mediaGroup}>
        {/* Parent media */}
        <TouchableOpacity 
          style={[
            styles.parentMediaRow,
            isMatch ? styles.highlightedRow : null
          ]}
          onPress={() => handleEditMedia(item)}
        >
          <View style={styles.mediaPreviewContainer}>
            {item.type === 'image' && item.url ? (
              <Image 
                source={{ uri: item.url }} 
                style={styles.mediaPreview} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mediaTypeIconContainer}>
                <Ionicons 
                  name={
                    item.type === 'video' ? 'videocam' : 
                    item.type === 'audio' ? 'musical-notes' : 
                    item.type === 'document' ? 'document-text' : 'image'
                  } 
                  size={24} 
                  color="#999" 
                />
              </View>
            )}
          </View>
          
          <View style={styles.mediaInfo}>
            <Text style={styles.mediaType}>{getMediaTypeDisplay(item.type || '')}</Text>
            <Text style={styles.mediaUrl} numberOfLines={1} ellipsizeMode="middle">
              {item.url}
            </Text>
            <Text style={styles.mediaOrder}>Order: {item.order}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Children/sub-media */}
        {children.length > 0 && (
          <View style={styles.childrenContainer}>
            {children.map((child) => {
              // Get grandchildren for this child
              const grandChildren = childrenMap.get(child.id) || [];
              const isChildMatch = searchQuery.trim() !== '' && 
                ((child.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (child.url || '').toLowerCase().includes(searchQuery.toLowerCase()));
              
              return (
                <View key={child.id}>
                  <TouchableOpacity 
                    style={[
                      styles.childMediaRow,
                      isChildMatch ? styles.highlightedRow : null
                    ]}
                    onPress={() => handleEditMedia(child)}
                  >
                    <View style={styles.mediaPreviewContainer}>
                      {child.type === 'image' && child.url ? (
                        <Image 
                          source={{ uri: child.url }} 
                          style={styles.mediaPreview} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.mediaTypeIconContainer}>
                          <Ionicons 
                            name={
                              child.type === 'video' ? 'videocam' : 
                              child.type === 'audio' ? 'musical-notes' : 
                              child.type === 'document' ? 'document-text' : 'image'
                            } 
                            size={20} 
                            color="#999" 
                          />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.mediaInfo}>
                      <Text style={styles.childMediaType}>{getMediaTypeDisplay(child.type || '')}</Text>
                      <Text style={styles.childMediaUrl} numberOfLines={1} ellipsizeMode="middle">
                        {child.url}
                      </Text>
                      <Text style={styles.childMediaOrder}>Order: {child.order}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Show grandchildren if they exist */}
                  {grandChildren.length > 0 && (
                    <View style={styles.grandchildrenContainer}>
                      {grandChildren.map((grandChild) => {
                        const isGrandChildMatch = searchQuery.trim() !== '' && 
                          ((grandChild.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (grandChild.url || '').toLowerCase().includes(searchQuery.toLowerCase()));
                          
                        return (
                          <TouchableOpacity 
                            key={grandChild.id}
                            style={[
                              styles.grandchildMediaRow,
                              isGrandChildMatch ? styles.highlightedRow : null
                            ]}
                            onPress={() => handleEditMedia(grandChild)}
                          >
                            <View style={styles.mediaPreviewContainer}>
                              {grandChild.type === 'image' && grandChild.url ? (
                                <Image 
                                  source={{ uri: grandChild.url }} 
                                  style={styles.mediaPreview} 
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.mediaTypeIconContainer}>
                                  <Ionicons 
                                    name={
                                      grandChild.type === 'video' ? 'videocam' : 
                                      grandChild.type === 'audio' ? 'musical-notes' : 
                                      grandChild.type === 'document' ? 'document-text' : 'image'
                                    } 
                                    size={16} 
                                    color="#999" 
                                  />
                                </View>
                              )}
                            </View>
                            
                            <View style={styles.mediaInfo}>
                              <Text style={styles.grandchildMediaType}>{getMediaTypeDisplay(grandChild.type || '')}</Text>
                              <Text style={styles.grandchildMediaUrl} numberOfLines={1} ellipsizeMode="middle">
                                {grandChild.url}
                              </Text>
                              <Text style={styles.grandchildMediaOrder}>Order: {grandChild.order}</Text>
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
      <Text style={styles.emptyText}>No media found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMedia}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Get the depth of a media in the hierarchy
  const getMediaDepth = (mediaId: number | null, depthMap: Map<number, number> = new Map(), visited: Set<number> = new Set()): number => {
    // Base case: root media (null parent) has depth 0
    if (mediaId === null) return 0;
    
    // Cycle detection
    if (visited.has(mediaId)) {
      console.warn(`Circular reference detected in media hierarchy at ID: ${mediaId}`);
      return 0; // Break the cycle
    }
    
    // If we've already calculated this media's depth, return it
    if (depthMap.has(mediaId)) return depthMap.get(mediaId)!;
    
    // Add this ID to the visited set
    visited.add(mediaId);
    
    // Find the media object
    const media = mediaItems.find(m => m.id === mediaId);
    if (!media) return 0;
    
    // Calculate depth as 1 + parent's depth
    const depth = 1 + getMediaDepth(media.parentid, depthMap, visited);
    depthMap.set(mediaId, depth);
    
    // Remove this ID from visited set when done with this branch
    visited.delete(mediaId);
    
    return depth;
  };

  // Check if selecting a media as parent would exceed max depth or create a cycle
  const wouldExceedMaxDepth = (mediaId: number): boolean => {
    // Explicitly setting max depth to 2 (for 3 levels total: parent + child + grandchild)
    const MAX_DEPTH = 2; 
    
    // Special case: if we're in edit mode and this is the selected media ID,
    // it can't be a parent of itself
    if (selectedMedia && selectedMedia.id === mediaId) {
      return true;
    }
    
    // Calculate current depth of the media
    const currentDepth = getMediaDepth(mediaId);
    
    // If the current depth + 1 (for the new child) > MAX_DEPTH, it would exceed
    return currentDepth > MAX_DEPTH;
  };

  // Detect and prevent circular reference in parent selection
  const wouldCreateCycle = (parentId: number): boolean => {
    // If we're in add mode (no selected media), can't create a cycle
    if (!selectedMedia) {
      return false;
    }
    
    const childId = selectedMedia.id;
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
      
      // Find the parent of the current media
      const current = mediaItems.find(m => m.id === currentId);
      if (!current || current.parentid === null) {
        break;
      }
      
      currentId = current.parentid;
    }
    
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Media" />

      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search media..."
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
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      ) : (
        <FlatList
          data={rootMedia}
          renderItem={renderMediaWithChildren}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Media Modal */}
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
              <Text style={styles.modalTitle}>New Media</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addMedia}
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
              <Text style={styles.formLabel}>Media Type</Text>
              <View style={styles.typeSelector}>
                {mediaTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.typeOption,
                      newMedia.type === option.value && styles.selectedTypeOption
                    ]}
                    onPress={() => handleMediaTypeSelect(option.value)}
                  >
                    <Text 
                      style={[
                        styles.typeOptionText,
                        newMedia.type === option.value && styles.selectedTypeOptionText
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Media URL</Text>
              {newMedia.type === 'image' ? (
                <SingleImageUploader
                  imageUrl={newMedia.url || ''}
                  onImageChange={handleUrlChange}
                />
              ) : (
                <TextInput
                  style={styles.urlInput}
                  value={newMedia.url}
                  onChangeText={(text) => setNewMedia({ ...newMedia, url: text })}
                  placeholder={`Enter ${newMedia.type} URL`}
                  placeholderTextColor="#999"
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Order</Text>
              <TextInput
                style={styles.orderInput}
                value={newMedia.order?.toString() || '0'}
                onChangeText={(text) => {
                  const numValue = parseInt(text) || 0;
                  setNewMedia({ ...newMedia, order: numValue });
                }}
                keyboardType="number-pad"
                placeholder="Order (e.g., 1, 2, 3)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Parent Media</Text>
              <TouchableOpacity
                style={styles.parentSelector}
                onPress={() => setParentMediaModalVisible(true)}
              >
                {selectedParentMedia ? (
                  <View style={styles.selectedParentContainer}>
                    <Text style={styles.selectedParentText}>
                      {selectedParentMedia.type}: {selectedParentMedia.url?.substring(0, 30)}
                      {selectedParentMedia.url?.length > 30 ? '...' : ''}
                    </Text>
                    <TouchableOpacity 
                      style={styles.clearParentButton}
                      onPress={resetParentMedia}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.parentPlaceholder}>Select a parent media (optional)</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Media Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedMedia !== null}
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
              <Text style={styles.modalTitle}>Edit Media</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editMedia}
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

          {selectedMedia && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Media Type</Text>
                <View style={styles.typeSelector}>
                  {mediaTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.typeOption,
                        selectedMedia.type === option.value && styles.selectedTypeOption
                      ]}
                      onPress={() => handleEditMediaTypeSelect(option.value)}
                    >
                      <Text 
                        style={[
                          styles.typeOptionText,
                          selectedMedia.type === option.value && styles.selectedTypeOptionText
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Media URL</Text>
                {selectedMedia.type === 'image' ? (
                  <SingleImageUploader
                    imageUrl={selectedMedia.url || ''}
                    onImageChange={handleEditUrlChange}
                  />
                ) : (
                  <TextInput
                    style={styles.urlInput}
                    value={selectedMedia.url}
                    onChangeText={(text) => setSelectedMedia({ ...selectedMedia, url: text })}
                    placeholder={`Enter ${selectedMedia.type} URL`}
                    placeholderTextColor="#999"
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Order</Text>
                <TextInput
                  style={styles.orderInput}
                  value={selectedMedia.order?.toString()}
                  onChangeText={(text) => {
                    const numValue = parseInt(text) || 0;
                    setSelectedMedia({ ...selectedMedia, order: numValue });
                  }}
                  keyboardType="number-pad"
                  placeholder="Order (e.g., 1, 2, 3)"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Parent Media</Text>
                <TouchableOpacity
                  style={styles.parentSelector}
                  onPress={() => setParentMediaModalVisible(true)}
                >
                  {selectedParentMedia ? (
                    <View style={styles.selectedParentContainer}>
                      <Text style={styles.selectedParentText}>
                        {selectedParentMedia.type}: {selectedParentMedia.url?.substring(0, 30)}
                        {selectedParentMedia.url?.length > 30 ? '...' : ''}
                      </Text>
                      <TouchableOpacity 
                        style={styles.clearParentButton}
                        onPress={resetEditParentMedia}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.parentPlaceholder}>Select a parent media (optional)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Parent Media Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={parentMediaModalVisible}
        onRequestClose={() => setParentMediaModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <TouchableOpacity
              onPress={() => setParentMediaModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.parentModalTitle}>Parent Media</Text>
          </View>

          <FlatList
            data={mediaItems.filter(m => {
              // Only show root-level media (no parent)
              if (m.parentid !== null) {
                return false;
              }
              
              // When editing, don't show the current media as a parent option
              // Also check if selecting this media would create a cycle
              if (selectedMedia) {
                // Don't show the media itself
                if (m.id === selectedMedia.id) return false;
                
                // Check if this would create a cycle
                if (wouldCreateCycle(m.id)) return false;
              }
              
              // Check if this would exceed max depth
              return !wouldExceedMaxDepth(m.id);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.parentMediaItem}
                onPress={() => {
                  if (selectedMedia) {
                    handleEditParentMediaSelect(item);
                  } else {
                    handleParentMediaSelect(item);
                  }
                }}
              >
                <View style={styles.parentMediaItemContent}>
                  {/* Media type icon or preview */}
                  <View style={styles.parentMediaPreviewContainer}>
                    {item.type === 'image' && item.url ? (
                      <Image 
                        source={{ uri: item.url }} 
                        style={styles.parentMediaPreview} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.parentMediaTypeIcon}>
                        <Ionicons 
                          name={
                            item.type === 'video' ? 'videocam' : 
                            item.type === 'audio' ? 'musical-notes' : 
                            item.type === 'document' ? 'document-text' : 'image'
                          } 
                          size={24} 
                          color="#999" 
                        />
                      </View>
                    )}
                  </View>
                  
                  {/* Media info */}
                  <View style={styles.parentMediaInfo}>
                    <Text style={styles.parentMediaType}>{getMediaTypeDisplay(item.type || '')}</Text>
                    <Text style={styles.parentMediaUrl} numberOfLines={1} ellipsizeMode="middle">
                      {item.url}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentMediaDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No media available as parents</Text>
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
  mediaGroup: {
    marginBottom: 0,
  },
  parentMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mediaPreviewContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaTypeIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  mediaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mediaType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  mediaUrl: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    width: '100%',
  },
  mediaOrder: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  childrenContainer: {
    marginLeft: 0,
  },
  childMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  childMediaType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
  },
  childMediaUrl: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    width: '100%',
  },
  childMediaOrder: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  grandchildrenContainer: {
    marginLeft: 16,
  },
  grandchildMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  grandchildMediaType: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },
  grandchildMediaUrl: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    width: '100%',
  },
  grandchildMediaOrder: {
    fontSize: 10,
    color: '#999',
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
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  typeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  selectedTypeOption: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTypeOptionText: {
    color: '#fff',
  },
  urlInput: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  orderInput: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
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
  parentMediaItem: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  parentMediaItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentMediaPreviewContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentMediaPreview: {
    width: '100%',
    height: '100%',
  },
  parentMediaTypeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  parentMediaInfo: {
    flex: 1,
  },
  parentMediaType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  parentMediaUrl: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  parentMediaDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff',
  },
});
