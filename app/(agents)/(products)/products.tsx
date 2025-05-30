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
import ImageUploader from './ImageUploader';
import SingleImageUploader from './SingleImageUploader';
import VerticalTabView from './VerticalTabView';

type Product = {
  id: number;
  title: string;
  medias: string; // JSON array of URLs (renamed from images)
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
  pos: number; // BOOLEAN stored as INTEGER (0 or 1)
  website: number; // BOOLEAN stored as INTEGER (0 or 1)
  seo: string; // JSON with slug, title, keywords
  tags: string;
  cost: number;
  qrcode: string; // renamed from barcode
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
  barcode: string;
  image: string;
  option1: string;
  option2: string;
  option3: string;
  reorderlevel: number;
  path: string;
  available: number;
  committed: number;
  unavailable: number;
  onhand: number;
  metafields: string;
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
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Multi-select drawer states
  const [optionsDrawerVisible, setOptionsDrawerVisible] = useState(false);
  const [metafieldsDrawerVisible, setMetafieldsDrawerVisible] = useState(false);
  const [modifiersDrawerVisible, setModifiersDrawerVisible] = useState(false);
  const [categoriesDrawerVisible, setCategoriesDrawerVisible] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);
  const [availableMetafields, setAvailableMetafields] = useState<any[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [selectedMetafieldIds, setSelectedMetafieldIds] = useState<number[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Create new item states
  const [createOptionModalVisible, setCreateOptionModalVisible] = useState(false);
  const [createMetafieldModalVisible, setCreateMetafieldModalVisible] = useState(false);
  const [createModifierModalVisible, setCreateModifierModalVisible] = useState(false);
  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
  const [newOptionTitle, setNewOptionTitle] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionIdentifier, setNewOptionIdentifier] = useState('');
  const [newMetafieldTitle, setNewMetafieldTitle] = useState('');
  const [newMetafieldValue, setNewMetafieldValue] = useState('');
  const [newMetafieldGroup, setNewMetafieldGroup] = useState('');
  const [newMetafieldType, setNewMetafieldType] = useState('');
  const [newMetafieldFilter, setNewMetafieldFilter] = useState(0);
  const [newModifierTitle, setNewModifierTitle] = useState('');
  const [newModifierNotes, setNewModifierNotes] = useState('');
  const [newModifierType, setNewModifierType] = useState('');
  const [newModifierValue, setNewModifierValue] = useState(0);
  const [newModifierIdentifier, setNewModifierIdentifier] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('[]');
  const [newCategoryNotes, setNewCategoryNotes] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<number | null>(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState<any | null>(null);
  const [parentCategoryModalVisible, setParentCategoryModalVisible] = useState(false);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [isCreatingMetafield, setIsCreatingMetafield] = useState(false);
  const [isCreatingModifier, setIsCreatingModifier] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    title: '',
    medias: '[]', // Empty JSON array (renamed from images)
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
    pos: 1,
    website: 1,
    seo: '{"slug":"", "title":"", "keywords":""}',
    tags: '',
    cost: 0,
    qrcode: '', // renamed from barcode
    publish: 'draft',
    promoinfo: '',
    featured: 0,
    relproducts: '[]', // Empty JSON array
    sellproducts: '[]', // Empty JSON array
  });
  const { profileData } = useOnboarding();

  // Helper function to reset new option form
  const resetNewOptionForm = () => {
    setNewOptionTitle('');
    setNewOptionValue('');
    setNewOptionIdentifier('');
  };

  // Helper function to reset new metafield form
  const resetNewMetafieldForm = () => {
    setNewMetafieldTitle('');
    setNewMetafieldValue('');
    setNewMetafieldGroup('');
    setNewMetafieldType('');
    setNewMetafieldFilter(0);
  };

  // Helper function to reset new modifier form
  const resetNewModifierForm = () => {
    setNewModifierTitle('');
    setNewModifierNotes('');
    setNewModifierType('');
    setNewModifierValue(0);
    setNewModifierIdentifier('');
  };

  // Helper function to reset new category form
  const resetNewCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryImage('[]');
    setNewCategoryNotes('');
    setNewCategoryParent(null);
    setSelectedParentCategory(null);
  };

  // Helper function to reset new product form
  const resetNewProductForm = () => {
    setNewProduct({
      title: '',
      medias: '[]',
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
      modifiers: '[]',
      metafields: '[]',
      saleinfo: '',
      stores: '',
      pos: 1,
      website: 1,
      seo: '{"slug":"", "title":"", "keywords":""}',
      tags: '',
      cost: 0,
      qrcode: '',
      publish: 'draft',
      promoinfo: '',
      featured: 0,
      relproducts: '[]',
      sellproducts: '[]',
    });
  };

  // Fetch available options for multi-select
  const fetchAvailableOptions = async () => {
    try {
      const profile = profileData?.profile?.[0];
      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

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
                sql: "SELECT id, parentid, title, value, identifier FROM options ORDER BY title LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const optionData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            parentid: row[1].type === 'null' ? null : parseInt(row[1].value),
            title: row[2].type === 'null' ? '' : row[2].value,
            value: row[3].type === 'null' ? '' : row[3].value,
            identifier: row[4].type === 'null' ? '' : row[4].value
          }));
          setAvailableOptions(optionData);
        }
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  // Fetch available metafields for multi-select
  const fetchAvailableMetafields = async () => {
    try {
      const profile = profileData?.profile?.[0];
      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

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
                sql: "SELECT id, parentid, title, value, \"group\", type, filter FROM metafields ORDER BY title LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const metafieldData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            parentid: row[1].type === 'null' ? null : parseInt(row[1].value),
            title: row[2].type === 'null' ? '' : row[2].value,
            value: row[3].type === 'null' ? '' : row[3].value,
            group: row[4].type === 'null' ? '' : row[4].value,
            type: row[5].type === 'null' ? '' : row[5].value,
            filter: row[6].type === 'null' ? 0 : parseInt(row[6].value)
          }));
          setAvailableMetafields(metafieldData);
        }
      }
    } catch (error) {
      console.error('Error fetching metafields:', error);
    }
  };

  // Fetch available modifiers for multi-select
  const fetchAvailableModifiers = async () => {
    try {
      const profile = profileData?.profile?.[0];
      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

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
                sql: "SELECT id, title, notes, type, value, identifier FROM modifiers ORDER BY title LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const modifierData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            title: row[1].type === 'null' ? '' : row[1].value,
            notes: row[2].type === 'null' ? '' : row[2].value,
            type: row[3].type === 'null' ? '' : row[3].value,
            value: row[4].type === 'null' ? 0 : parseFloat(row[4].value),
            identifier: row[5].type === 'null' ? '' : row[5].value
          }));
          setAvailableModifiers(modifierData);
        }
      }
    } catch (error) {
      console.error('Error fetching modifiers:', error);
    }
  };

  // Fetch available categories for selection
  const fetchAvailableCategories = async () => {
    try {
      const profile = profileData?.profile?.[0];
      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

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
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const categoryData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            name: row[1].type === 'null' ? '' : row[1].value,
            image: row[2].type === 'null' ? '[]' : row[2].value,
            notes: row[3].type === 'null' ? '' : row[3].value,
            parent: row[4].type === 'null' ? null : parseInt(row[4].value)
          }));
          setAvailableCategories(categoryData);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

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

  // Fetch full product details for editing
  const fetchProductForEdit = async (productId: number) => {
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

      // Create request body with direct SQL to fetch all product fields
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `SELECT id, title, medias, excerpt, notes, type, category, collection, unit,
                    price, saleprice, vendor, brand, options, modifiers, metafields,
                    saleinfo, stores, pos, website, seo, tags, cost, qrcode, createdat,
                    updatedat, publishat, publish, promoinfo, featured, relproducts, sellproducts
                    FROM products WHERE id = ${productId}`
            }
          }
        ]
      };

      console.log('Fetching product details for edit:', productId);

      // Fetch product details
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log('Fetch product details response status:', response.status);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);

          if (data.results &&
              data.results[0] &&
              data.results[0].response &&
              data.results[0].response.result &&
              data.results[0].response.result.rows &&
              data.results[0].response.result.rows.length > 0) {

            // Extract the row from the nested structure
            const row = data.results[0].response.result.rows[0];

            // Transform the row into a Product object
            const productData: Product = {
              id: parseInt(row[0].value),
              title: row[1].type === 'null' ? '' : row[1].value,
              medias: row[2].type === 'null' ? '[]' : row[2].value,
              excerpt: row[3].type === 'null' ? '' : row[3].value,
              notes: row[4].type === 'null' ? '' : row[4].value,
              type: row[5].type === 'null' ? 'physical' : row[5].value,
              category: row[6].type === 'null' ? '' : row[6].value,
              collection: row[7].type === 'null' ? '' : row[7].value,
              unit: row[8].type === 'null' ? '' : row[8].value,
              price: row[9].type === 'null' ? 0 : parseFloat(row[9].value),
              saleprice: row[10].type === 'null' ? 0 : parseFloat(row[10].value),
              vendor: row[11].type === 'null' ? '' : row[11].value,
              brand: row[12].type === 'null' ? '' : row[12].value,
              options: row[13].type === 'null' ? '[]' : row[13].value,
              modifiers: row[14].type === 'null' ? '[]' : row[14].value,
              metafields: row[15].type === 'null' ? '[]' : row[15].value,
              saleinfo: row[16].type === 'null' ? '' : row[16].value,
              stores: row[17].type === 'null' ? '' : row[17].value,
              pos: row[18].type === 'null' ? 0 : parseInt(row[18].value),
              website: row[19].type === 'null' ? 0 : parseInt(row[19].value),
              seo: row[20].type === 'null' ? '{"slug":"", "title":"", "keywords":""}' : row[20].value,
              tags: row[21].type === 'null' ? '' : row[21].value,
              cost: row[22].type === 'null' ? 0 : parseFloat(row[22].value),
              qrcode: row[23].type === 'null' ? '' : row[23].value,
              createdat: row[24].type === 'null' ? '' : row[24].value,
              updatedat: row[25].type === 'null' ? '' : row[25].value,
              publishat: row[26].type === 'null' ? '' : row[26].value,
              publish: row[27].type === 'null' ? 'draft' : row[27].value,
              promoinfo: row[28].type === 'null' ? '' : row[28].value,
              featured: row[29].type === 'null' ? 0 : parseInt(row[29].value),
              relproducts: row[30].type === 'null' ? '[]' : row[30].value,
              sellproducts: row[31].type === 'null' ? '[]' : row[31].value,
            };

            return productData;
          } else {
            console.log('No product details found in response');
            return null;
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          return null;
        }
      } else {
        console.error('Failed to fetch product details:', responseText);
        Alert.alert(
          'Error',
          'Failed to fetch product details. Please try again.',
          [{ text: 'OK' }]
        );
        return null;
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching product details. Please try again.',
        [{ text: 'OK' }]
      );
      return null;
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
                title, medias, excerpt, notes, type, category, collection, unit,
                price, saleprice, vendor, brand, options, modifiers, metafields,
                saleinfo, stores, pos, website, seo,
                tags, cost, qrcode, createdat, updatedat, publishat, publish,
                promoinfo, featured, relproducts, sellproducts
              ) VALUES (
                '${(newProduct.title || '').replace(/'/g, "''")}',
                '${(newProduct.medias || '[]').replace(/'/g, "''")}',
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
                '${(newProduct.modifiers || '[]').replace(/'/g, "''")}',
                '${(newProduct.metafields || '[]').replace(/'/g, "''")}',
                '${(newProduct.saleinfo || '').replace(/'/g, "''")}',
                '${(newProduct.stores || '').replace(/'/g, "''")}',
                ${newProduct.pos || 0},
                ${newProduct.website || 0},
                '${(newProduct.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                '${(newProduct.tags || '').replace(/'/g, "''")}',
                ${newProduct.cost || 0},
                '${(newProduct.qrcode || '').replace(/'/g, "''")}',
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
        resetNewProductForm();
        setModalVisible(false);

        // Refresh product list
        fetchProducts();
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
                medias = '${(selectedProductForEdit.medias || '[]').replace(/'/g, "''")}',
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
                modifiers = '${(selectedProductForEdit.modifiers || '[]').replace(/'/g, "''")}',
                metafields = '${(selectedProductForEdit.metafields || '[]').replace(/'/g, "''")}',
                saleinfo = '${(selectedProductForEdit.saleinfo || '').replace(/'/g, "''")}',
                stores = '${(selectedProductForEdit.stores || '').replace(/'/g, "''")}',
                pos = ${selectedProductForEdit.pos || 0},
                website = ${selectedProductForEdit.website || 0},
                seo = '${(selectedProductForEdit.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                tags = '${(selectedProductForEdit.tags || '').replace(/'/g, "''")}',
                cost = ${selectedProductForEdit.cost || 0},
                qrcode = '${(selectedProductForEdit.qrcode || '').replace(/'/g, "''")}',
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
              sql: `SELECT id, productId, sku, barcode, image, option1, option2, option3, reorderlevel, path, available, committed, unavailable, onhand, metafields, cost, price, margin, saleprice FROM inventory WHERE productId = ${productId} ORDER BY id DESC LIMIT 100`
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
                barcode: row[3].type === 'null' ? '' : row[3].value,
                image: row[4].type === 'null' ? '' : row[4].value,
                option1: row[5].type === 'null' ? '' : row[5].value,
                option2: row[6].type === 'null' ? '' : row[6].value,
                option3: row[7].type === 'null' ? '' : row[7].value,
                reorderlevel: row[8].type === 'null' ? 0 : parseInt(row[8].value),
                path: row[9].type === 'null' ? '' : row[9].value,
                available: row[10].type === 'null' ? 0 : parseInt(row[10].value),
                committed: row[11].type === 'null' ? 0 : parseInt(row[11].value),
                unavailable: row[12].type === 'null' ? 0 : parseInt(row[12].value),
                onhand: row[13].type === 'null' ? 0 : parseInt(row[13].value),
                metafields: row[14].type === 'null' ? '' : row[14].value,
                cost: row[15].type === 'null' ? 0 : parseFloat(row[15].value),
                price: row[16].type === 'null' ? 0 : parseFloat(row[16].value),
                margin: row[17].type === 'null' ? 0 : parseFloat(row[17].value),
                saleprice: row[18].type === 'null' ? 0 : parseFloat(row[18].value)
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

  // Helper functions for multi-select
  const parseSelectedIds = (jsonString: string): number[] => {
    try {
      const parsed = JSON.parse(jsonString || '[]');
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'number') : [];
    } catch {
      return [];
    }
  };

  const openOptionsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);
    const currentIds = parseSelectedIds(currentProduct.options || '[]');
    setSelectedOptionIds(currentIds);

    // Fetch options first if not already loaded
    if (availableOptions.length === 0) {
      await fetchAvailableOptions();
    }

    setOptionsDrawerVisible(true);
  };

  const openMetafieldsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);
    const currentIds = parseSelectedIds(currentProduct.metafields || '[]');
    setSelectedMetafieldIds(currentIds);

    // Fetch metafields first if not already loaded
    if (availableMetafields.length === 0) {
      await fetchAvailableMetafields();
    }

    setMetafieldsDrawerVisible(true);
  };

  const handleOptionsSelection = () => {
    const selectedIdsJson = JSON.stringify(selectedOptionIds);
    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, options: selectedIdsJson});
    } else {
      setNewProduct({...newProduct, options: selectedIdsJson});
    }
    setOptionsDrawerVisible(false);
  };

  const handleMetafieldsSelection = () => {
    const selectedIdsJson = JSON.stringify(selectedMetafieldIds);
    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, metafields: selectedIdsJson});
    } else {
      setNewProduct({...newProduct, metafields: selectedIdsJson});
    }
    setMetafieldsDrawerVisible(false);
  };

  const toggleOptionSelection = (optionId: number) => {
    setSelectedOptionIds(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const toggleMetafieldSelection = (metafieldId: number) => {
    setSelectedMetafieldIds(prev =>
      prev.includes(metafieldId)
        ? prev.filter(id => id !== metafieldId)
        : [...prev, metafieldId]
    );
  };

  const openModifiersDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);
    const currentIds = parseSelectedIds(currentProduct.modifiers || '[]');
    setSelectedModifierIds(currentIds);

    // Fetch modifiers first if not already loaded
    if (availableModifiers.length === 0) {
      await fetchAvailableModifiers();
    }

    setModifiersDrawerVisible(true);
  };

  const handleModifiersSelection = () => {
    const selectedIdsJson = JSON.stringify(selectedModifierIds);
    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, modifiers: selectedIdsJson});
    } else {
      setNewProduct({...newProduct, modifiers: selectedIdsJson});
    }
    setModifiersDrawerVisible(false);
  };

  const toggleModifierSelection = (modifierId: number) => {
    setSelectedModifierIds(prev =>
      prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const openCategoriesDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);

    // Fetch categories first if not already loaded
    if (availableCategories.length === 0) {
      await fetchAvailableCategories();
    }

    setCategoriesDrawerVisible(true);
  };

  const selectCategory = (categoryId: number) => {
    // Immediately apply the selection and close drawer
    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    const categoryName = selectedCategory ? selectedCategory.name : '';

    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, category: categoryName});
    } else {
      setNewProduct({...newProduct, category: categoryName});
    }

    setCategoriesDrawerVisible(false);
  };

  // Helper function to organize categories hierarchically
  const getHierarchicalCategories = () => {
    const rootCategories = availableCategories.filter(cat => cat.parent === null);
    return rootCategories;
  };

  // Helper function to get filtered categories based on search
  const getFilteredCategories = () => {
    if (categorySearchQuery.trim() === '') {
      return getHierarchicalCategories();
    }

    const searchTerms = categorySearchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    // Filter all categories (including children) for search
    const allFilteredCategories = availableCategories.filter(category => {
      if (!category) return false;

      const name = (category.name || '').toLowerCase();
      const notes = (category.notes || '').toLowerCase();

      return searchTerms.some(term =>
        name.includes(term) ||
        notes.includes(term)
      );
    });

    // For search results, return all matching categories (flat list)
    return allFilteredCategories;
  };

  // Handle category search input
  const handleCategorySearch = (text: string) => {
    setCategorySearchQuery(text);
  };

  // Helper function to get children of a category (with search filter)
  const getCategoryChildren = (parentId: number) => {
    if (categorySearchQuery.trim() === '') {
      return availableCategories.filter(cat => cat.parent === parentId);
    }

    // When searching, also filter children by search terms
    const searchTerms = categorySearchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    return availableCategories.filter(cat => {
      if (cat.parent !== parentId) return false;

      const name = (cat.name || '').toLowerCase();
      const notes = (cat.notes || '').toLowerCase();

      return searchTerms.some(term =>
        name.includes(term) ||
        notes.includes(term)
      );
    });
  };

  // Render simple category item (for search results)
  const renderSimpleCategoryItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => selectCategory(item.id)}
      >
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle}>{item.name}</Text>
          {item.notes && (
            <Text style={styles.categoryNotes}>{item.notes}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render category with children (for hierarchical view)
  const renderCategoryWithChildren = ({ item }: { item: any }) => {
    const children = getCategoryChildren(item.id);

    return (
      <View style={styles.categoryGroup}>
        {/* Parent category */}
        <TouchableOpacity
          style={styles.parentCategoryRow}
          onPress={() => selectCategory(item.id)}
        >
          <Text style={styles.parentCategoryTitle}>{item.name}</Text>
          {item.notes && (
            <Text style={styles.parentCategoryNotes}>{item.notes}</Text>
          )}
        </TouchableOpacity>

        {/* Children categories */}
        {children.length > 0 && (
          <View style={styles.childrenContainer}>
            {children.map((child) => {
              const grandChildren = getCategoryChildren(child.id);
              return (
                <View key={child.id}>
                  <TouchableOpacity
                    style={styles.childCategoryRow}
                    onPress={() => selectCategory(child.id)}
                  >
                    <Text style={styles.childCategoryTitle}>{child.name}</Text>
                    {child.notes && (
                      <Text style={styles.childCategoryNotes}>{child.notes}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Grandchildren categories */}
                  {grandChildren.length > 0 && (
                    <View style={styles.grandchildrenContainer}>
                      {grandChildren.map((grandChild) => (
                        <TouchableOpacity
                          key={grandChild.id}
                          style={styles.grandchildCategoryRow}
                          onPress={() => selectCategory(grandChild.id)}
                        >
                          <Text style={styles.grandchildCategoryTitle}>{grandChild.name}</Text>
                          {grandChild.notes && (
                            <Text style={styles.grandchildCategoryNotes}>{grandChild.notes}</Text>
                          )}
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

  // Helper function to get selected option names
  const getSelectedOptionNames = (optionIds: number[]): string => {
    if (optionIds.length === 0) return '';

    const selectedOptions = availableOptions.filter(option => optionIds.includes(option.id));
    if (selectedOptions.length === 0) return `${optionIds.length} options selected`;

    if (selectedOptions.length <= 3) {
      return selectedOptions.map(option => option.title).join(', ');
    } else {
      return `${selectedOptions.slice(0, 2).map(option => option.title).join(', ')} +${selectedOptions.length - 2} more`;
    }
  };

  // Helper function to get selected metafield names
  const getSelectedMetafieldNames = (metafieldIds: number[]): string => {
    if (metafieldIds.length === 0) return '';

    const selectedMetafields = availableMetafields.filter(metafield => metafieldIds.includes(metafield.id));
    if (selectedMetafields.length === 0) return `${metafieldIds.length} metafields selected`;

    if (selectedMetafields.length <= 3) {
      return selectedMetafields.map(metafield => metafield.title).join(', ');
    } else {
      return `${selectedMetafields.slice(0, 2).map(metafield => metafield.title).join(', ')} +${selectedMetafields.length - 2} more`;
    }
  };

  // Helper function to get selected modifier names
  const getSelectedModifierNames = (modifierIds: number[]): string => {
    if (modifierIds.length === 0) return '';

    const selectedModifiers = availableModifiers.filter(modifier => modifierIds.includes(modifier.id));
    if (selectedModifiers.length === 0) return `${modifierIds.length} modifiers selected`;

    if (selectedModifiers.length <= 3) {
      return selectedModifiers.map(modifier => modifier.title).join(', ');
    } else {
      return `${selectedModifiers.slice(0, 2).map(modifier => modifier.title).join(', ')} +${selectedModifiers.length - 2} more`;
    }
  };

  // Create new option function
  const createNewOption = async () => {
    if (!newOptionTitle.trim()) {
      Alert.alert('Error', 'Option title is required');
      return;
    }

    try {
      setIsCreatingOption(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO options (parentid, title, value, identifier) VALUES (NULL, '${newOptionTitle.replace(/'/g, "''")}', '${newOptionValue.replace(/'/g, "''")}', '${newOptionIdentifier.replace(/'/g, "''")}')`
            }
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Reset form
        resetNewOptionForm();
        setCreateOptionModalVisible(false);

        // Refresh options list
        await fetchAvailableOptions();
      } else {
        throw new Error('Failed to create option');
      }
    } catch (error) {
      console.error('Error creating option:', error);
      Alert.alert('Error', 'Failed to create option. Please try again.');
    } finally {
      setIsCreatingOption(false);
    }
  };

  // Create new metafield function
  const createNewMetafield = async () => {
    if (!newMetafieldTitle.trim()) {
      Alert.alert('Error', 'Metafield title is required');
      return;
    }

    try {
      setIsCreatingMetafield(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO metafields (parentid, title, value, "group", type, filter) VALUES (NULL, '${newMetafieldTitle.replace(/'/g, "''")}', '${newMetafieldValue.replace(/'/g, "''")}', '${newMetafieldGroup.replace(/'/g, "''")}', '${newMetafieldType.replace(/'/g, "''")}', ${newMetafieldFilter})`
            }
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Reset form
        resetNewMetafieldForm();
        setCreateMetafieldModalVisible(false);

        // Refresh metafields list
        await fetchAvailableMetafields();
      } else {
        throw new Error('Failed to create metafield');
      }
    } catch (error) {
      console.error('Error creating metafield:', error);
      Alert.alert('Error', 'Failed to create metafield. Please try again.');
    } finally {
      setIsCreatingMetafield(false);
    }
  };

  // Create new modifier function
  const createNewModifier = async () => {
    if (!newModifierTitle.trim()) {
      Alert.alert('Error', 'Modifier title is required');
      return;
    }

    try {
      setIsCreatingModifier(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO modifiers (title, notes, type, value, identifier) VALUES ('${newModifierTitle.replace(/'/g, "''")}', '${newModifierNotes.replace(/'/g, "''")}', '${newModifierType.replace(/'/g, "''")}', ${newModifierValue}, '${newModifierIdentifier.replace(/'/g, "''")}')`
            }
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Reset form
        resetNewModifierForm();
        setCreateModifierModalVisible(false);

        // Refresh modifiers list
        await fetchAvailableModifiers();
      } else {
        throw new Error('Failed to create modifier');
      }
    } catch (error) {
      console.error('Error creating modifier:', error);
      Alert.alert('Error', 'Failed to create modifier. Please try again.');
    } finally {
      setIsCreatingModifier(false);
    }
  };

  // Create new category function
  const createNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      setIsCreatingCategory(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO categories (name, image, notes, parent) VALUES ('${newCategoryName.replace(/'/g, "''")}', '${(newCategoryImage || '[]').replace(/'/g, "''")}', '${newCategoryNotes.replace(/'/g, "''")}', ${newCategoryParent === null ? 'NULL' : Number(newCategoryParent)})`
            }
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Reset form
        resetNewCategoryForm();
        setCreateCategoryModalVisible(false);

        // Refresh categories list
        await fetchAvailableCategories();
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category. Please try again.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Handle image change for new category
  const handleCategoryImageChange = (imageUrl: string) => {
    setNewCategoryImage(imageUrl);
  };

  // Handle parent category selection for new category
  const handleParentCategorySelect = (category: any) => {
    setSelectedParentCategory(category);
    setNewCategoryParent(category.id);
    setParentCategoryModalVisible(false);
  };

  // Reset parent category for new category
  const resetParentCategory = () => {
    setSelectedParentCategory(null);
    setNewCategoryParent(null);
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchAvailableOptions();
    fetchAvailableMetafields();
    fetchAvailableModifiers();
    fetchAvailableCategories();
  }, []);

  // Handle edit button press
  const handleEditProduct = async (product: Product) => {
    try {
      // Show modal immediately with basic product data
      setSelectedProductForEdit({...product});
      setEditModalVisible(true);

      // Fetch full product details including medias in background
      const fullProductData = await fetchProductForEdit(product.id);
      if (fullProductData) {
        setSelectedProductForEdit(fullProductData);
      }

      // Fetch inventory for the selected product
      fetchInventoryForProduct(product.id);
    } catch (error) {
      console.error('Error loading product for edit:', error);
      Alert.alert('Error', 'Failed to load product details for editing.');
    }
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
      <Text style={styles.inventorySubtitle}>Available: {item.available} | On Hand: {item.onhand} | Path: {item.path}</Text>
      <Text style={styles.inventoryPrice}>Cost: ${item.cost?.toFixed(2)} | Price: ${item.price?.toFixed(2)}</Text>
      {item.barcode && <Text style={styles.inventoryOption}>Barcode: {item.barcode}</Text>}
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
          onPress={() => {
            // Reset form to initial state when opening new product modal
            resetNewProductForm();
            setModalVisible(true);
          }}
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
            <View style={styles.headerSpacer} />
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
              { key: 'metafields', icon: 'numbers', label: 'Metafields', iconLibrary: 'MaterialIcons' },
              { key: 'organization', icon: 'folder-outline', label: 'Organization' },
              { key: 'media', icon: 'image-outline', label: 'Media' },
              { key: 'notes', icon: 'notes', label: 'Notes', iconLibrary: 'MaterialIcons' },
              { key: 'storefront', icon: 'globe-outline', label: 'Storefront' },
              { key: 'options', icon: 'options-outline', label: 'Options' },
              { key: 'inventory', icon: 'layers-outline', label: 'Inventory' }
            ]}
          >
            {/* Core Tab */}
            <View>
              <View style={[styles.formField, { marginTop: 0 }]}>
                <TextInput
                  style={styles.notionTitleInput}
                  value={newProduct.title}
                  onChangeText={(text) => setNewProduct({...newProduct, title: text})}
                  placeholder="Product title"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.tilesContainer}>
                <View style={styles.tilesRow}>
                  <View style={[styles.tile, styles.tileLeft]}>
                    <Text style={styles.priceTileValue}>${newProduct.price?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.priceTileLabel}>Price</Text>
                  </View>

                  <View style={[styles.tile, styles.tileMiddle]}>
                    <Text style={styles.priceTileValue}>${newProduct.saleprice?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.priceTileLabel}>Sale Price</Text>
                  </View>

                  <View style={[styles.tile, styles.tileRight]}>
                    <Text style={styles.priceTileValue}>${newProduct.cost?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.priceTileLabel}>Cost</Text>
                  </View>
                </View>

                <View style={styles.tilesRow}>
                  <TouchableOpacity
                    style={[styles.tile, styles.statusTileLeft]}
                    onPress={() => setNewProduct({...newProduct, pos: newProduct.pos === 1 ? 0 : 1})}
                  >
                    <Text style={styles.statusTileLabel}>POS</Text>
                    <Text style={styles.statusTileValue}>{newProduct.pos === 1 ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.statusTileRight]}
                    onPress={() => setNewProduct({...newProduct, website: newProduct.website === 1 ? 0 : 1})}
                  >
                    <Text style={styles.statusTileLabel}>Website</Text>
                    <Text style={styles.statusTileValue}>{newProduct.website === 1 ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tilesRow}>
                  <View style={[styles.tile, styles.statusTileLeft]}>
                    <Text style={styles.statusTileLabel}>QR Code</Text>
                    <Text style={styles.statusTileValue}>{newProduct.qrcode || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.statusTileRight]}>
                  </View>
                </View>
              </View>
            </View>

            {/* Metafields Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                  onPress={() => openMetafieldsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Metafields</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.metafields || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select metafields';
                      } else {
                        return `${selectedIds.length} metafield${selectedIds.length !== 1 ? 's' : ''} selected`;
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.metafields || '[]');
                  if (selectedIds.length > 0) {
                    const selectedMetafields = availableMetafields.filter(metafield => selectedIds.includes(metafield.id));
                    return selectedMetafields.map((metafield) => (
                      <TouchableOpacity
                        key={metafield.id}
                        style={[styles.tile, styles.orgTileSingle]}
                        onPress={() => openMetafieldsDrawer(newProduct, false)}
                      >
                        <Text style={styles.orgTileLabel}>{metafield.title}</Text>
                        <Text style={styles.orgTileValue}>{metafield.value || 'Not set'}</Text>
                      </TouchableOpacity>
                    ));
                  }
                  return null;
                })()}
              </View>
            </View>

            {/* Organization Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                  onPress={() => setNewProduct({...newProduct, type: newProduct.type === 'physical' ? 'digital' : newProduct.type === 'digital' ? 'service' : 'physical'})}
                >
                  <Text style={styles.orgTileLabel}>Type</Text>
                  <Text style={styles.orgTileValue}>{newProduct.type || 'Physical'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => setNewProduct({...newProduct, featured: newProduct.featured === 1 ? 0 : 1})}
                >
                  <Text style={styles.orgTileLabel}>Featured</Text>
                  <Text style={styles.orgTileValue}>{newProduct.featured === 1 ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openCategoriesDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Category</Text>
                  <Text style={styles.orgTileValue}>{newProduct.category || 'Select category'}</Text>
                </TouchableOpacity>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Collection</Text>
                  <Text style={styles.orgTileValue}>{newProduct.collection || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Vendor</Text>
                  <Text style={styles.orgTileValue}>{newProduct.vendor || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Brand</Text>
                  <Text style={styles.orgTileValue}>{newProduct.brand || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Unit</Text>
                  <Text style={styles.orgTileValue}>{newProduct.unit || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Tags</Text>
                  <Text style={styles.orgTileValue}>{newProduct.tags || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Stores</Text>
                  <Text style={styles.orgTileValue}>{newProduct.stores || 'Not set'}</Text>
                </View>
              </View>
            </View>

            {/* Media Tab */}
            <View>
              <View style={[styles.formField, { marginTop: 0 }]}>
                <ImageUploader
                  images={newProduct.medias || '[]'}
                  onImagesChange={(images) =>
                    setNewProduct({...newProduct, medias: JSON.stringify(images)})
                  }
                />
              </View>
            </View>

            {/* Notes Tab */}
            <View style={[styles.notesContainer, { paddingTop: 0 }]}>
              <TextInput
                style={styles.excerptInput}
                value={newProduct.excerpt}
                onChangeText={(text) => setNewProduct({...newProduct, excerpt: text})}
                placeholder="Short description..."
                multiline
                textAlignVertical="top"
                autoFocus={false}
                returnKeyType="default"
              />
              <View style={styles.notesDivider} />
              <TextInput
                style={styles.notesInput}
                value={newProduct.notes}
                onChangeText={(text) => setNewProduct({...newProduct, notes: text})}
                placeholder="Start typing your notes..."
                multiline
                textAlignVertical="top"
                autoFocus={false}
                returnKeyType="default"
              />
            </View>

            {/* Storefront Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                  onPress={() => setNewProduct({...newProduct, featured: newProduct.featured === 1 ? 0 : 1})}
                >
                  <Text style={styles.orgTileLabel}>Featured</Text>
                  <Text style={styles.orgTileValue}>{newProduct.featured === 1 ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => setNewProduct({...newProduct, publish: newProduct.publish === 'draft' ? 'active' : newProduct.publish === 'active' ? 'archived' : 'draft'})}
                >
                  <Text style={styles.orgTileLabel}>Publish Status</Text>
                  <Text style={styles.orgTileValue}>{newProduct.publish || 'Draft'}</Text>
                </TouchableOpacity>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Sale Info</Text>
                  <Text style={styles.orgTileValue}>{newProduct.saleinfo || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Promo Info</Text>
                  <Text style={styles.orgTileValue}>{newProduct.promoinfo || 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>SEO</Text>
                  <Text style={styles.orgTileValue}>{(newProduct.seo && newProduct.seo !== '{"slug":"", "title":"", "keywords":""}') ? 'Configured' : 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Related Products</Text>
                  <Text style={styles.orgTileValue}>{(newProduct.relproducts && newProduct.relproducts !== '[]') ? 'Configured' : 'Not set'}</Text>
                </View>

                <View style={[styles.tile, styles.orgTileSingle]}>
                  <Text style={styles.orgTileLabel}>Sell Products</Text>
                  <Text style={styles.orgTileValue}>{(newProduct.sellproducts && newProduct.sellproducts !== '[]') ? 'Configured' : 'Not set'}</Text>
                </View>
              </View>
            </View>

            {/* Options Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                  onPress={() => openOptionsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Options</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.options || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select options';
                      } else {
                        return `${selectedIds.length} option${selectedIds.length !== 1 ? 's' : ''} selected`;
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.options || '[]');
                  if (selectedIds.length > 0) {
                    const selectedOptions = availableOptions.filter(option => selectedIds.includes(option.id));
                    return selectedOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.tile, styles.orgTileSingle]}
                        onPress={() => openOptionsDrawer(newProduct, false)}
                      >
                        <Text style={styles.orgTileLabel}>{option.title}</Text>
                        <Text style={styles.orgTileValue}>{option.value || 'Not set'}</Text>
                      </TouchableOpacity>
                    ));
                  }
                  return null;
                })()}

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openModifiersDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Modifiers</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.modifiers || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select modifiers';
                      } else {
                        return `${selectedIds.length} modifier${selectedIds.length !== 1 ? 's' : ''} selected`;
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.modifiers || '[]');
                  if (selectedIds.length > 0) {
                    const selectedModifiers = availableModifiers.filter(modifier => selectedIds.includes(modifier.id));
                    return selectedModifiers.map((modifier) => (
                      <TouchableOpacity
                        key={modifier.id}
                        style={[styles.tile, styles.orgTileSingle]}
                        onPress={() => openModifiersDrawer(newProduct, false)}
                      >
                        <Text style={styles.orgTileLabel}>{modifier.title}</Text>
                        <Text style={styles.orgTileValue}>{modifier.value ? `$${modifier.value.toFixed(2)}` : 'Not set'}</Text>
                      </TouchableOpacity>
                    ));
                  }
                  return null;
                })()}


              </View>
            </View>

            {/* Inventory Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.noProductSelected, { marginTop: 0, paddingTop: 0 }]}>
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
            <View style={styles.headerSpacer} />
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
                { key: 'metafields', icon: 'numbers', label: 'Metafields', iconLibrary: 'MaterialIcons' },
                { key: 'organization', icon: 'folder-outline', label: 'Organization' },
                { key: 'media', icon: 'image-outline', label: 'Media' },
                { key: 'notes', icon: 'notes', label: 'Notes', iconLibrary: 'MaterialIcons' },
                { key: 'storefront', icon: 'globe-outline', label: 'Storefront' },
                { key: 'options', icon: 'options-outline', label: 'Options' },
                { key: 'inventory', icon: 'layers-outline', label: 'Inventory' }
              ]}
            >
              {/* Core Tab */}
              <View>
                <View style={[styles.formField, { marginTop: 0 }]}>
                  <TextInput
                    style={styles.notionTitleInput}
                    value={selectedProductForEdit.title}
                    onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, title: text})}
                    placeholder="Product title"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.tilesContainer}>
                  <View style={styles.tilesRow}>
                    <View style={[styles.tile, styles.tileLeft]}>
                      <Text style={styles.priceTileValue}>${selectedProductForEdit.price?.toFixed(2) || '0.00'}</Text>
                      <Text style={styles.priceTileLabel}>Price</Text>
                    </View>

                    <View style={[styles.tile, styles.tileMiddle]}>
                      <Text style={styles.priceTileValue}>${selectedProductForEdit.saleprice?.toFixed(2) || '0.00'}</Text>
                      <Text style={styles.priceTileLabel}>Sale Price</Text>
                    </View>

                    <View style={[styles.tile, styles.tileRight]}>
                      <Text style={styles.priceTileValue}>${selectedProductForEdit.cost?.toFixed(2) || '0.00'}</Text>
                      <Text style={styles.priceTileLabel}>Cost</Text>
                    </View>
                  </View>

                  <View style={styles.tilesRow}>
                    <TouchableOpacity
                      style={[styles.tile, styles.statusTileLeft]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, pos: selectedProductForEdit.pos === 1 ? 0 : 1})}
                    >
                      <Text style={styles.statusTileLabel}>POS</Text>
                      <Text style={styles.statusTileValue}>{selectedProductForEdit.pos === 1 ? 'Active' : 'Inactive'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tile, styles.statusTileRight]}
                      onPress={() => setSelectedProductForEdit({...selectedProductForEdit, website: selectedProductForEdit.website === 1 ? 0 : 1})}
                    >
                      <Text style={styles.statusTileLabel}>Website</Text>
                      <Text style={styles.statusTileValue}>{selectedProductForEdit.website === 1 ? 'Active' : 'Inactive'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tilesRow}>
                    <View style={[styles.tile, styles.statusTileLeft]}>
                      <Text style={styles.statusTileLabel}>QR Code</Text>
                      <Text style={styles.statusTileValue}>{selectedProductForEdit.qrcode || 'Not set'}</Text>
                    </View>

                    <View style={[styles.tile, styles.statusTileRight]}>
                    </View>
                  </View>
                </View>
              </View>

              {/* Metafields Tab */}
              <View style={{ margin: -16, padding: 0 }}>
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                    onPress={() => openMetafieldsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Metafields</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.metafields || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select metafields';
                        } else {
                          return `${selectedIds.length} metafield${selectedIds.length !== 1 ? 's' : ''} selected`;
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.metafields || '[]');
                    if (selectedIds.length > 0) {
                      const selectedMetafields = availableMetafields.filter(metafield => selectedIds.includes(metafield.id));
                      return selectedMetafields.map((metafield) => (
                        <TouchableOpacity
                          key={metafield.id}
                          style={[styles.tile, styles.orgTileSingle]}
                          onPress={() => openMetafieldsDrawer(selectedProductForEdit, true)}
                        >
                          <Text style={styles.orgTileLabel}>{metafield.title}</Text>
                          <Text style={styles.orgTileValue}>{metafield.value || 'Not set'}</Text>
                        </TouchableOpacity>
                      ));
                    }
                    return null;
                  })()}
                </View>
              </View>

              {/* Organization Tab */}
              <View style={{ margin: -16, padding: 0 }}>
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                    onPress={() => setSelectedProductForEdit({...selectedProductForEdit, type: selectedProductForEdit.type === 'physical' ? 'digital' : selectedProductForEdit.type === 'digital' ? 'service' : 'physical'})}
                  >
                    <Text style={styles.orgTileLabel}>Type</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.type || 'Physical'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => setSelectedProductForEdit({...selectedProductForEdit, featured: selectedProductForEdit.featured === 1 ? 0 : 1})}
                  >
                    <Text style={styles.orgTileLabel}>Featured</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.featured === 1 ? 'Yes' : 'No'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openCategoriesDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Category</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.category || 'Select category'}</Text>
                  </TouchableOpacity>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Collection</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.collection || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Vendor</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.vendor || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Brand</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.brand || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Unit</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.unit || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Tags</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.tags || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Stores</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.stores || 'Not set'}</Text>
                  </View>
                </View>
              </View>

              {/* Media Tab */}
              <View>
                <View style={[styles.formField, { marginTop: 0 }]}>
                  {(() => {
                    console.log('Media Tab - selectedProductForEdit.medias:', selectedProductForEdit.medias);
                    console.log('Media Tab - medias type:', typeof selectedProductForEdit.medias);
                    return (
                      <ImageUploader
                        images={selectedProductForEdit.medias || '[]'}
                        onImagesChange={(images) =>
                          setSelectedProductForEdit({...selectedProductForEdit, medias: JSON.stringify(images)})
                        }
                      />
                    );
                  })()}
                </View>
              </View>

              {/* Notes Tab */}
              <View style={[styles.notesContainer, { paddingTop: 0 }]}>
                <TextInput
                  style={styles.excerptInput}
                  value={selectedProductForEdit.excerpt}
                  onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, excerpt: text})}
                  placeholder="Short description..."
                  multiline
                  textAlignVertical="top"
                  autoFocus={false}
                  returnKeyType="default"
                />
                <View style={styles.notesDivider} />
                <TextInput
                  style={styles.notesInput}
                  value={selectedProductForEdit.notes}
                  onChangeText={(text) => setSelectedProductForEdit({...selectedProductForEdit, notes: text})}
                  placeholder="Start typing your notes..."
                  multiline
                  textAlignVertical="top"
                  autoFocus={false}
                  returnKeyType="default"
                />
              </View>

              {/* Storefront Tab */}
              <View style={{ margin: -16, padding: 0 }}>
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                    onPress={() => setSelectedProductForEdit({...selectedProductForEdit, featured: selectedProductForEdit.featured === 1 ? 0 : 1})}
                  >
                    <Text style={styles.orgTileLabel}>Featured</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.featured === 1 ? 'Yes' : 'No'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => setSelectedProductForEdit({...selectedProductForEdit, publish: selectedProductForEdit.publish === 'draft' ? 'active' : selectedProductForEdit.publish === 'active' ? 'archived' : 'draft'})}
                  >
                    <Text style={styles.orgTileLabel}>Publish Status</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.publish || 'Draft'}</Text>
                  </TouchableOpacity>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Sale Info</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.saleinfo || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Promo Info</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.promoinfo || 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>SEO</Text>
                    <Text style={styles.orgTileValue}>{(selectedProductForEdit.seo && selectedProductForEdit.seo !== '{"slug":"", "title":"", "keywords":""}') ? 'Configured' : 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Related Products</Text>
                    <Text style={styles.orgTileValue}>{(selectedProductForEdit.relproducts && selectedProductForEdit.relproducts !== '[]') ? 'Configured' : 'Not set'}</Text>
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Sell Products</Text>
                    <Text style={styles.orgTileValue}>{(selectedProductForEdit.sellproducts && selectedProductForEdit.sellproducts !== '[]') ? 'Configured' : 'Not set'}</Text>
                  </View>
                </View>
              </View>

              {/* Options Tab */}
              <View style={{ margin: -16, padding: 0 }}>
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}
                    onPress={() => openOptionsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Options</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.options || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select options';
                        } else {
                          return `${selectedIds.length} option${selectedIds.length !== 1 ? 's' : ''} selected`;
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.options || '[]');
                    if (selectedIds.length > 0) {
                      const selectedOptions = availableOptions.filter(option => selectedIds.includes(option.id));
                      return selectedOptions.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.tile, styles.orgTileSingle]}
                          onPress={() => openOptionsDrawer(selectedProductForEdit, true)}
                        >
                          <Text style={styles.orgTileLabel}>{option.title}</Text>
                          <Text style={styles.orgTileValue}>{option.value || 'Not set'}</Text>
                        </TouchableOpacity>
                      ));
                    }
                    return null;
                  })()}

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openModifiersDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Modifiers</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.modifiers || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select modifiers';
                        } else {
                          return `${selectedIds.length} modifier${selectedIds.length !== 1 ? 's' : ''} selected`;
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.modifiers || '[]');
                    if (selectedIds.length > 0) {
                      const selectedModifiers = availableModifiers.filter(modifier => selectedIds.includes(modifier.id));
                      return selectedModifiers.map((modifier) => (
                        <TouchableOpacity
                          key={modifier.id}
                          style={[styles.tile, styles.orgTileSingle]}
                          onPress={() => openModifiersDrawer(selectedProductForEdit, true)}
                        >
                          <Text style={styles.orgTileLabel}>{modifier.title}</Text>
                          <Text style={styles.orgTileValue}>{modifier.value ? `$${modifier.value.toFixed(2)}` : 'Not set'}</Text>
                        </TouchableOpacity>
                      ));
                    }
                    return null;
                  })()}


                </View>
              </View>

              {/* Inventory Tab */}
              <View style={{ margin: -16, padding: 0 }}>
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

      {/* Options Multi-Select Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={optionsDrawerVisible}
        onRequestClose={() => setOptionsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setOptionsDrawerVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Options</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setCreateOptionModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#0066CC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleOptionsSelection}
              >
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedOptionIds.length} option{selectedOptionIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>

          <FlatList
            data={availableOptions.filter(option => option.parentid === null)}
            renderItem={({ item }) => {
              const children = availableOptions.filter(child => child.parentid === item.id);
              return (
                <View style={styles.optionGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedOptionIds.includes(item.id) && styles.selectedOptionItem
                    ]}
                    onPress={() => toggleOptionSelection(item.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>{item.title}</Text>
                      <Text style={styles.optionValue}>{item.value}</Text>
                    </View>
                    <View style={styles.checkbox}>
                      {selectedOptionIds.includes(item.id) && (
                        <Ionicons name="checkmark" size={16} color="#0066CC" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {children.map(child => {
                    const grandChildren = availableOptions.filter(gc => gc.parentid === child.id);
                    return (
                      <View key={child.id}>
                        <TouchableOpacity
                          style={[
                            styles.childOptionItem,
                            selectedOptionIds.includes(child.id) && styles.selectedOptionItem
                          ]}
                          onPress={() => toggleOptionSelection(child.id)}
                        >
                          <View style={styles.optionContent}>
                            <Text style={styles.childOptionTitle}>{child.title}</Text>
                            <Text style={styles.childOptionValue}>{child.value}</Text>
                          </View>
                          <View style={styles.checkbox}>
                            {selectedOptionIds.includes(child.id) && (
                              <Ionicons name="checkmark" size={16} color="#0066CC" />
                            )}
                          </View>
                        </TouchableOpacity>

                        {grandChildren.map(grandChild => (
                          <TouchableOpacity
                            key={grandChild.id}
                            style={[
                              styles.grandChildOptionItem,
                              selectedOptionIds.includes(grandChild.id) && styles.selectedOptionItem
                            ]}
                            onPress={() => toggleOptionSelection(grandChild.id)}
                          >
                            <View style={styles.optionContent}>
                              <Text style={styles.grandChildOptionTitle}>{grandChild.title}</Text>
                              <Text style={styles.grandChildOptionValue}>{grandChild.value}</Text>
                            </View>
                            <View style={styles.checkbox}>
                              {selectedOptionIds.includes(grandChild.id) && (
                                <Ionicons name="checkmark" size={16} color="#0066CC" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Metafields Multi-Select Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={metafieldsDrawerVisible}
        onRequestClose={() => setMetafieldsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setMetafieldsDrawerVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Metafields</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setCreateMetafieldModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#0066CC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleMetafieldsSelection}
              >
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedMetafieldIds.length} metafield{selectedMetafieldIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>

          <FlatList
            data={availableMetafields.filter(metafield => metafield.parentid === null)}
            renderItem={({ item }) => {
              const children = availableMetafields.filter(child => child.parentid === item.id);
              return (
                <View style={styles.optionGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedMetafieldIds.includes(item.id) && styles.selectedOptionItem
                    ]}
                    onPress={() => toggleMetafieldSelection(item.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>{item.title}</Text>
                      <Text style={styles.optionValue}>
                        {item.value}
                        {item.group && ` | Group: ${item.group}`}
                        {item.type && ` | Type: ${item.type}`}
                        {item.filter === 1 && ` | Filterable`}
                      </Text>
                    </View>
                    <View style={styles.checkbox}>
                      {selectedMetafieldIds.includes(item.id) && (
                        <Ionicons name="checkmark" size={16} color="#0066CC" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {children.map(child => {
                    const grandChildren = availableMetafields.filter(gc => gc.parentid === child.id);
                    return (
                      <View key={child.id}>
                        <TouchableOpacity
                          style={[
                            styles.childOptionItem,
                            selectedMetafieldIds.includes(child.id) && styles.selectedOptionItem
                          ]}
                          onPress={() => toggleMetafieldSelection(child.id)}
                        >
                          <View style={styles.optionContent}>
                            <Text style={styles.childOptionTitle}>{child.title}</Text>
                            <Text style={styles.childOptionValue}>
                              {child.value}
                              {child.group && ` | Group: ${child.group}`}
                              {child.type && ` | Type: ${child.type}`}
                              {child.filter === 1 && ` | Filterable`}
                            </Text>
                          </View>
                          <View style={styles.checkbox}>
                            {selectedMetafieldIds.includes(child.id) && (
                              <Ionicons name="checkmark" size={16} color="#0066CC" />
                            )}
                          </View>
                        </TouchableOpacity>

                        {grandChildren.map(grandChild => (
                          <TouchableOpacity
                            key={grandChild.id}
                            style={[
                              styles.grandChildOptionItem,
                              selectedMetafieldIds.includes(grandChild.id) && styles.selectedOptionItem
                            ]}
                            onPress={() => toggleMetafieldSelection(grandChild.id)}
                          >
                            <View style={styles.optionContent}>
                              <Text style={styles.grandChildOptionTitle}>{grandChild.title}</Text>
                              <Text style={styles.grandChildOptionValue}>
                                {grandChild.value}
                                {grandChild.group && ` | Group: ${grandChild.group}`}
                                {grandChild.type && ` | Type: ${grandChild.type}`}
                                {grandChild.filter === 1 && ` | Filterable`}
                              </Text>
                            </View>
                            <View style={styles.checkbox}>
                              {selectedMetafieldIds.includes(grandChild.id) && (
                                <Ionicons name="checkmark" size={16} color="#0066CC" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Modifiers Multi-Select Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modifiersDrawerVisible}
        onRequestClose={() => setModifiersDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModifiersDrawerVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Modifiers</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setCreateModifierModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#0066CC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleModifiersSelection}
              >
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedModifierIds.length} modifier{selectedModifierIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>

          <FlatList
            data={availableModifiers}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedModifierIds.includes(item.id) && styles.selectedOptionItem
                ]}
                onPress={() => toggleModifierSelection(item.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionValue}>
                    {item.type && `Type: ${item.type}`}
                    {item.value && ` | Value: $${item.value.toFixed(2)}`}
                    {item.identifier && ` | ID: ${item.identifier}`}
                  </Text>
                </View>
                <View style={styles.checkbox}>
                  {selectedModifierIds.includes(item.id) && (
                    <Ionicons name="checkmark" size={16} color="#0066CC" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Categories Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={categoriesDrawerVisible}
        onRequestClose={() => setCategoriesDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setCreateCategoryModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>

          <View style={styles.categorySearchContainer}>
            <Ionicons name="search-outline" size={18} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.categorySearchInput}
              placeholder="Search categories..."
              value={categorySearchQuery}
              onChangeText={handleCategorySearch}
              placeholderTextColor="#999"
            />
            {categorySearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setCategorySearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={getFilteredCategories()}
            renderItem={categorySearchQuery.trim() ? renderSimpleCategoryItem : renderCategoryWithChildren}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {categorySearchQuery.trim() ? 'No categories found' : 'No categories available'}
                </Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Create New Option Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createOptionModalVisible}
        onRequestClose={() => setCreateOptionModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Option</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewOption}
              disabled={isCreatingOption}
            >
              {isCreatingOption ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.createFormContainer}>
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newOptionTitle}
                onChangeText={setNewOptionTitle}
                placeholder="Option title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Identifier</Text>
              <TextInput
                style={styles.input}
                value={newOptionIdentifier}
                onChangeText={setNewOptionIdentifier}
                placeholder="Option identifier"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newOptionValue}
                onChangeText={setNewOptionValue}
                placeholder="Option value"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Create New Metafield Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createMetafieldModalVisible}
        onRequestClose={() => setCreateMetafieldModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Metafield</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewMetafield}
              disabled={isCreatingMetafield}
            >
              {isCreatingMetafield ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.createFormContainer}>
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newMetafieldTitle}
                onChangeText={setNewMetafieldTitle}
                placeholder="Metafield title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Group</Text>
              <TextInput
                style={styles.input}
                value={newMetafieldGroup}
                onChangeText={setNewMetafieldGroup}
                placeholder="Metafield group"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Type</Text>
              <TextInput
                style={styles.input}
                value={newMetafieldType}
                onChangeText={setNewMetafieldType}
                placeholder="Metafield type (e.g., text, number, boolean)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Filter</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setNewMetafieldFilter(newMetafieldFilter === 1 ? 0 : 1)}
              >
                <Text style={{ color: newMetafieldFilter === 1 ? '#333' : '#999' }}>
                  {newMetafieldFilter === 1 ? 'Filterable' : 'Not filterable'}
                </Text>
                <View style={[styles.checkbox, newMetafieldFilter === 1 && { backgroundColor: '#0066CC', borderColor: '#0066CC' }]}>
                  {newMetafieldFilter === 1 && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newMetafieldValue}
                onChangeText={setNewMetafieldValue}
                placeholder="Metafield value"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Create New Modifier Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createModifierModalVisible}
        onRequestClose={() => setCreateModifierModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Modifier</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewModifier}
              disabled={isCreatingModifier}
            >
              {isCreatingModifier ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.createFormContainer}>
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newModifierTitle}
                onChangeText={setNewModifierTitle}
                placeholder="Modifier title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Type</Text>
              <TextInput
                style={styles.input}
                value={newModifierType}
                onChangeText={setNewModifierType}
                placeholder="Modifier type (e.g., percentage, fixed)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={styles.input}
                value={newModifierValue.toString()}
                onChangeText={(text) => setNewModifierValue(parseFloat(text) || 0)}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Identifier</Text>
              <TextInput
                style={styles.input}
                value={newModifierIdentifier}
                onChangeText={setNewModifierIdentifier}
                placeholder="Modifier identifier"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newModifierNotes}
                onChangeText={setNewModifierNotes}
                placeholder="Modifier notes"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Create New Category Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createCategoryModalVisible}
        onRequestClose={() => setCreateCategoryModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Category</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewCategory}
              disabled={isCreatingCategory}
            >
              {isCreatingCategory ? (
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
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.categoryTilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newCategoryImage || '[]'}
                  onImageChange={handleCategoryImageChange}
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
                value={newCategoryNotes}
                onChangeText={setNewCategoryNotes}
                placeholder="Add notes about this category..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
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
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.parentModalTitle}>Parent Category</Text>
          </View>

          <FlatList
            data={getHierarchicalCategories()}
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
  // Category search styles
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  categorySearchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
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
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    height: 48,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
    position: 'absolute',
    left: 16,
    right: 64,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 48,
  },
  backButton: {
    padding: 12,
    height: 48,
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 48,
    height: 48,
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
  // Multi-select drawer styles
  selectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  selectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  selectorCount: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  selectionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionGroup: {
    marginBottom: 0,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  childOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 32,
    backgroundColor: '#fff',
  },
  grandChildOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 48,
    backgroundColor: '#fff',
  },
  selectedOptionItem: {
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 14,
    color: '#666',
  },
  childOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginBottom: 2,
  },
  childOptionValue: {
    fontSize: 13,
    color: '#666',
  },
  grandChildOptionTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#555',
    marginBottom: 2,
  },
  grandChildOptionValue: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Category item styles
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  selectedCategoryItem: {
    backgroundColor: '#f0f8ff',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  categoryNotes: {
    fontSize: 14,
    color: '#666',
  },
  // Hierarchical category styles
  categoryGroup: {
    marginBottom: 0,
  },
  parentCategoryRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  parentCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 2,
  },
  parentCategoryNotes: {
    fontSize: 14,
    color: '#0066CC',
    opacity: 0.7,
  },
  childrenContainer: {
    marginLeft: 0,
  },
  childCategoryRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  childCategoryTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#444',
    marginBottom: 1,
  },
  childCategoryNotes: {
    fontSize: 13,
    color: '#666',
  },
  grandchildrenContainer: {
    marginLeft: 16,
  },
  grandchildCategoryRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  grandchildCategoryTitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    marginBottom: 1,
  },
  grandchildCategoryNotes: {
    fontSize: 12,
    color: '#888',
  },
  // Create new item styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#f0f8ff',
  },
  createFormContainer: {
    padding: 16,
    flex: 1,
  },
  // Google Keep-like notes styles
  notesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  notesInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
  // Notion-style title input
  notionTitleInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    marginBottom: 8,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
  // Unified tiles styles
  tilesContainer: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    marginHorizontal: -16,
  },
  tilesRow: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  // Pricing tiles (top row)
  tileLeft: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    minHeight: 100,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  tileMiddle: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    minHeight: 100,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  tileRight: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    minHeight: 100,
  },
  // Status tiles (bottom row)
  statusTileLeft: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  statusTileRight: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  priceTileLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceTileValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusTileLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'center',
  },
  statusTileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'center',
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
  orgTileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'center',
    textTransform: 'capitalize',
  },
  // Excerpt input styles
  excerptInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    textAlignVertical: 'top',
    fontFamily: 'System',
    minHeight: 80,
    marginBottom: 16,
  },
  notesDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  // Create form styles
  createFormContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 16,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0066CC',
    marginLeft: 8,
  },
  // Categories modal styles (from categories.tsx)
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
  categoryTilesContainer: {
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
  notesInput: {
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  // Parent category modal styles
  parentModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  parentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  parentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    backgroundColor: 'transparent',
    flex: 1,
    paddingLeft: 8,
  },
  parentCategoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  parentCategoryText: {
    fontSize: 16,
    color: '#333',
  },
  parentCategoryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});