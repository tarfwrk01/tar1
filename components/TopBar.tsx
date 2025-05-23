import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ProductSubItem, useProduct } from '../app/context/product';

const productSubItems: ProductSubItem[] = [
  { id: '1', name: 'Products' },
  { id: '2', name: 'Inventory' },
  { id: '3', name: 'Categories' },
  { id: '4', name: 'Collections' },
  { id: '5', name: 'Vendors' },
  { id: '6', name: 'Brands' },
  { id: '7', name: 'Warehouses' },
  { id: '8', name: 'Stores' },
  { id: '9', name: 'Tags' },
  { id: '10', name: 'Metafields' },
  { id: '11', name: 'Options' },
  { id: '12', name: 'Media' },
];

interface TopBarProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: React.ReactNode;
}

export default function TopBar({
  title = 'Chat',
  showBackButton = false,
  onBackPress,
  rightIcon
}: TopBarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState('Menu');
  const router = useRouter();
  const pathname = usePathname();
  const { selectedProduct, setSelectedProduct } = useProduct();

  // Determine the current section based on the pathname
  useEffect(() => {
    if (pathname.includes('/(primary)')) {
      setSelectedSection('Home');
    } else if (pathname.includes('/(agents)')) {
      setSelectedSection('Agents');
    } else if (pathname.includes('/(settings)')) {
      setSelectedSection('Settings');
    } else {
      setSelectedSection('Menu');
    }
  }, [pathname]);

  const navigateToProfile = () => {
    console.log('Navigating to profile screen');
    setModalVisible(false);

    // Navigate immediately without delay for instant transition
    try {
      // Use replace for instant transition without animation
      router.replace({
        pathname: '/(settings)/profile',
        params: { from: 'topbar' }
      });
      console.log('Instant navigation to profile initiated');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback if needed
      router.navigate('/(settings)/profile');
    }
  };

  const navigateToSettings = () => {
    setModalVisible(false);
    // You can implement settings navigation here
    // For now, we'll just close the modal
    console.log('Navigate to settings (not implemented)');
  };

  const navigateToAgents = () => {
    console.log('Navigating to agents screen');
    setModalVisible(false);

    // Navigate immediately without delay for instant transition
    try {
      // Use replace for instant transition without animation
      router.replace('/(agents)');
      console.log('Instant navigation to agents initiated');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to another approach if needed
      router.navigate('/(agents)');
      console.log('Fallback navigation to agents initiated');
    }
  };

  const handleSubItemPress = (item: ProductSubItem) => {
    console.log(`Selected ${item.name}`);
    setModalVisible(false);

    // If "Products" is selected, navigate to the products screen
    if (item.name === 'Products') {
      router.push('/(agents)/(products)/products');
      return;
    }

    // If "Categories" is selected, navigate to the categories screen
    if (item.name === 'Categories') {
      router.push('/(agents)/(products)/categories');
      return;
    }

    // If "Collections" is selected, navigate to the collections screen
    if (item.name === 'Collections') {
      router.push('/(agents)/(products)/collections');
      return;
    }

    // If "Vendors" is selected, navigate to the vendors screen
    if (item.name === 'Vendors') {
      router.push('/(agents)/(products)/vendors');
      return;
    }

    // If "Brands" is selected, navigate to the brands screen
    if (item.name === 'Brands') {
      router.push('/(agents)/(products)/brands');
      return;
    }

    // If "Warehouses" is selected, navigate to the warehouses screen
    if (item.name === 'Warehouses') {
      router.push('/(agents)/(products)/warehouses');
      return;
    }

    // If "Stores" is selected, navigate to the stores screen
    if (item.name === 'Stores') {
      router.push('/(agents)/(products)/stores');
      return;
    }

    // If "Tags" is selected, navigate to the tags screen
    if (item.name === 'Tags') {
      router.push('/(agents)/(products)/tags');
      return;
    }

    // If "Metafields" is selected, navigate to the metafields screen
    if (item.name === 'Metafields') {
      router.push('/(agents)/(products)/metafields');
      return;
    }

    // If "Options" is selected, navigate to the options screen
    if (item.name === 'Options') {
      router.push('/(agents)/(products)/options');
      return;
    }

    // If "Media" is selected, navigate to the media screen
    if (item.name === 'Media') {
      router.push('/(agents)/(products)/media');
      return;
    }

    // If "Inventory" is selected, navigate to the inventory screen
    if (item.name === 'Inventory') {
      router.push('/(agents)/(products)/inventory');
      return;
    }

    // For other items, set the selected product in context
    setSelectedProduct(item);

    // Navigate to primary workspace if not already there
    if (!pathname.includes('/(primary)')) {
      router.replace('/(primary)');
    }
  };

  const renderSubItem = ({ item }: { item: ProductSubItem }) => (
    <TouchableOpacity
      style={styles.subItemContainer}
      onPress={() => handleSubItemPress(item)}
    >
      <Text style={styles.subItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductSection = () => (
    <View style={styles.productSection}>
      <Text style={styles.sectionHeader}>Product</Text>
      <FlatList
        data={productSubItems}
        renderItem={renderSubItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <>
      {/* Top Bar */}
      <View style={styles.topBar}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={1} // Prevent background color change on tap
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setModalVisible(true)}
            activeOpacity={1} // Prevent background color change on tap
          >
            <Text style={styles.menuCardText}>{selectedProduct ? selectedProduct.name : selectedSection}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.rightPlaceholder}>
          {rightIcon}
        </View>
      </View>

      {/* Full Screen Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Down arrow button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="chevron-down" size={28} color="#333" />
          </TouchableOpacity>

          {/* Modal content */}
          <View style={styles.modalContent}>
            {renderProductSection()}
          </View>

          {/* Bottom fixed icons - Left aligned without labels */}
          <View style={styles.bottomIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToAgents}
              activeOpacity={1} // Prevent background color change on tap
            >
              <Text style={styles.emojiIcon}>🕹️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToProfile}
              activeOpacity={1} // Prevent background color change on tap
            >
              <Text style={styles.emojiIcon}>👋</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToSettings}
              activeOpacity={1} // Prevent background color change on tap
            >
              <Text style={styles.emojiIcon}>🎮</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 1,
  },
  menuCard: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuCardText: {
    fontSize: 14,
    color: '#333',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  rightPlaceholder: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 50, // Adjusted for the smaller bottom bar
    backgroundColor: 'white',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  modalContent: {
    flex: 1,
    paddingTop: 10,
  },
  productSection: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  subItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subItemText: {
    fontSize: 16,
  },
  bottomIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 36,
    marginRight: 16,
    padding: 0,
  },
  emojiIcon: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 36,
  },
});
