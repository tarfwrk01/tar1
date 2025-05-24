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
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../../components/TopBar';
import ImageUploader from './ImageUploader';
import VerticalTabView from './VerticalTabView';

type Product = {
  id: number;
  title: string;
  images: string; // JSON array of URLs
  excerpt: string;
  notes: string;
  type: string; // physical, digital, service
  category: string;
  collection: string;
  unit: string;
  price: number;
  saleprice: number;
  vendor: string;
  brand: string;
  options: string; // JSON array of option IDs
  modifiers: string;
  metafields: string;
  saleinfo: string;
  stores: string;
  location: string;
  saleschannel: string;
  pos: number; // BOOLEAN stored as INTEGER (0 or 1)
  website: number; // BOOLEAN stored as INTEGER (0 or 1)
  seo: string; // JSON with slug, title, keywords
  tags: string;
  cost: number;
  barcode: string;
  createdat: string;
  updatedat: string;
  publishat: string;
  publish: string; // active, draft, archived
  promoinfo: string;
  featured: number; // BOOLEAN stored as INTEGER (0 or 1)
  relproducts: string; // JSON array of product IDs
  sellproducts: string; // JSON array of product IDs
};

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

export default function ProductsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    title: '',
    images: '[]', // Empty JSON array
    excerpt: '',
    notes: '',
    type: 'physical',
    category: '',
    collection: '',
    unit: '',
    price: 0,
    saleprice: 0,
    vendor: '',
    brand: '',
    options: '[]', // Empty JSON array
    modifiers: '',
    metafields: '',
    saleinfo: '',
    stores: '',
    location: '',
    saleschannel: '',
    pos: 0,
    website: 0,
    seo: '{"slug":"", "title":"", "keywords":""}',
    tags: '',
    cost: 0,
    barcode: '',
    publish: 'draft',
    promoinfo: '',
    featured: 0,
    relproducts: '[]', // Empty JSON array
    sellproducts: '[]', // Empty JSON array
  });
  const { profileData } = useOnboarding();

  const fetchProducts = async () => {
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

      // Create request body with direct SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "SELECT id, title, price, type FROM products ORDER BY id DESC LIMIT 100"
            }
          }
        ]
      };

      console.log('Fetching products from:', apiUrl);
      console.log('Fetch request body:', JSON.stringify(requestBody, null, 2));

      // Fetch products
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
            const productData = rows.map((row: any[]) => {
              return {
                id: parseInt(row[0].value),
                title: row[1].value,
                price: row[2].type === 'null' ? 0 : parseFloat(row[2].value),
                type: row[3].type === 'null' ? '' : row[3].value
              };
            });

            console.log('Transformed product data:', JSON.stringify(productData, null, 2));
            setProducts(productData);
            setFilteredProducts(productData);
          } else {
            console.log('No product data found in response');
            setProducts([]);
            setFilteredProducts([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setProducts([]);
          setFilteredProducts([]);
        }
      } else {
        console.error('Failed to fetch products:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch products. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching products. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };



  const addProduct = async () => {
    try {
      if (!newProduct.title) {
        Alert.alert('Error', 'Product title is required');
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
              sql: `INSERT INTO products (
                title, images, excerpt, notes, type, category, collection, unit,
                price, saleprice, vendor, brand, options, modifiers, metafields,
                saleinfo, stores, location, saleschannel, pos, website, seo,
                tags, cost, barcode, createdat, updatedat, publishat, publish,
                promoinfo, featured, relproducts, sellproducts
              ) VALUES (
                '${(newProduct.title || '').replace(/'/g, "''")}',
                '${(newProduct.images || '[]').replace(/'/g, "''")}',
                '${(newProduct.excerpt || '').replace(/'/g, "''")}',
                '${(newProduct.notes || '').replace(/'/g, "''")}',
                '${(newProduct.type || 'physical').replace(/'/g, "''")}',
                '${(newProduct.category || '').replace(/'/g, "''")}',
                '${(newProduct.collection || '').replace(/'/g, "''")}',
                '${(newProduct.unit || '').replace(/'/g, "''")}',
                ${newProduct.price || 0},
                ${newProduct.saleprice || 0},
                '${(newProduct.vendor || '').replace(/'/g, "''")}',
                '${(newProduct.brand || '').replace(/'/g, "''")}',
                '${(newProduct.options || '[]').replace(/'/g, "''")}',
                '${(newProduct.modifiers || '').replace(/'/g, "''")}',
                '${(newProduct.metafields || '').replace(/'/g, "''")}',
                '${(newProduct.saleinfo || '').replace(/'/g, "''")}',
                '${(newProduct.stores || '').replace(/'/g, "''")}',
                '${(newProduct.location || '').replace(/'/g, "''")}',
                '${(newProduct.saleschannel || '').replace(/'/g, "''")}',
                ${newProduct.pos || 0},
                ${newProduct.website || 0},
                '${(newProduct.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                '${(newProduct.tags || '').replace(/'/g, "''")}',
                ${newProduct.cost || 0},
                '${(newProduct.barcode || '').replace(/'/g, "''")}',
                '${now}',
                '${now}',
                '${now}',
                '${(newProduct.publish || 'draft').replace(/'/g, "''")}',
                '${(newProduct.promoinfo || '').replace(/'/g, "''")}',
                ${newProduct.featured || 0},
                '${(newProduct.relproducts || '[]').replace(/'/g, "''")}',
                '${(newProduct.sellproducts || '[]').replace(/'/g, "''")}'
              )`
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('API URL:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Create product
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
        setNewProduct({
          title: '',
          images: '[]',
          excerpt: '',
          notes: '',
          type: 'physical',
          category: '',
          collection: '',
          unit: '',
          price: 0,
          saleprice: 0,
          vendor: '',
          brand: '',
          options: '[]',
          modifiers: '',
          metafields: '',
          saleinfo: '',
          stores: '',
          location: '',
          saleschannel: '',
          pos: 0,
          website: 0,
          seo: '{"slug":"", "title":"", "keywords":""}',
          tags: '',
          cost: 0,
          barcode: '',
          publish: 'draft',
          promoinfo: '',
          featured: 0,
          relproducts: '[]',
          sellproducts: '[]',
        });
        setModalVisible(false);

        // Refresh product list
        fetchProducts();

        Alert.alert('Success', 'Product added successfully');
      } else {
        console.error('Failed to add product:', responseText);
        Alert.alert(
          'Error',
          'Failed to add product. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding the product. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const editProduct = async () => {
    if (!selectedProductForEdit) return;

    try {
      if (!selectedProductForEdit.title) {
        Alert.alert('Error', 'Product title is required');
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

      // Current date for updated timestamp
      const now = new Date().toISOString();

      // Create the update SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `UPDATE products SET
                title = '${(selectedProductForEdit.title || '').replace(/'/g, "''")}',
                images = '${(selectedProductForEdit.images || '[]').replace(/'/g, "''")}',
                excerpt = '${(selectedProductForEdit.excerpt || '').replace(/'/g, "''")}',
                notes = '${(selectedProductForEdit.notes || '').replace(/'/g, "''")}',
                type = '${(selectedProductForEdit.type || 'physical').replace(/'/g, "''")}',
                category = '${(selectedProductForEdit.category || '').replace(/'/g, "''")}',
                collection = '${(selectedProductForEdit.collection || '').replace(/'/g, "''")}',
                unit = '${(selectedProductForEdit.unit || '').replace(/'/g, "''")}',
                price = ${selectedProductForEdit.price || 0},
                saleprice = ${selectedProductForEdit.saleprice || 0},
                vendor = '${(selectedProductForEdit.vendor || '').replace(/'/g, "''")}',
                brand = '${(selectedProductForEdit.brand || '').replace(/'/g, "''")}',
                options = '${(selectedProductForEdit.options || '[]').replace(/'/g, "''")}',
                modifiers = '${(selectedProductForEdit.modifiers || '').replace(/'/g, "''")}',
                metafields = '${(selectedProductForEdit.metafields || '').replace(/'/g, "''")}',
                saleinfo = '${(selectedProductForEdit.saleinfo || '').replace(/'/g, "''")}',
                stores = '${(selectedProductForEdit.stores || '').replace(/'/g, "''")}',
                location = '${(selectedProductForEdit.location || '').replace(/'/g, "''")}',
                saleschannel = '${(selectedProductForEdit.saleschannel || '').replace(/'/g, "''")}',
                pos = ${selectedProductForEdit.pos || 0},
                website = ${selectedProductForEdit.website || 0},
                seo = '${(selectedProductForEdit.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                tags = '${(selectedProductForEdit.tags || '').replace(/'/g, "''")}',
                cost = ${selectedProductForEdit.cost || 0},
                barcode = '${(selectedProductForEdit.barcode || '').replace(/'/g, "''")}',
                updatedat = '${now}',
                publish = '${(selectedProductForEdit.publish || 'draft').replace(/'/g, "''")}',
                promoinfo = '${(selectedProductForEdit.promoinfo || '').replace(/'/g, "''")}',
                featured = ${selectedProductForEdit.featured || 0},
                relproducts = '${(selectedProductForEdit.relproducts || '[]').replace(/'/g, "''")}',
                sellproducts = '${(selectedProductForEdit.sellproducts || '[]').replace(/'/g, "''")}'
                WHERE id = ${selectedProductForEdit.id}`
            }
          }
        ]
      };

      console.log('Edit API URL:', apiUrl);
      console.log('Edit Request body:', JSON.stringify(requestBody, null, 2));

      // Update product
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log('Edit response status:', response.status);
      console.log('Edit response text:', responseText);

      if (response.ok) {
        // Reset form and close modal
        setSelectedProductForEdit(null);
        setEditModalVisible(false);

        // Refresh product list
        fetchProducts();

        Alert.alert('Success', 'Product updated successfully');
      } else {
        console.error('Failed to update product:', responseText);
        Alert.alert(
          'Error',
          'Failed to update product. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the product. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryForProduct = async (productId: number) => {
    try {
      setInventoryLoading(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create request body with direct SQL
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `SELECT id, productId, sku, quantity, warehouse, cost, price, option1, option2, option3, reorderlevel, reorderqty, expiry, batchno, margin, saleprice, image FROM inventory WHERE productId = ${productId} ORDER BY id DESC LIMIT 100`
            }
          }
        ]
      };

      console.log('Fetching inventory for product:', productId);
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
                price: row[6].type === 'null' ? 0 : parseFloat(row[6].value),
                option1: row[7].type === 'null' ? '' : row[7].value,
                option2: row[8].type === 'null' ? '' : row[8].value,
                option3: row[9].type === 'null' ? '' : row[9].value,
                reorderlevel: row[10].type === 'null' ? 0 : parseInt(row[10].value),
                reorderqty: row[11].type === 'null' ? 0 : parseInt(row[11].value),
                expiry: row[12].type === 'null' ? '' : row[12].value,
                batchno: row[13].type === 'null' ? '' : row[13].value,
                margin: row[14].type === 'null' ? 0 : parseFloat(row[14].value),
                saleprice: row[15].type === 'null' ? 0 : parseFloat(row[15].value),
                image: row[16].type === 'null' ? '' : row[16].value
              };
            });

            console.log('Transformed inventory data:', JSON.stringify(inventoryData, null, 2));
            console.log('Setting inventory state with', inventoryData.length, 'items');
            setInventory(inventoryData);
          } else {
            console.log('No inventory data found in response');
            setInventory([]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          setInventory([]);
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
      setInventoryLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Start with all products or filtered by type if a filter is active
    let baseProducts = products;
    if (activeFilter) {
      baseProducts = products.filter(p => p.type === activeFilter);
    }

    // Then apply search filter
    if (text.trim() === '') {
      setFilteredProducts(baseProducts);
    } else {
      const filtered = baseProducts.filter(product =>
        product.title?.toLowerCase().includes(text.toLowerCase()) ||
        product.type?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle edit button press
  const handleEditProduct = (product: Product) => {
    setSelectedProductForEdit({...product});
    setEditModalVisible(true);
    // Fetch inventory for the selected product
    fetchInventoryForProduct(product.id);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productItem,
        selectedProductForInventory?.id === item.id && styles.selectedProductItem
      ]}
      onPress={() => {
        setSelectedProductForInventory(item);
        fetchInventoryForProduct(item.id);
      }}
      onLongPress={() => handleEditProduct(item)}
    >
      <View style={styles.productContent}>
        <Text style={styles.productTitle}>{item.title || 'Untitled Product'}</Text>
        <Text style={styles.productSubtitle}>ID: {item.id} | Type: {item.type}</Text>
        <Text style={styles.productPrice}>Price: ${item.price?.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEditProduct(item)}
      >
        <Ionicons name="create-outline" size={20} color="#0066CC" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No products found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchProducts}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItem}>
      <Text style={styles.inventoryTitle}>{item.sku || 'No SKU'}</Text>
      <Text style={styles.inventorySubtitle}>Qty: {item.quantity} | Warehouse: {item.warehouse}</Text>
      <Text style={styles.inventoryPrice}>Cost: ${item.cost?.toFixed(2)} | Price: ${item.price?.toFixed(2)}</Text>
      {item.option1 && <Text style={styles.inventoryOption}>Option 1: {item.option1}</Text>}
      {item.option2 && <Text style={styles.inventoryOption}>Option 2: {item.option2}</Text>}
      {item.option3 && <Text style={styles.inventoryOption}>Option 3: {item.option3}</Text>}
    </View>
  );

  const renderInventoryEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {selectedProductForInventory
          ? `No inventory found for "${selectedProductForInventory.title}"`
          : 'Select a product to view its inventory'
        }
      </Text>
      {selectedProductForInventory && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchInventoryForProduct(selectedProductForInventory.id)}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Import the useProduct hook
  const { setSelectedProduct } = useProduct();

  // Set the selected product to "Products" when the component mounts
  useEffect(() => {
    // Find the Products item in the product sub-items
    const productsItem = {
      id: '1',
      name: 'Products'
    };

    // Set it as the selected product
    setSelectedProduct(productsItem);

    // Clean up when component unmounts
    return () => {
      // Reset selected product when leaving this screen
      setSelectedProduct(null);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Products" />

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
            placeholder="Search products..."
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
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}



      {/* Add Product Modal */}
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
            <Text style={styles.modalTitle}>New Product</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addProduct}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <VerticalTabView
            tabs={[
              { key: 'core', icon: 'cube-outline', label: 'Core' },
              { key: 'organization', icon: 'folder-outline', label: 'Organization' },
              { key: 'media', icon: 'image-outline', label: 'Media' },
              { key: 'options', icon: 'options-outline', label: 'Options' },
              { key: 'notes', icon: 'document-text-outline', label: 'Notes' },
              { key: 'sales', icon: 'cash-outline', label: 'Sales' },
              { key: 'channels', icon: 'globe-outline', label: 'Channels' },
              { key: 'seo', icon: 'search-outline', label: 'SEO' },
              { key: 'inventory', icon: 'layers-outline', label: 'Inventory' }
            ]}
          >
            {/* Core Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.title}
                  onChangeText={(text) => setNewProduct({...newProduct, title: text})}
                  placeholder="Product title"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Price *</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.price?.toString()}
                  onChangeText={(text) => setNewProduct({...newProduct, price: parseFloat(text) || 0})}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Sale Price</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.saleprice?.toString()}
                  onChangeText={(text) => setNewProduct({...newProduct, saleprice: parseFloat(text) || 0})}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Cost</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.cost?.toString()}
                  onChangeText={(text) => setNewProduct({...newProduct, cost: parseFloat(text) || 0})}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Excerpt</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.excerpt}
                  onChangeText={(text) => setNewProduct({...newProduct, excerpt: text})}
                  placeholder="Short description"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Organization Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.type === 'physical' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, type: 'physical'})}
                  >
                    <Text style={newProduct.type === 'physical' ? styles.typeTextActive : styles.typeText}>
                      Physical
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.type === 'digital' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, type: 'digital'})}
                  >
                    <Text style={newProduct.type === 'digital' ? styles.typeTextActive : styles.typeText}>
                      Digital
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.type === 'service' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, type: 'service'})}
                  >
                    <Text style={newProduct.type === 'service' ? styles.typeTextActive : styles.typeText}>
                      Service
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.category}
                  onChangeText={(text) => setNewProduct({...newProduct, category: text})}
                  placeholder="Product category"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Collection</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.collection}
                  onChangeText={(text) => setNewProduct({...newProduct, collection: text})}
                  placeholder="Product collection"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.unit}
                  onChangeText={(text) => setNewProduct({...newProduct, unit: text})}
                  placeholder="Unit of measurement"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Vendor</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.vendor}
                  onChangeText={(text) => setNewProduct({...newProduct, vendor: text})}
                  placeholder="Product vendor"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Brand</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.brand}
                  onChangeText={(text) => setNewProduct({...newProduct, brand: text})}
                  placeholder="Product brand"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Tags</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.tags}
                  onChangeText={(text) => setNewProduct({...newProduct, tags: text})}
                  placeholder="Product tags (comma separated)"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Barcode</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.barcode}
                  onChangeText={(text) => setNewProduct({...newProduct, barcode: text})}
                  placeholder="Product barcode/SKU"
                />
              </View>
            </View>

            {/* Media Tab */}
            <View>
              <View style={styles.formField}>
                <ImageUploader
                  images={newProduct.images || '[]'}
                  onImagesChange={(images) =>
                    setNewProduct({...newProduct, images: JSON.stringify(images)})
                  }
                />
              </View>
            </View>

            {/* Options Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Options</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.options === '[]' ? '' : newProduct.options}
                  onChangeText={(text) => setNewProduct({...newProduct, options: text || '[]'})}
                  placeholder="Product options (JSON format)"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Modifiers</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.modifiers}
                  onChangeText={(text) => setNewProduct({...newProduct, modifiers: text})}
                  placeholder="Product modifiers"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Metafields</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.metafields}
                  onChangeText={(text) => setNewProduct({...newProduct, metafields: text})}
                  placeholder="Product metafields"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Notes Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.notes}
                  onChangeText={(text) => setNewProduct({...newProduct, notes: text})}
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={6}
                />
              </View>
            </View>

            {/* Sales Tab */}
            <View>
              <View style={styles.switchField}>
                <Text style={styles.inputLabel}>Featured Product</Text>
                <Switch
                  value={newProduct.featured === 1}
                  onValueChange={(value) => setNewProduct({...newProduct, featured: value ? 1 : 0})}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Sale Info</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.saleinfo}
                  onChangeText={(text) => setNewProduct({...newProduct, saleinfo: text})}
                  placeholder="Sale information"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Promo Info</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.promoinfo}
                  onChangeText={(text) => setNewProduct({...newProduct, promoinfo: text})}
                  placeholder="Promotion information"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Related Products</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.relproducts === '[]' ? '' : newProduct.relproducts}
                  onChangeText={(text) => setNewProduct({...newProduct, relproducts: text || '[]'})}
                  placeholder="Related products (JSON format)"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Sell Products</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.sellproducts === '[]' ? '' : newProduct.sellproducts}
                  onChangeText={(text) => setNewProduct({...newProduct, sellproducts: text || '[]'})}
                  placeholder="Sell products (JSON format)"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Channels Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Stores</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.stores}
                  onChangeText={(text) => setNewProduct({...newProduct, stores: text})}
                  placeholder="Stores"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.location}
                  onChangeText={(text) => setNewProduct({...newProduct, location: text})}
                  placeholder="Location"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Sales Channel</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.saleschannel}
                  onChangeText={(text) => setNewProduct({...newProduct, saleschannel: text})}
                  placeholder="Sales channel"
                />
              </View>

              <View style={styles.switchField}>
                <Text style={styles.inputLabel}>POS</Text>
                <Switch
                  value={newProduct.pos === 1}
                  onValueChange={(value) => setNewProduct({...newProduct, pos: value ? 1 : 0})}
                />
              </View>

              <View style={styles.switchField}>
                <Text style={styles.inputLabel}>Website</Text>
                <Switch
                  value={newProduct.website === 1}
                  onValueChange={(value) => setNewProduct({...newProduct, website: value ? 1 : 0})}
                />
              </View>
            </View>

            {/* SEO Tab */}
            <View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>SEO</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.seo === '{"slug":"", "title":"", "keywords":""}' ? '' : newProduct.seo}
                  onChangeText={(text) => setNewProduct({...newProduct, seo: text || '{"slug":"", "title":"", "keywords":""}'})}
                  placeholder="SEO information (JSON format)"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Publish Status</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.publish === 'draft' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, publish: 'draft'})}
                  >
                    <Text style={newProduct.publish === 'draft' ? styles.typeTextActive : styles.typeText}>
                      Draft
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.publish === 'active' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, publish: 'active'})}
                  >
                    <Text style={newProduct.publish === 'active' ? styles.typeTextActive : styles.typeText}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.publish === 'archived' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewProduct({...newProduct, publish: 'archived'})}
                  >
                    <Text style={newProduct.publish === 'archived' ? styles.typeTextActive : styles.typeText}>
                      Archived
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Inventory Tab */}
            <View>
              <View style={styles.noProductSelected}>
                <Text style={styles.noProductText}>
                  Inventory will be available after the product is created
                </Text>
              </View>
            </View>
          </VerticalTabView>
        </SafeAreaView>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible && selectedProductForEdit !== null}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              {selectedProductForEdit?.title || 'Edit Product'}
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editProduct}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedProductForEdit && (
            <VerticalTabView
              tabs={[
                { key: 'core', icon: 'cube-outline', label: 'Core' },
                { key: 'organization', icon: 'folder-outline', label: 'Organization' },
                { key: 'media', icon: 'image-outline', label: 'Media' },
                { key: 'options', icon: 'options-outline', label: 'Options' },
                { key: 'notes', icon: 'document-text-outline', label: 'Notes' },
                { key: 'sales', icon: 'cash-outline', label: 'Sales' },
                { key: 'channels', icon: 'globe-outline', label: 'Channels' },
                { key: 'seo', icon: 'search-outline', label: 'SEO' },
                { key: 'inventory', icon: 'layers-outline', label: 'Inventory' }
              ]}
            >
              {/* Core Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.title}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, title: text})}
                    placeholder="Product title"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.price?.toString()}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, price: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Sale Price</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.saleprice?.toString()}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, saleprice: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Cost</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.cost?.toString()}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, cost: parseFloat(text) || 0})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Excerpt</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.excerpt}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, excerpt: text})}
                    placeholder="Short description"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Organization Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.typeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.type === 'physical' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, type: 'physical'})}
                    >
                      <Text style={selectedProductForEdit.type === 'physical' ? styles.typeTextActive : styles.typeText}>
                        Physical
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.type === 'digital' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, type: 'digital'})}
                    >
                      <Text style={selectedProductForEdit.type === 'digital' ? styles.typeTextActive : styles.typeText}>
                        Digital
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.type === 'service' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, type: 'service'})}
                    >
                      <Text style={selectedProductForEdit.type === 'service' ? styles.typeTextActive : styles.typeText}>
                        Service
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.category}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, category: text})}
                    placeholder="Product category"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Collection</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.collection}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, collection: text})}
                    placeholder="Product collection"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.unit}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, unit: text})}
                    placeholder="Unit of measurement"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Vendor</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.vendor}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, vendor: text})}
                    placeholder="Product vendor"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Brand</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.brand}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, brand: text})}
                    placeholder="Product brand"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Tags</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.tags}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, tags: text})}
                    placeholder="Product tags (comma separated)"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Barcode</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.barcode}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, barcode: text})}
                    placeholder="Product barcode/SKU"
                  />
                </View>
              </View>

              {/* Media Tab */}
              <View>
                <View style={styles.formField}>
                  <ImageUploader
                    images={selectedProductForEdit.images || '[]'}
                    onImagesChange={(images) =>
                      setSelectedProductForEdit({...selectedProductForEdit, images: JSON.stringify(images)})
                    }
                  />
                </View>
              </View>

              {/* Options Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Options</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.options === '[]' ? '' : selectedProductForEdit.options}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, options: text || '[]'})}
                    placeholder="Product options (JSON format)"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Modifiers</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.modifiers}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, modifiers: text})}
                    placeholder="Product modifiers"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Metafields</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.metafields}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, metafields: text})}
                    placeholder="Product metafields"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Notes Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.notes}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, notes: text})}
                    placeholder="Additional notes"
                    multiline
                    numberOfLines={6}
                  />
                </View>
              </View>

              {/* Sales Tab */}
              <View>
                <View style={styles.switchField}>
                  <Text style={styles.inputLabel}>Featured Product</Text>
                  <Switch
                    value={selectedProductForEdit.featured === 1}
                    onValueChange={(value) => setSelectedProductForEdit({...selectedProductForEdit, featured: value ? 1 : 0})}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Sale Info</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.saleinfo}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, saleinfo: text})}
                    placeholder="Sale information"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Promo Info</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.promoinfo}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, promoinfo: text})}
                    placeholder="Promotion information"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Related Products</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.relproducts === '[]' ? '' : selectedProductForEdit.relproducts}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, relproducts: text || '[]'})}
                    placeholder="Related products (JSON format)"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Sell Products</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.sellproducts === '[]' ? '' : selectedProductForEdit.sellproducts}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, sellproducts: text || '[]'})}
                    placeholder="Sell products (JSON format)"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Channels Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Stores</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.stores}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, stores: text})}
                    placeholder="Stores"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.location}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, location: text})}
                    placeholder="Location"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Sales Channel</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProductForEdit.saleschannel}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, saleschannel: text})}
                    placeholder="Sales channel"
                  />
                </View>

                <View style={styles.switchField}>
                  <Text style={styles.inputLabel}>POS</Text>
                  <Switch
                    value={selectedProductForEdit.pos === 1}
                    onValueChange={(value) => setSelectedProductForEdit({...selectedProductForEdit, pos: value ? 1 : 0})}
                  />
                </View>

                <View style={styles.switchField}>
                  <Text style={styles.inputLabel}>Website</Text>
                  <Switch
                    value={selectedProductForEdit.website === 1}
                    onValueChange={(value) => setSelectedProductForEdit({...selectedProductForEdit, website: value ? 1 : 0})}
                  />
                </View>
              </View>

              {/* SEO Tab */}
              <View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>SEO</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedProductForEdit.seo === '{"slug":"", "title":"", "keywords":""}' ? '' : selectedProductForEdit.seo}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, seo: text || '{"slug":"", "title":"", "keywords":""}'})}
                    placeholder="SEO information (JSON format)"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Publish Status</Text>
                  <View style={styles.typeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.publish === 'draft' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, publish: 'draft'})}
                    >
                      <Text style={selectedProductForEdit.publish === 'draft' ? styles.typeTextActive : styles.typeText}>
                        Draft
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.publish === 'active' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, publish: 'active'})}
                    >
                      <Text style={selectedProductForEdit.publish === 'active' ? styles.typeTextActive : styles.typeText}>
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedProductForEdit.publish === 'archived' && styles.typeButtonActive
                      ]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, publish: 'archived'})}
                    >
                      <Text style={selectedProductForEdit.publish === 'archived' ? styles.typeTextActive : styles.typeText}>
                        Archived
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Inventory Tab */}
              <View>
                {inventoryLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0066CC" />
                    <Text style={styles.loadingText}>Loading inventory...</Text>
                  </View>
                ) : (
                  <View style={styles.simpleInventoryList}>
                    {(() => {
                      console.log('Current inventory state:', inventory);
                      console.log('Selected product for edit:', selectedProductForEdit.id);
                      const filteredInventory = inventory.filter(item => item.productId === selectedProductForEdit.id);
                      console.log('Filtered inventory for product', selectedProductForEdit.id, ':', filteredInventory);
                      console.log('Filtered inventory length:', filteredInventory.length);
                      return filteredInventory.length > 0 ? (
                        filteredInventory.map((item, index) => (
                          <View key={item.id.toString()}>
                            {renderInventoryItem({ item })}
                            {index < filteredInventory.length - 1 && <View style={styles.separator} />}
                          </View>
                        ))
                      ) : (
                        <View style={styles.noProductSelected}>
                          <Text style={styles.noProductText}>
                            No inventory items found for this product (ID: {selectedProductForEdit.id})
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            </VerticalTabView>
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
              <Text style={styles.filterSectionTitle}>Filter by Type</Text>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter('physical');
                  setFilteredProducts(products.filter(p => p.type === 'physical'));
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Physical Products</Text>
                {activeFilter === 'physical' && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter('digital');
                  setFilteredProducts(products.filter(p => p.type === 'digital'));
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Digital Products</Text>
                {activeFilter === 'digital' && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter('service');
                  setFilteredProducts(products.filter(p => p.type === 'service'));
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterText}>Services</Text>
                {activeFilter === 'service' && (
                  <Ionicons name="checkmark-outline" size={20} color="#0066CC" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter(null);
                  setFilteredProducts(products);
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
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productContent: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    color: '#0066CC',
  },
  selectedProductItem: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    maxHeight: '90%',
    overflow: 'hidden',
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
  formContainer: {
    padding: 16,
    paddingBottom: 100, // Add extra padding at the bottom for scrolling
  },
  tabContent: {
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeText: {
    color: '#666',
  },
  typeTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  featuredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Inventory styles
  simpleInventoryList: {
    // No borders, no background, just simple list
  },
  inventoryItem: {
    padding: 12,
    backgroundColor: '#fff',
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inventorySubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  inventoryPrice: {
    fontSize: 12,
    color: '#0066CC',
    marginBottom: 2,
  },
  inventoryOption: {
    fontSize: 11,
    color: '#888',
    marginBottom: 1,
  },
  noProductSelected: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 16,
  },
  noProductText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});