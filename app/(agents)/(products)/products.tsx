import { useOnboarding } from '@/app/context/onboarding';
import { useProduct } from '@/app/context/product';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  stock: number;
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
  const [editInventoryModalVisible, setEditInventoryModalVisible] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [activeInventoryTab, setActiveInventoryTab] = useState<'metafields' | 'pricing' | 'stock' | null>(null);

  // Multi-select drawer states
  const [optionsDrawerVisible, setOptionsDrawerVisible] = useState(false);
  const [metafieldsDrawerVisible, setMetafieldsDrawerVisible] = useState(false);
  const [modifiersDrawerVisible, setModifiersDrawerVisible] = useState(false);
  const [categoriesDrawerVisible, setCategoriesDrawerVisible] = useState(false);
  const [collectionsDrawerVisible, setCollectionsDrawerVisible] = useState(false);
  const [vendorsDrawerVisible, setVendorsDrawerVisible] = useState(false);
  const [brandsDrawerVisible, setBrandsDrawerVisible] = useState(false);
  const [tagsDrawerVisible, setTagsDrawerVisible] = useState(false);
  const [unitsDrawerVisible, setUnitsDrawerVisible] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);
  const [availableMetafields, setAvailableMetafields] = useState<any[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableCollections, setAvailableCollections] = useState<any[]>([]);
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [selectedMetafieldIds, setSelectedMetafieldIds] = useState<number[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Standard units for selection
  const standardUnits = [
    'units', 'pieces', 'items', 'pcs',
    'kg', 'g', 'lb', 'oz',
    'l', 'ml', 'gal', 'fl oz',
    'm', 'cm', 'mm', 'ft', 'in',
    'box', 'pack', 'set', 'pair',
    'dozen', 'case', 'bundle', 'roll'
  ];

  // Predefined option title types
  const optionTitleTypes = [
    'Custom',
    'Color',
    'Size',
    'Material',
    'Style',
    'Finish',
    'Pattern',
    'Weight',
    'Length',
    'Width',
    'Height'
  ];

  // Predefined modifier title types
  const modifierTitleTypes = [
    'Custom',
    'Discount',
    'Tax',
    'Shipping',
    'Fee',
    'Surcharge',
    'Insurance',
    'Handling',
    'Processing',
    'Service',
    'Premium'
  ];

  // Predefined metafield title types
  const metafieldTitleTypes = [
    'Custom',
    'Model',
    'Weight',
    'Dimensions',
    'Material',
    'Origin',
    'Warranty',
    'Certification'
  ];

  // Predefined metafield groups
  const metafieldGroups = [
    'Products',
    'Inventory',
    'Sales',
    'Marketing',
    'Shipping',
    'Customer',
    'Analytics',
    'System'
  ];

  // Predefined metafield value types (like Shopify)
  const metafieldValueTypes = [
    'Single line text',
    'Multi-line text',
    'Number (integer)',
    'Number (decimal)',
    'Date',
    'Date and time',
    'URL',
    'JSON',
    'Boolean',
    'Color',
    'Weight',
    'Volume',
    'Dimension',
    'Rating',
    'Currency'
  ];

  // Create new item states
  const [createOptionModalVisible, setCreateOptionModalVisible] = useState(false);
  const [createMetafieldModalVisible, setCreateMetafieldModalVisible] = useState(false);
  const [createModifierModalVisible, setCreateModifierModalVisible] = useState(false);
  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
  const [createCollectionModalVisible, setCreateCollectionModalVisible] = useState(false);
  const [createVendorModalVisible, setCreateVendorModalVisible] = useState(false);
  const [createBrandModalVisible, setCreateBrandModalVisible] = useState(false);
  const [createTagModalVisible, setCreateTagModalVisible] = useState(false);
  const [newOptionTitle, setNewOptionTitle] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionIdentifier, setNewOptionIdentifier] = useState('');
  const [optionTitleDrawerVisible, setOptionTitleDrawerVisible] = useState(false);
  const [selectedOptionTitleType, setSelectedOptionTitleType] = useState('');
  const [customOptionTitle, setCustomOptionTitle] = useState('');
  const [selectedIdentifierType, setSelectedIdentifierType] = useState<'color' | 'image' | 'text' | null>(null);
  const [identifierColorValue, setIdentifierColorValue] = useState('#000000');
  const [identifierImageValue, setIdentifierImageValue] = useState('[]');
  const [identifierTextValue, setIdentifierTextValue] = useState('');
  const [colorPickerDrawerVisible, setColorPickerDrawerVisible] = useState(false);
  const [imageClearDrawerVisible, setImageClearDrawerVisible] = useState(false);
  const [newMetafieldTitle, setNewMetafieldTitle] = useState('');
  const [newMetafieldValue, setNewMetafieldValue] = useState('');
  const [newMetafieldGroup, setNewMetafieldGroup] = useState('Products');
  const [newMetafieldType, setNewMetafieldType] = useState('Single line text');
  const [newMetafieldFilter, setNewMetafieldFilter] = useState(0);
  const [newMetafieldIdentifier, setNewMetafieldIdentifier] = useState('');
  const [newModifierTitle, setNewModifierTitle] = useState('');
  const [newModifierNotes, setNewModifierNotes] = useState('');
  const [newModifierType, setNewModifierType] = useState('percentage');
  const [newModifierValue, setNewModifierValue] = useState(0);
  const [newModifierValueSign, setNewModifierValueSign] = useState('+'); // + or -
  const [newModifierIdentifier, setNewModifierIdentifier] = useState('');

  // Metafield creation states (similar to modifiers)
  const [metafieldTitleDrawerVisible, setMetafieldTitleDrawerVisible] = useState(false);
  const [selectedMetafieldTitleType, setSelectedMetafieldTitleType] = useState('');
  const [customMetafieldTitle, setCustomMetafieldTitle] = useState('');
  const [metafieldGroupDrawerVisible, setMetafieldGroupDrawerVisible] = useState(false);
  const [metafieldValueTypeDrawerVisible, setMetafieldValueTypeDrawerVisible] = useState(false);
  // Value configuration states based on selected type
  const [metafieldDefaultValue, setMetafieldDefaultValue] = useState('');
  const [metafieldMinValue, setMetafieldMinValue] = useState('');
  const [metafieldMaxValue, setMetafieldMaxValue] = useState('');
  const [metafieldUnit, setMetafieldUnit] = useState('');
  const [metafieldValidationPattern, setMetafieldValidationPattern] = useState('');

  // Metafield value drawer states
  const [metafieldValueDrawerVisible, setMetafieldValueDrawerVisible] = useState(false);
  const [selectedMetafieldForEdit, setSelectedMetafieldForEdit] = useState<any | null>(null);
  const [currentMetafieldValue, setCurrentMetafieldValue] = useState('');
  const [currentProduct, setCurrentProduct] = useState<any | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // Modifier creation states (similar to options)
  const [modifierTitleDrawerVisible, setModifierTitleDrawerVisible] = useState(false);
  const [selectedModifierTitleType, setSelectedModifierTitleType] = useState('');
  const [customModifierTitle, setCustomModifierTitle] = useState('');
  const [selectedModifierIdentifierType, setSelectedModifierIdentifierType] = useState<'color' | 'image' | 'text' | null>(null);
  const [modifierIdentifierColorValue, setModifierIdentifierColorValue] = useState('#000000');
  const [modifierIdentifierImageValue, setModifierIdentifierImageValue] = useState('[]');
  const [modifierIdentifierTextValue, setModifierIdentifierTextValue] = useState('');
  const [modifierColorPickerDrawerVisible, setModifierColorPickerDrawerVisible] = useState(false);
  const [modifierImageClearDrawerVisible, setModifierImageClearDrawerVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('[]');
  const [newCategoryNotes, setNewCategoryNotes] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<number | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionImage, setNewCollectionImage] = useState('[]');
  const [newCollectionNotes, setNewCollectionNotes] = useState('');
  const [newCollectionParent, setNewCollectionParent] = useState<number | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorImage, setNewVendorImage] = useState('[]');
  const [newVendorNotes, setNewVendorNotes] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandImage, setNewBrandImage] = useState('[]');
  const [newBrandNotes, setNewBrandNotes] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagImage, setNewTagImage] = useState('[]');
  const [newTagNotes, setNewTagNotes] = useState('');
  const [selectedParentCategory, setSelectedParentCategory] = useState<any | null>(null);
  const [selectedParentCollection, setSelectedParentCollection] = useState<any | null>(null);
  const [parentCategoryModalVisible, setParentCategoryModalVisible] = useState(false);
  const [parentCollectionModalVisible, setParentCollectionModalVisible] = useState(false);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [isCreatingMetafield, setIsCreatingMetafield] = useState(false);
  const [isCreatingModifier, setIsCreatingModifier] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
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
    stock: 0,
    publish: 'draft',
    promoinfo: '',
    featured: 0,
    relproducts: '[]', // Empty JSON array
    sellproducts: '[]', // Empty JSON array
  });

  // Inventory generation states
  const [generateInventoryModalVisible, setGenerateInventoryModalVisible] = useState(false);
  const [inventoryGenerationPreview, setInventoryGenerationPreview] = useState<any[]>([]);
  const [isGeneratingInventory, setIsGeneratingInventory] = useState(false);
  const [inventoryGenerationSettings, setInventoryGenerationSettings] = useState({
    skuPattern: '{product}-{option1}-{option2}-{option3}',
    defaultCost: 0,
    defaultPrice: 0,
    defaultStock: 10,
    defaultSalePrice: 0
  });

  const { profileData } = useOnboarding();

  // Helper function to reset new option form
  const resetNewOptionForm = () => {
    setNewOptionTitle('');
    setNewOptionValue('');
    setNewOptionIdentifier('');
    setSelectedOptionTitleType('');
    setCustomOptionTitle('');
    setSelectedIdentifierType(null);
    setIdentifierColorValue('#000000');
    setIdentifierImageValue('');
    setIdentifierTextValue('');
    setColorPickerDrawerVisible(false);
  };

  // Handle option title type selection
  const handleOptionTitleTypeSelection = (titleType: string) => {
    setSelectedOptionTitleType(titleType);
    if (titleType === 'Custom') {
      // Don't set newOptionTitle yet, wait for user to enter custom title
      setNewOptionTitle('');
    } else {
      setNewOptionTitle(titleType);
      setCustomOptionTitle('');
    }
    setOptionTitleDrawerVisible(false);
  };

  // Get display value for option title
  const getOptionTitleDisplayValue = () => {
    if (selectedOptionTitleType === 'Custom') {
      return customOptionTitle || 'Enter custom title';
    } else if (selectedOptionTitleType) {
      return selectedOptionTitleType;
    } else {
      return 'Select option type';
    }
  };

  // Check if custom title tile should be shown
  const shouldShowCustomTitleTile = () => {
    return selectedOptionTitleType === 'Custom';
  };

  // Handle identifier type selection
  const handleIdentifierTypeSelection = (type: 'color' | 'image' | 'text') => {
    if (type === 'color') {
      setSelectedIdentifierType(type);
      setColorPickerDrawerVisible(true);
    } else {
      setSelectedIdentifierType(type);
    }
    // Reset other identifier values when switching types
    if (type !== 'color') setIdentifierColorValue('#000000');
    if (type !== 'image') setIdentifierImageValue('[]');
    if (type !== 'text') setIdentifierTextValue('');
  };

  // Handle identifier image change
  const handleIdentifierImageChange = (imageUrl: string) => {
    setIdentifierImageValue(imageUrl);
  };

  // Handle modifier title type selection
  const handleModifierTitleTypeSelection = (titleType: string) => {
    setSelectedModifierTitleType(titleType);
    if (titleType === 'Custom') {
      // Don't set newModifierTitle yet, wait for user to enter custom title
      setNewModifierTitle('');
    } else {
      setNewModifierTitle(titleType);
      setCustomModifierTitle('');
    }
    setModifierTitleDrawerVisible(false);
  };

  // Get display value for modifier title
  const getModifierTitleDisplayValue = () => {
    if (selectedModifierTitleType === 'Custom') {
      return customModifierTitle || 'Enter custom title';
    } else if (selectedModifierTitleType) {
      return selectedModifierTitleType;
    } else {
      return 'Select modifier type';
    }
  };

  // Check if custom modifier title tile should be shown
  const shouldShowCustomModifierTitleTile = () => {
    return selectedModifierTitleType === 'Custom';
  };

  // Handle modifier identifier type selection
  const handleModifierIdentifierTypeSelection = (type: 'color' | 'image' | 'text') => {
    if (type === 'color') {
      setSelectedModifierIdentifierType(type);
      setModifierColorPickerDrawerVisible(true);
    } else {
      setSelectedModifierIdentifierType(type);
    }
    // Reset other identifier values when switching types
    if (type !== 'color') setModifierIdentifierColorValue('#000000');
    if (type !== 'image') setModifierIdentifierImageValue('[]');
    if (type !== 'text') setModifierIdentifierTextValue('');
  };

  // Handle modifier identifier image change
  const handleModifierIdentifierImageChange = (imageUrl: string) => {
    setModifierIdentifierImageValue(imageUrl);
  };

  // Helper function to reset new metafield form
  const resetNewMetafieldForm = () => {
    setNewMetafieldTitle('');
    setNewMetafieldValue('');
    setNewMetafieldGroup('Products');
    setNewMetafieldType('Single line text');
    setNewMetafieldFilter(0);
    setNewMetafieldIdentifier('');
    setSelectedMetafieldTitleType('');
    setCustomMetafieldTitle('');
    setMetafieldGroupDrawerVisible(false);
    setMetafieldValueTypeDrawerVisible(false);
    // Reset value configuration states
    setMetafieldDefaultValue('');
    setMetafieldMinValue('');
    setMetafieldMaxValue('');
    setMetafieldUnit('');
    setMetafieldValidationPattern('');
  };

  // Metafield helper functions
  const handleMetafieldTitleTypeSelection = (titleType: string) => {
    setSelectedMetafieldTitleType(titleType);
    if (titleType === 'Custom') {
      // Don't set newMetafieldTitle yet, wait for user to enter custom title
      setNewMetafieldTitle('');
    } else {
      setNewMetafieldTitle(titleType);
      setCustomMetafieldTitle('');
    }
    setMetafieldTitleDrawerVisible(false);
  };

  const handleMetafieldGroupSelection = (group: string) => {
    setNewMetafieldGroup(group);
    setMetafieldGroupDrawerVisible(false);
  };

  const handleMetafieldValueTypeSelection = (valueType: string) => {
    setNewMetafieldType(valueType);
    setMetafieldValueTypeDrawerVisible(false);
  };

  const getMetafieldTitleDisplayValue = () => {
    if (selectedMetafieldTitleType === 'Custom') {
      return customMetafieldTitle || 'Enter custom title';
    }
    return selectedMetafieldTitleType || 'Select metafield type';
  };

  // Get configuration fields based on selected value type
  const getValueTypeConfigFields = () => {
    switch (newMetafieldType) {
      case 'Number (integer)':
      case 'Number (decimal)':
        return ['defaultValue', 'minValue', 'maxValue'];
      case 'Single line text':
      case 'Multi-line text':
        return ['defaultValue', 'validationPattern'];
      case 'Weight':
      case 'Volume':
      case 'Dimension':
        return ['defaultValue', 'unit', 'minValue', 'maxValue'];
      case 'Currency':
        return ['defaultValue', 'minValue', 'maxValue'];
      case 'Rating':
        return ['defaultValue', 'minValue', 'maxValue'];
      case 'URL':
        return ['defaultValue', 'validationPattern'];
      case 'Date':
      case 'Date and time':
        return ['defaultValue'];
      case 'Boolean':
        return ['defaultValue'];
      case 'Color':
        return ['defaultValue'];
      case 'JSON':
        return ['defaultValue'];
      default:
        return ['defaultValue'];
    }
  };

  // Helper function to get stored metafield values from product
  const getStoredMetafieldValues = (product: any) => {
    try {
      if (!product.metafields) return {};

      // If it's a JSON string, parse it
      if (typeof product.metafields === 'string') {
        const parsed = JSON.parse(product.metafields);

        // If it's an array of IDs (old format), return empty object
        if (Array.isArray(parsed)) return {};

        // If it's an object with title:value pairs, return it
        return parsed;
      }

      return product.metafields;
    } catch (error) {
      return {};
    }
  };

  // Helper function to get clean metafield display value from stored product values
  const getMetafieldDisplayValue = (metafield: any, product: any) => {
    // Get the stored values from the product's metafields column
    const storedValues = getStoredMetafieldValues(product);
    const storedValue = storedValues[metafield.title];

    // If we have a stored value, return it
    if (storedValue !== undefined && storedValue !== '') {
      return String(storedValue);
    }

    // Otherwise, try to get the default value from metafield configuration
    if (!metafield.value) return 'Not set';

    try {
      // Try to parse the value as JSON configuration
      const config = JSON.parse(metafield.value);

      // Return the defaultValue if it exists, otherwise return 'Not set'
      if (config.defaultValue !== undefined && config.defaultValue !== '') {
        return String(config.defaultValue);
      }

      return 'Not set';
    } catch (error) {
      // If it's not JSON, return 'Not set'
      return 'Not set';
    }
  };

  // Helper function to get metafield edit value (for the drawer)
  const getMetafieldEditValue = (metafield: any) => {
    if (!metafield.value) return '';

    try {
      // Try to parse the value as JSON configuration
      const config = JSON.parse(metafield.value);

      // Return the defaultValue if it exists, otherwise return the raw value
      if (config.defaultValue !== undefined) {
        return config.defaultValue;
      }

      // If no DefaultValue, return the raw value
      return metafield.value;
    } catch (error) {
      // If it's not JSON, return the raw value
      return metafield.value;
    }
  };

  // Open metafield value drawer for editing
  const openMetafieldValueDrawer = (metafield: any, product: any, editMode: boolean) => {
    setSelectedMetafieldForEdit(metafield);
    setCurrentMetafieldValue(getMetafieldEditValue(metafield));
    setCurrentProduct(product);
    setIsEditingProduct(editMode);
    setMetafieldValueDrawerVisible(true);
  };

  // Helper function to reset new modifier form
  const resetNewModifierForm = () => {
    setNewModifierTitle('');
    setNewModifierNotes('');
    setNewModifierType('percentage'); // Default to percentage
    setNewModifierValue(0);
    setNewModifierValueSign('+'); // Default to plus
    setNewModifierIdentifier('');
    setSelectedModifierTitleType('');
    setCustomModifierTitle('');
    setSelectedModifierIdentifierType(null);
    setModifierIdentifierColorValue('#000000');
    setModifierIdentifierImageValue('[]');
    setModifierIdentifierTextValue('');
    setModifierColorPickerDrawerVisible(false);
  };

  // Helper function to reset new category form
  const resetNewCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryImage('[]');
    setNewCategoryNotes('');
    setNewCategoryParent(null);
    setSelectedParentCategory(null);
  };

  // Helper function to reset new collection form
  const resetNewCollectionForm = () => {
    setNewCollectionName('');
    setNewCollectionImage('[]');
    setNewCollectionNotes('');
    setNewCollectionParent(null);
    setSelectedParentCollection(null);
  };

  // Helper function to reset new vendor form
  const resetNewVendorForm = () => {
    setNewVendorName('');
    setNewVendorImage('[]');
    setNewVendorNotes('');
  };

  // Helper function to reset new brand form
  const resetNewBrandForm = () => {
    setNewBrandName('');
    setNewBrandImage('[]');
    setNewBrandNotes('');
  };

  // Helper function to reset new tag form
  const resetNewTagForm = () => {
    setNewTagName('');
    setNewTagImage('[]');
    setNewTagNotes('');
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
      metafields: '{}',
      saleinfo: '',
      stores: '',
      pos: 1,
      website: 1,
      seo: '{"slug":"", "title":"", "keywords":""}',
      tags: '',
      cost: 0,
      qrcode: '',
      stock: 0,
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

  // Fetch available collections for selection
  const fetchAvailableCollections = async () => {
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
                sql: "SELECT id, name, image, notes, parent FROM collections ORDER BY name LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const collectionData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            name: row[1].type === 'null' ? '' : row[1].value,
            image: row[2].type === 'null' ? '[]' : row[2].value,
            notes: row[3].type === 'null' ? '' : row[3].value,
            parent: row[4].type === 'null' ? null : parseInt(row[4].value)
          }));
          setAvailableCollections(collectionData);
        }
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Fetch available vendors for selection
  const fetchAvailableVendors = async () => {
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
                sql: "SELECT id, name, image, notes FROM vendors ORDER BY name LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const vendorData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            name: row[1].type === 'null' ? '' : row[1].value,
            image: row[2].type === 'null' ? '[]' : row[2].value,
            notes: row[3].type === 'null' ? '' : row[3].value
          }));
          setAvailableVendors(vendorData);
        }
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  // Fetch available brands for selection
  const fetchAvailableBrands = async () => {
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
                sql: "SELECT id, name, image, notes FROM brands ORDER BY name LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const brandData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            name: row[1].type === 'null' ? '' : row[1].value,
            image: row[2].type === 'null' ? '[]' : row[2].value,
            notes: row[3].type === 'null' ? '' : row[3].value
          }));
          setAvailableBrands(brandData);
        }
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Fetch available tags for selection
  const fetchAvailableTags = async () => {
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
                sql: "SELECT id, name, image, notes FROM tags ORDER BY name LIMIT 100"
              }
            }
          ]
        })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.results?.[0]?.response?.result?.rows) {
          const tagData = data.results[0].response.result.rows.map((row: any[]) => ({
            id: parseInt(row[0].value),
            name: row[1].type === 'null' ? '' : row[1].value,
            image: row[2].type === 'null' ? '[]' : row[2].value,
            notes: row[3].type === 'null' ? '' : row[3].value
          }));
          setAvailableTags(tagData);
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
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
                    saleinfo, stores, pos, website, seo, tags, cost, qrcode, stock, createdat,
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
              metafields: row[15].type === 'null' ? '{}' : row[15].value,
              saleinfo: row[16].type === 'null' ? '' : row[16].value,
              stores: row[17].type === 'null' ? '' : row[17].value,
              pos: row[18].type === 'null' ? 0 : parseInt(row[18].value),
              website: row[19].type === 'null' ? 0 : parseInt(row[19].value),
              seo: row[20].type === 'null' ? '{"slug":"", "title":"", "keywords":""}' : row[20].value,
              tags: row[21].type === 'null' ? '' : row[21].value,
              cost: row[22].type === 'null' ? 0 : parseFloat(row[22].value),
              qrcode: row[23].type === 'null' ? '' : row[23].value,
              stock: row[24].type === 'null' ? 0 : parseInt(row[24].value),
              createdat: row[25].type === 'null' ? '' : row[25].value,
              updatedat: row[26].type === 'null' ? '' : row[26].value,
              publishat: row[27].type === 'null' ? '' : row[27].value,
              publish: row[28].type === 'null' ? 'draft' : row[28].value,
              promoinfo: row[29].type === 'null' ? '' : row[29].value,
              featured: row[30].type === 'null' ? 0 : parseInt(row[30].value),
              relproducts: row[31].type === 'null' ? '[]' : row[31].value,
              sellproducts: row[32].type === 'null' ? '[]' : row[32].value,
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
                tags, cost, qrcode, stock, createdat, updatedat, publishat, publish,
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
                '${(newProduct.metafields || '{}').replace(/'/g, "''")}',
                '${(newProduct.saleinfo || '').replace(/'/g, "''")}',
                '${(newProduct.stores || '').replace(/'/g, "''")}',
                ${newProduct.pos || 0},
                ${newProduct.website || 0},
                '${(newProduct.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                '${(newProduct.tags || '').replace(/'/g, "''")}',
                ${newProduct.cost || 0},
                '${(newProduct.qrcode || '').replace(/'/g, "''")}',
                ${newProduct.stock || 0},
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
                metafields = '${(selectedProductForEdit.metafields || '{}').replace(/'/g, "''")}',
                saleinfo = '${(selectedProductForEdit.saleinfo || '').replace(/'/g, "''")}',
                stores = '${(selectedProductForEdit.stores || '').replace(/'/g, "''")}',
                pos = ${selectedProductForEdit.pos || 0},
                website = ${selectedProductForEdit.website || 0},
                seo = '${(selectedProductForEdit.seo || '{"slug":"", "title":"", "keywords":""}').replace(/'/g, "''")}',
                tags = '${(selectedProductForEdit.tags || '').replace(/'/g, "''")}',
                cost = ${selectedProductForEdit.cost || 0},
                qrcode = '${(selectedProductForEdit.qrcode || '').replace(/'/g, "''")}',
                stock = ${selectedProductForEdit.stock || 0},
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

  const updateInventoryItem = async () => {
    try {
      if (!selectedInventoryItem) {
        Alert.alert('Error', 'No inventory item selected');
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

      // Create the request body with direct SQL values for UPDATE
      const sqlQuery = `UPDATE inventory SET
        image = '${(selectedInventoryItem.image || '').replace(/'/g, "''")}',
        barcode = '${(selectedInventoryItem.barcode || '').replace(/'/g, "''")}',
        reorderlevel = ${selectedInventoryItem.reorderlevel || 0},
        path = '${(selectedInventoryItem.path || '').replace(/'/g, "''")}',
        available = ${selectedInventoryItem.available || 0},
        committed = ${selectedInventoryItem.committed || 0},
        unavailable = ${selectedInventoryItem.unavailable || 0},
        onhand = ${selectedInventoryItem.onhand || 0},
        metafields = '${(selectedInventoryItem.metafields || '').replace(/'/g, "''")}',
        cost = ${selectedInventoryItem.cost || 0},
        price = ${selectedInventoryItem.price || 0},
        margin = ${selectedInventoryItem.margin || 0},
        saleprice = ${selectedInventoryItem.saleprice || 0}
        WHERE id = ${selectedInventoryItem.id}`;

      console.log('Generated UPDATE SQL Query:', sqlQuery);

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: sqlQuery
            }
          }
        ]
      };

      // Log the request for debugging
      console.log('API URL:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Update inventory item
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
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed response data:', JSON.stringify(data, null, 2));

          // Check if the operation was successful
          if (data.results && data.results[0] && data.results[0].response) {
            console.log('Inventory item updated successfully');

            // Close modal and reset selection
            setEditInventoryModalVisible(false);
            setSelectedInventoryItem(null);

            // Refresh inventory list for the current product
            if (selectedProductForEdit?.id) {
              fetchInventoryForProduct(selectedProductForEdit.id);
            }
          } else {
            console.error('Unexpected response structure:', data);
            Alert.alert(
              'Error',
              'Unexpected response from server. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.log('Raw response text:', responseText);
          Alert.alert(
            'Error',
            'Error parsing server response. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('Failed to update inventory item:', responseText);
        Alert.alert(
          'Error',
          `Failed to update inventory item. Status: ${response.status}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating the inventory item. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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

  // Helper function to get selected metafield IDs from key-value pairs
  const getSelectedMetafieldIdsFromKeyValue = (metafieldsJson: string): number[] => {
    try {
      const parsed = JSON.parse(metafieldsJson || '{}');

      // If it's an array (old format), return it
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // If it's an object with key-value pairs, find matching metafield IDs
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        const matchingIds: number[] = [];

        keys.forEach(key => {
          const metafield = availableMetafields.find(m => m.title === key);
          if (metafield) {
            matchingIds.push(metafield.id);
          }
        });

        return matchingIds;
      }

      return [];
    } catch (error) {
      return [];
    }
  };

  const openMetafieldsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);

    // Fetch metafields first if not already loaded
    if (availableMetafields.length === 0) {
      await fetchAvailableMetafields();
    }

    // Get selected IDs from key-value pairs
    const currentIds = getSelectedMetafieldIdsFromKeyValue(currentProduct.metafields || '{}');
    setSelectedMetafieldIds(currentIds);

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
    // Create key-value pairs from selected metafields
    const metafieldKeyValuePairs: { [key: string]: string } = {};

    selectedMetafieldIds.forEach(id => {
      const metafield = availableMetafields.find(m => m.id === id);
      if (metafield) {
        // Initialize with empty string or default value
        let defaultValue = '';
        try {
          const config = JSON.parse(metafield.value || '{}');
          defaultValue = config.defaultValue || '';
        } catch (error) {
          defaultValue = '';
        }
        metafieldKeyValuePairs[metafield.title] = defaultValue;
      }
    });

    const metafieldsJson = JSON.stringify(metafieldKeyValuePairs);

    // Check if we're editing an inventory item
    if (selectedInventoryItem) {
      setSelectedInventoryItem({
        ...selectedInventoryItem,
        metafields: metafieldsJson
      });
    } else if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, metafields: metafieldsJson});
    } else {
      setNewProduct({...newProduct, metafields: metafieldsJson});
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

  // Collections drawer functions
  const openCollectionsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);

    // Fetch collections first if not already loaded
    if (availableCollections.length === 0) {
      await fetchAvailableCollections();
    }

    setCollectionsDrawerVisible(true);
  };

  const selectCollection = (collectionId: number) => {
    const selectedCollection = availableCollections.find(col => col.id === collectionId);
    const collectionName = selectedCollection ? selectedCollection.name : '';

    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, collection: collectionName});
    } else {
      setNewProduct({...newProduct, collection: collectionName});
    }

    setCollectionsDrawerVisible(false);
  };

  // Vendors drawer functions
  const openVendorsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);

    // Fetch vendors first if not already loaded
    if (availableVendors.length === 0) {
      await fetchAvailableVendors();
    }

    setVendorsDrawerVisible(true);
  };

  const selectVendor = (vendorId: number) => {
    const selectedVendor = availableVendors.find(vendor => vendor.id === vendorId);
    const vendorName = selectedVendor ? selectedVendor.name : '';

    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, vendor: vendorName});
    } else {
      setNewProduct({...newProduct, vendor: vendorName});
    }

    setVendorsDrawerVisible(false);
  };

  // Brands drawer functions
  const openBrandsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);

    // Fetch brands first if not already loaded
    if (availableBrands.length === 0) {
      await fetchAvailableBrands();
    }

    setBrandsDrawerVisible(true);
  };

  const selectBrand = (brandId: number) => {
    const selectedBrand = availableBrands.find(brand => brand.id === brandId);
    const brandName = selectedBrand ? selectedBrand.name : '';

    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, brand: brandName});
    } else {
      setNewProduct({...newProduct, brand: brandName});
    }

    setBrandsDrawerVisible(false);
  };

  // Tags drawer functions
  const openTagsDrawer = async (currentProduct: Partial<Product>, editMode: boolean = false) => {
    setIsEditMode(editMode);
    const currentIds = parseSelectedIds(currentProduct.tags || '[]');
    setSelectedTagIds(currentIds);

    // Fetch tags first if not already loaded
    if (availableTags.length === 0) {
      await fetchAvailableTags();
    }

    setTagsDrawerVisible(true);
  };

  const handleTagsSelection = () => {
    const selectedIdsJson = JSON.stringify(selectedTagIds);
    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, tags: selectedIdsJson});
    } else {
      setNewProduct({...newProduct, tags: selectedIdsJson});
    }
    setTagsDrawerVisible(false);
  };

  const toggleTagSelection = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Units drawer functions
  const openUnitsDrawer = (editMode: boolean = false) => {
    setIsEditMode(editMode);
    setUnitsDrawerVisible(true);
  };

  const selectUnit = (unit: string) => {
    if (isEditMode && selectedProductForEdit) {
      setSelectedProductForEdit({...selectedProductForEdit, unit: unit});
    } else {
      setNewProduct({...newProduct, unit: unit});
    }
    setUnitsDrawerVisible(false);
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

  // Helper function to get selected tag names
  const getSelectedTagNames = (tagIds: number[]): string => {
    if (tagIds.length === 0) return '';

    const selectedTags = availableTags.filter(tag => tagIds.includes(tag.id));
    if (selectedTags.length === 0) return `${tagIds.length} tags selected`;

    if (selectedTags.length <= 3) {
      return selectedTags.map(tag => tag.name).join(', ');
    } else {
      return `${selectedTags.slice(0, 2).map(tag => tag.name).join(', ')} +${selectedTags.length - 2} more`;
    }
  };

  // Helper function to parse identifier and get type/value
  const parseIdentifier = (identifierString: string): { type: 'color' | 'image' | 'text' | null, value: string } => {
    if (!identifierString) return { type: null, value: '' };

    try {
      const identifier = JSON.parse(identifierString);

      if (identifier.color) {
        return { type: 'color', value: identifier.color };
      } else if (identifier.image) {
        // Handle both string and array formats for image
        let imageValue = identifier.image;
        if (typeof imageValue === 'string') {
          try {
            // Try to parse as JSON array
            const parsed = JSON.parse(imageValue);
            imageValue = Array.isArray(parsed) ? parsed[0] : imageValue;
          } catch {
            // If parsing fails, use as is
          }
        } else if (Array.isArray(imageValue)) {
          imageValue = imageValue[0];
        }
        return { type: 'image', value: imageValue || '' };
      } else if (identifier.text) {
        return { type: 'text', value: identifier.text };
      }
    } catch (error) {
      console.log('Error parsing identifier:', error);
    }

    return { type: null, value: '' };
  };

  // Helper component to render identifier thumbnail
  const renderIdentifierThumbnail = (identifier: string) => {
    const { type, value } = parseIdentifier(identifier);

    if (!type || !value) {
      return (
        <View style={styles.identifierThumbnail}>
          <Text style={styles.textThumbnail}>-</Text>
        </View>
      );
    }

    switch (type) {
      case 'color':
        return (
          <View style={[styles.identifierThumbnail, { backgroundColor: value }]} />
        );
      case 'image':
        return (
          <Image source={{ uri: value }} style={styles.identifierThumbnail} />
        );
      case 'text':
        return (
          <View style={styles.identifierThumbnail}>
            <Text style={styles.textThumbnail}>{value}</Text>
          </View>
        );
      default:
        return (
          <View style={styles.identifierThumbnail}>
            <Text style={styles.textThumbnail}>-</Text>
          </View>
        );
    }
  };

  // Generate option combinations for inventory
  const generateOptionCombinations = (selectedOptionIds: number[]): any[] => {
    if (selectedOptionIds.length === 0) return [];

    // Get the selected options with their details
    const selectedOptions = availableOptions.filter(option => selectedOptionIds.includes(option.id));

    // Group options by their parent (to handle hierarchical options)
    const optionGroups: { [key: string]: any[] } = {};

    selectedOptions.forEach(option => {
      if (option.parentid === null) {
        // This is a root option
        const groupKey = option.title || `group_${option.id}`;
        if (!optionGroups[groupKey]) {
          optionGroups[groupKey] = [];
        }
        optionGroups[groupKey].push(option);

        // Add children of this option
        const children = availableOptions.filter(child => child.parentid === option.id && selectedOptionIds.includes(child.id));
        optionGroups[groupKey].push(...children);
      }
    });

    // If no groups found, treat all as individual options
    if (Object.keys(optionGroups).length === 0) {
      selectedOptions.forEach(option => {
        const groupKey = option.title || `option_${option.id}`;
        optionGroups[groupKey] = [option];
      });
    }

    // Generate combinations
    const groupKeys = Object.keys(optionGroups);
    const combinations: any[] = [];

    if (groupKeys.length === 1) {
      // Single group - each option is a variant
      const group = optionGroups[groupKeys[0]];
      group.forEach(option => {
        combinations.push({
          option1: option.value || option.title,
          option2: '',
          option3: '',
          options: [option]
        });
      });
    } else if (groupKeys.length === 2) {
      // Two groups - cartesian product
      const group1 = optionGroups[groupKeys[0]];
      const group2 = optionGroups[groupKeys[1]];

      group1.forEach(opt1 => {
        group2.forEach(opt2 => {
          combinations.push({
            option1: opt1.value || opt1.title,
            option2: opt2.value || opt2.title,
            option3: '',
            options: [opt1, opt2]
          });
        });
      });
    } else if (groupKeys.length >= 3) {
      // Three or more groups - use first three
      const group1 = optionGroups[groupKeys[0]];
      const group2 = optionGroups[groupKeys[1]];
      const group3 = optionGroups[groupKeys[2]];

      group1.forEach(opt1 => {
        group2.forEach(opt2 => {
          group3.forEach(opt3 => {
            combinations.push({
              option1: opt1.value || opt1.title,
              option2: opt2.value || opt2.title,
              option3: opt3.value || opt3.title,
              options: [opt1, opt2, opt3]
            });
          });
        });
      });
    }

    return combinations;
  };

  // Generate SKU based on pattern
  const generateSKU = (productTitle: string, combination: any, pattern: string): string => {
    let sku = pattern;
    sku = sku.replace('{product}', (productTitle || 'PROD').toUpperCase().replace(/\s+/g, '').substring(0, 8));
    sku = sku.replace('{option1}', (combination.option1 || '').toUpperCase().replace(/\s+/g, '').substring(0, 6));
    sku = sku.replace('{option2}', (combination.option2 || '').toUpperCase().replace(/\s+/g, '').substring(0, 6));
    sku = sku.replace('{option3}', (combination.option3 || '').toUpperCase().replace(/\s+/g, '').substring(0, 6));

    // Remove empty parts and clean up
    sku = sku.replace(/-+/g, '-').replace(/^-|-$/g, '');

    return sku || 'AUTO-SKU';
  };

  // Open inventory generation modal
  const openInventoryGenerationModal = () => {
    if (!selectedProductForEdit) return;

    const selectedIds = parseSelectedIds(selectedProductForEdit.options || '[]');
    if (selectedIds.length === 0) {
      Alert.alert('No Options', 'Please select options for this product before generating inventory variants.');
      return;
    }

    const combinations = generateOptionCombinations(selectedIds);
    if (combinations.length === 0) {
      Alert.alert('No Combinations', 'No valid option combinations found.');
      return;
    }

    if (combinations.length > 50) {
      Alert.alert(
        'Too Many Combinations',
        `This will generate ${combinations.length} inventory items. Consider reducing the number of selected options.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => {
            setInventoryGenerationPreview(combinations);
            setGenerateInventoryModalVisible(true);
          }}
        ]
      );
    } else {
      setInventoryGenerationPreview(combinations);
      setGenerateInventoryModalVisible(true);
    }
  };

  // Generate inventory items
  const generateInventoryItems = async () => {
    if (!selectedProductForEdit || inventoryGenerationPreview.length === 0) return;

    try {
      setIsGeneratingInventory(true);
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Prepare batch insert requests
      const requests = inventoryGenerationPreview.map(combination => {
        const sku = generateSKU(selectedProductForEdit.title || '', combination, inventoryGenerationSettings.skuPattern);

        return {
          type: "execute",
          stmt: {
            sql: `INSERT INTO inventory (
              productId, sku, barcode, image, option1, option2, option3,
              reorderlevel, path, available, committed, unavailable, onhand,
              metafields, cost, price, margin, saleprice
            ) VALUES (
              ${selectedProductForEdit.id},
              '${sku.replace(/'/g, "''")}',
              '',
              '[]',
              '${(combination.option1 || '').replace(/'/g, "''")}',
              '${(combination.option2 || '').replace(/'/g, "''")}',
              '${(combination.option3 || '').replace(/'/g, "''")}',
              0,
              '',
              ${inventoryGenerationSettings.defaultStock},
              0,
              0,
              ${inventoryGenerationSettings.defaultStock},
              '[]',
              ${inventoryGenerationSettings.defaultCost},
              ${inventoryGenerationSettings.defaultPrice},
              0,
              ${inventoryGenerationSettings.defaultSalePrice}
            )`
          }
        };
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Inventory generation response:', data);

        // Close modal and refresh inventory
        setGenerateInventoryModalVisible(false);
        setInventoryGenerationPreview([]);

        // Refresh inventory for the current product
        if (selectedProductForEdit.id) {
          fetchInventoryForProduct(selectedProductForEdit.id);
        }

        Alert.alert('Success', `Generated ${inventoryGenerationPreview.length} inventory variants successfully!`);
      } else {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('Error generating inventory:', error);
      Alert.alert('Error', 'Failed to generate inventory items. Please try again.');
    } finally {
      setIsGeneratingInventory(false);
    }
  };

  // Create new option function
  const createNewOption = async () => {
    if (!newOptionTitle.trim()) {
      Alert.alert('Error', 'Option title is required');
      return;
    }

    // Get the identifier value based on selected type and format as JSON object
    let identifierValue = '';
    if (selectedIdentifierType === 'color') {
      identifierValue = JSON.stringify({ color: identifierColorValue });
    } else if (selectedIdentifierType === 'image') {
      identifierValue = JSON.stringify({ image: identifierImageValue });
    } else if (selectedIdentifierType === 'text') {
      identifierValue = JSON.stringify({ text: identifierTextValue });
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
              sql: `INSERT INTO options (parentid, title, value, identifier) VALUES (NULL, '${newOptionTitle.replace(/'/g, "''")}', '${newOptionValue.replace(/'/g, "''")}', '${identifierValue.replace(/'/g, "''")}')`
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
    // Validate required fields
    const finalTitle = selectedMetafieldTitleType === 'Custom' ? customMetafieldTitle : newMetafieldTitle;
    if (!finalTitle.trim()) {
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

      // Build value configuration object based on selected type
      const valueConfig = {
        defaultValue: metafieldDefaultValue,
        minValue: metafieldMinValue,
        maxValue: metafieldMaxValue,
        unit: metafieldUnit,
        validationPattern: metafieldValidationPattern
      };
      const valueConfigString = JSON.stringify(valueConfig);

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO metafields (parentid, title, value, "group", type, filter) VALUES (NULL, '${finalTitle.replace(/'/g, "''")}', '${valueConfigString.replace(/'/g, "''")}', '${newMetafieldGroup.replace(/'/g, "''")}', '${newMetafieldType.replace(/'/g, "''")}', ${newMetafieldFilter})`
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
    // Validate required fields
    const finalTitle = selectedModifierTitleType === 'Custom' ? customModifierTitle : newModifierTitle;
    if (!finalTitle.trim()) {
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

      // Build identifier object based on selected type
      let identifierObject = '';
      if (selectedModifierIdentifierType === 'color') {
        identifierObject = JSON.stringify({ color: modifierIdentifierColorValue });
      } else if (selectedModifierIdentifierType === 'image') {
        identifierObject = JSON.stringify({ image: modifierIdentifierImageValue });
      } else if (selectedModifierIdentifierType === 'text') {
        identifierObject = JSON.stringify({ text: modifierIdentifierTextValue });
      }

      // Calculate final value with sign
      const finalValue = newModifierValueSign === '+' ? newModifierValue : -newModifierValue;

      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO modifiers (title, notes, type, value, identifier) VALUES ('${finalTitle.replace(/'/g, "''")}', '${newModifierNotes.replace(/'/g, "''")}', '${newModifierType.replace(/'/g, "''")}', ${finalValue}, '${identifierObject.replace(/'/g, "''")}')`
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

  // Create new collection function
  const createNewCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Collection name is required');
      return;
    }

    try {
      setIsCreatingCollection(true);
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
              sql: `INSERT INTO collections (name, image, notes, parent) VALUES ('${newCollectionName.replace(/'/g, "''")}', '${(newCollectionImage || '[]').replace(/'/g, "''")}', '${newCollectionNotes.replace(/'/g, "''")}', ${newCollectionParent === null ? 'NULL' : Number(newCollectionParent)})`
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
        resetNewCollectionForm();
        setCreateCollectionModalVisible(false);
        await fetchAvailableCollections();
      } else {
        throw new Error('Failed to create collection');
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection. Please try again.');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  // Create new vendor function
  const createNewVendor = async () => {
    if (!newVendorName.trim()) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }

    try {
      setIsCreatingVendor(true);
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
              sql: `INSERT INTO vendors (name, image, notes) VALUES ('${newVendorName.replace(/'/g, "''")}', '${(newVendorImage || '[]').replace(/'/g, "''")}', '${newVendorNotes.replace(/'/g, "''")}')`
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
        resetNewVendorForm();
        setCreateVendorModalVisible(false);
        await fetchAvailableVendors();
      } else {
        throw new Error('Failed to create vendor');
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      Alert.alert('Error', 'Failed to create vendor. Please try again.');
    } finally {
      setIsCreatingVendor(false);
    }
  };

  // Create new brand function
  const createNewBrand = async () => {
    if (!newBrandName.trim()) {
      Alert.alert('Error', 'Brand name is required');
      return;
    }

    try {
      setIsCreatingBrand(true);
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
              sql: `INSERT INTO brands (name, image, notes) VALUES ('${newBrandName.replace(/'/g, "''")}', '${(newBrandImage || '[]').replace(/'/g, "''")}', '${newBrandNotes.replace(/'/g, "''")}')`
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
        resetNewBrandForm();
        setCreateBrandModalVisible(false);
        await fetchAvailableBrands();
      } else {
        throw new Error('Failed to create brand');
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      Alert.alert('Error', 'Failed to create brand. Please try again.');
    } finally {
      setIsCreatingBrand(false);
    }
  };

  // Create new tag function
  const createNewTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Tag name is required');
      return;
    }

    try {
      setIsCreatingTag(true);
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
              sql: `INSERT INTO tags (name, image, notes) VALUES ('${newTagName.replace(/'/g, "''")}', '${(newTagImage || '[]').replace(/'/g, "''")}', '${newTagNotes.replace(/'/g, "''")}')`
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
        resetNewTagForm();
        setCreateTagModalVisible(false);
        await fetchAvailableTags();
      } else {
        throw new Error('Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchAvailableOptions();
    fetchAvailableMetafields();
    fetchAvailableModifiers();
    fetchAvailableCategories();
    fetchAvailableCollections();
    fetchAvailableVendors();
    fetchAvailableBrands();
    fetchAvailableTags();
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

  // Handle edit inventory item
  const handleEditInventoryItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);

    // Initialize metafields selection for inventory item
    try {
      const metafieldIds = JSON.parse(item.metafields || '[]');
      setSelectedMetafieldIds(Array.isArray(metafieldIds) ? metafieldIds : []);
    } catch (error) {
      setSelectedMetafieldIds([]);
    }

    // Reset tab sections
    setActiveInventoryTab(null);

    setEditInventoryModalVisible(true);
  };

  // Handle inventory item image change
  const handleInventoryImageChange = (imageUrl: string) => {
    if (selectedInventoryItem) {
      setSelectedInventoryItem({
        ...selectedInventoryItem,
        image: imageUrl
      });
    }
  };

  // Handle inventory metafields selection
  const handleInventoryMetafieldsSelection = () => {
    if (selectedInventoryItem) {
      const metafieldsJson = JSON.stringify(selectedMetafieldIds);
      setSelectedInventoryItem({
        ...selectedInventoryItem,
        metafields: metafieldsJson
      });
    }
    setMetafieldsDrawerVisible(false);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={styles.inventoryItem}
      onPress={() => handleEditInventoryItem(item)}
    >
      <View style={styles.inventoryRow}>
        <Text style={styles.inventoryTitle}>{item.sku || 'No SKU'}</Text>
        <Text style={styles.inventoryAvailable}>{item.available}</Text>
      </View>
    </TouchableOpacity>
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

                {/* Divider between first and second row */}
                <View style={styles.tilesDivider} />

                <View style={styles.tilesRow}>
                  <View style={[styles.tile, styles.tileLeft]}>
                    <View style={styles.imageTileContainer}>
                      {(() => {
                        try {
                          console.log('Core tab - newProduct.medias raw value:', newProduct.medias);
                          console.log('Core tab - newProduct.medias type:', typeof newProduct.medias);

                          // Handle both string and array cases
                          let mediaArray;
                          if (typeof newProduct.medias === 'string') {
                            const mediasValue = newProduct.medias || '[]';
                            console.log('Core tab - mediasValue after fallback:', mediasValue);
                            mediaArray = JSON.parse(mediasValue);
                          } else if (Array.isArray(newProduct.medias)) {
                            mediaArray = newProduct.medias;
                          } else {
                            mediaArray = [];
                          }

                          console.log('Core tab - mediaArray:', mediaArray);
                          console.log('Core tab - mediaArray type:', typeof mediaArray);
                          console.log('Core tab - mediaArray length:', Array.isArray(mediaArray) ? mediaArray.length : 'not array');

                          // Filter out empty strings and null values
                          const validImages = Array.isArray(mediaArray) ?
                            mediaArray.filter((url: string) => url && typeof url === 'string' && url.trim() !== '') : [];
                          console.log('Core tab - validImages:', validImages);
                          console.log('Core tab - validImages length:', validImages.length);

                          const firstImage = validImages.length > 0 ? validImages[0] : null;
                          console.log('Core tab - firstImage:', firstImage);

                          return firstImage ? (
                            <Image
                              key={firstImage}
                              source={{ uri: firstImage }}
                              style={styles.productImageTile}
                              onLoad={() => console.log('Core tab - Image loaded successfully:', firstImage)}
                              onError={(error) => console.log('Core tab - Image load error:', error.nativeEvent.error)}
                            />
                          ) : (
                            <View style={styles.imagePlaceholder}>
                              <Ionicons name="image-outline" size={24} color="#999" />
                            </View>
                          );
                        } catch (error) {
                          console.log('Core tab - error parsing media:', error);
                          return (
                            <View style={styles.imagePlaceholder}>
                              <Ionicons name="image-outline" size={24} color="#999" />
                            </View>
                          );
                        }
                      })()}
                    </View>
                  </View>

                  <View style={[styles.tile, styles.tileMiddle]}>
                    <View style={styles.qrCodeContainer}>
                      <View style={styles.qrCodeImage}>
                        <View style={styles.qrPattern}>
                          <View style={[styles.qrDot, { top: 2, left: 2 }]} />
                          <View style={[styles.qrDot, { top: 2, right: 2 }]} />
                          <View style={[styles.qrDot, { top: 8, left: 8 }]} />
                          <View style={[styles.qrDot, { top: 8, right: 8 }]} />
                          <View style={[styles.qrDot, { bottom: 2, left: 2 }]} />
                          <View style={[styles.qrDot, { bottom: 2, right: 2 }]} />
                          <View style={[styles.qrDot, { bottom: 8, left: 8 }]} />
                          <View style={[styles.qrDot, { bottom: 8, right: 8 }]} />
                          <View style={[styles.qrDot, { top: 14, left: 14 }]} />
                          <View style={[styles.qrDot, { top: 14, right: 14 }]} />
                          <View style={[styles.qrDot, { bottom: 14, left: 14 }]} />
                          <View style={[styles.qrDot, { bottom: 14, right: 14 }]} />
                        </View>
                      </View>
                      <Text style={styles.qrCodeValue}>{newProduct.qrcode || 'QR123456789'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.tile, styles.tileRight]}
                    onPress={() => openUnitsDrawer(false)}
                  >
                    <View style={styles.stockRow}>
                      <Text style={styles.stockTileValue}>{newProduct.stock || 0}</Text>
                      <Text style={styles.stockTileUnit}> {newProduct.unit || 'units'}</Text>
                    </View>
                    <Text style={styles.priceTileLabel}>Stock</Text>
                  </TouchableOpacity>
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
              </View>
            </View>

            {/* Metafields Tab */}
            <View style={{ margin: -16, padding: 0 }}>
              <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile, { borderTopWidth: 0 }]}
                  onPress={() => openMetafieldsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Metafields</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = getSelectedMetafieldIdsFromKeyValue(newProduct.metafields || '{}');
                      if (selectedIds.length === 0) {
                        return 'Select metafields';
                      } else {
                        return selectedIds.length.toString();
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = getSelectedMetafieldIdsFromKeyValue(newProduct.metafields || '{}');
                  if (selectedIds.length > 0) {
                    const selectedMetafields = availableMetafields.filter(metafield => selectedIds.includes(metafield.id));
                    return selectedMetafields.map((metafield) => (
                      <TouchableOpacity
                        key={metafield.id}
                        style={[styles.tile, styles.orgTileSingle]}
                        onPress={() => openMetafieldValueDrawer(metafield, newProduct, false)}
                      >
                        <Text style={styles.orgTileLabel}>{metafield.title}</Text>
                        <Text style={styles.orgTileValue}>{getMetafieldDisplayValue(metafield, newProduct)}</Text>
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

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openCollectionsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Collection</Text>
                  <Text style={styles.orgTileValue}>{newProduct.collection || 'Select collection'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openVendorsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Vendor</Text>
                  <Text style={styles.orgTileValue}>{newProduct.vendor || 'Select vendor'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openBrandsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Brand</Text>
                  <Text style={styles.orgTileValue}>{newProduct.brand || 'Select brand'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle]}
                  onPress={() => openTagsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Tags</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.tags || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select tags';
                      } else {
                        return `${selectedIds.length} tag${selectedIds.length !== 1 ? 's' : ''} selected`;
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.tags || '[]');
                  if (selectedIds.length > 0) {
                    const selectedTags = availableTags.filter(tag => selectedIds.includes(tag.id));
                    return selectedTags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.tile, styles.orgTileSingle]}
                        onPress={() => openTagsDrawer(newProduct, false)}
                      >
                        <Text style={styles.orgTileLabel}>{tag.name}</Text>
                        <Text style={styles.orgTileValue}>{tag.notes || 'No description'}</Text>
                      </TouchableOpacity>
                    ));
                  }
                  return null;
                })()}

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
                  style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile, { borderTopWidth: 0 }]}
                  onPress={() => openOptionsDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Options</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.options || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select options';
                      } else {
                        return selectedIds.length.toString();
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.options || '[]');
                  if (selectedIds.length > 0) {
                    const selectedOptions = availableOptions.filter(option => selectedIds.includes(option.id));
                    return selectedOptions.map((option) => (
                      <View
                        key={option.id}
                        style={[styles.tile, styles.orgTileSingle, styles.optionTileWithThumbnail]}
                      >
                        {renderIdentifierThumbnail(option.identifier || '')}
                        <View style={styles.optionTileContent}>
                          <Text style={styles.orgTileLabel}>{option.title}</Text>
                          <Text style={styles.orgTileValue}>{option.value || 'Not set'}</Text>
                        </View>
                      </View>
                    ));
                  }
                  return null;
                })()}

                <TouchableOpacity
                  style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile]}
                  onPress={() => openModifiersDrawer(newProduct, false)}
                >
                  <Text style={styles.orgTileLabel}>Modifiers</Text>
                  <Text style={styles.orgTileValue}>
                    {(() => {
                      const selectedIds = parseSelectedIds(newProduct.modifiers || '[]');
                      if (selectedIds.length === 0) {
                        return 'Select modifiers';
                      } else {
                        return selectedIds.length.toString();
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const selectedIds = parseSelectedIds(newProduct.modifiers || '[]');
                  if (selectedIds.length > 0) {
                    const selectedModifiers = availableModifiers.filter(modifier => selectedIds.includes(modifier.id));
                    return selectedModifiers.map((modifier) => (
                      <View
                        key={modifier.id}
                        style={[styles.tile, styles.orgTileSingle]}
                      >
                        <Text style={styles.orgTileLabel}>{modifier.title}</Text>
                        <Text style={styles.orgTileValue}>{modifier.value ? `$${modifier.value.toFixed(2)}` : 'Not set'}</Text>
                      </View>
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

                  {/* Divider between first and second row */}
                  <View style={styles.tilesDivider} />

                  <View style={styles.tilesRow}>
                    <View style={[styles.tile, styles.tileLeft]}>
                      <View style={styles.imageTileContainer}>
                        {(() => {
                          try {
                            console.log('Edit Core tab - selectedProductForEdit.medias raw value:', selectedProductForEdit.medias);
                            console.log('Edit Core tab - selectedProductForEdit.medias type:', typeof selectedProductForEdit.medias);

                            // Handle both string and array cases
                            let mediaArray;
                            if (typeof selectedProductForEdit.medias === 'string') {
                              const mediasValue = selectedProductForEdit.medias || '[]';
                              console.log('Edit Core tab - mediasValue after fallback:', mediasValue);
                              mediaArray = JSON.parse(mediasValue);
                            } else if (Array.isArray(selectedProductForEdit.medias)) {
                              mediaArray = selectedProductForEdit.medias;
                            } else {
                              mediaArray = [];
                            }

                            console.log('Edit Core tab - mediaArray:', mediaArray);
                            console.log('Edit Core tab - mediaArray type:', typeof mediaArray);
                            console.log('Edit Core tab - mediaArray length:', Array.isArray(mediaArray) ? mediaArray.length : 'not array');

                            // Filter out empty strings and null values
                            const validImages = Array.isArray(mediaArray) ?
                              mediaArray.filter((url: string) => url && typeof url === 'string' && url.trim() !== '') : [];
                            console.log('Edit Core tab - validImages:', validImages);
                            console.log('Edit Core tab - validImages length:', validImages.length);

                            const firstImage = validImages.length > 0 ? validImages[0] : null;
                            console.log('Edit Core tab - firstImage:', firstImage);

                            return firstImage ? (
                              <Image
                                key={firstImage}
                                source={{ uri: firstImage }}
                                style={styles.productImageTile}
                                onLoad={() => console.log('Edit Core tab - Image loaded successfully:', firstImage)}
                                onError={(error) => console.log('Edit Core tab - Image load error:', error.nativeEvent.error)}
                              />
                            ) : (
                              <View style={styles.imagePlaceholder}>
                                <Ionicons name="image-outline" size={24} color="#999" />
                              </View>
                            );
                          } catch (error) {
                            console.log('Edit Core tab - error parsing media:', error);
                            return (
                              <View style={styles.imagePlaceholder}>
                                <Ionicons name="image-outline" size={24} color="#999" />
                              </View>
                            );
                          }
                        })()}
                      </View>
                    </View>

                    <View style={[styles.tile, styles.tileMiddle]}>
                      <View style={styles.qrCodeContainer}>
                        <View style={styles.qrCodeImage}>
                          <View style={styles.qrPattern}>
                            <View style={[styles.qrDot, { top: 2, left: 2 }]} />
                            <View style={[styles.qrDot, { top: 2, right: 2 }]} />
                            <View style={[styles.qrDot, { top: 8, left: 8 }]} />
                            <View style={[styles.qrDot, { top: 8, right: 8 }]} />
                            <View style={[styles.qrDot, { bottom: 2, left: 2 }]} />
                            <View style={[styles.qrDot, { bottom: 2, right: 2 }]} />
                            <View style={[styles.qrDot, { bottom: 8, left: 8 }]} />
                            <View style={[styles.qrDot, { bottom: 8, right: 8 }]} />
                            <View style={[styles.qrDot, { top: 14, left: 14 }]} />
                            <View style={[styles.qrDot, { top: 14, right: 14 }]} />
                            <View style={[styles.qrDot, { bottom: 14, left: 14 }]} />
                            <View style={[styles.qrDot, { bottom: 14, right: 14 }]} />
                          </View>
                        </View>
                        <Text style={styles.qrCodeValue}>{selectedProductForEdit.qrcode || 'QR123456789'}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.tile, styles.tileRight]}
                      onPress={() => openUnitsDrawer(true)}
                    >
                      <View style={styles.stockRow}>
                        <Text style={styles.stockTileValue}>{selectedProductForEdit.stock || 0}</Text>
                        <Text style={styles.stockTileUnit}> {selectedProductForEdit.unit || 'units'}</Text>
                      </View>
                      <Text style={styles.priceTileLabel}>Stock</Text>
                    </TouchableOpacity>
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
                </View>
              </View>

              {/* Metafields Tab */}
              <View style={{ margin: -16, padding: 0 }}>
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile, { borderTopWidth: 0 }]}
                    onPress={() => openMetafieldsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Metafields</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = getSelectedMetafieldIdsFromKeyValue(selectedProductForEdit.metafields || '{}');
                        if (selectedIds.length === 0) {
                          return 'Select metafields';
                        } else {
                          return selectedIds.length.toString();
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = getSelectedMetafieldIdsFromKeyValue(selectedProductForEdit.metafields || '{}');
                    if (selectedIds.length > 0) {
                      const selectedMetafields = availableMetafields.filter(metafield => selectedIds.includes(metafield.id));
                      return selectedMetafields.map((metafield) => (
                        <TouchableOpacity
                          key={metafield.id}
                          style={[styles.tile, styles.orgTileSingle]}
                          onPress={() => openMetafieldValueDrawer(metafield, selectedProductForEdit, true)}
                        >
                          <Text style={styles.orgTileLabel}>{metafield.title}</Text>
                          <Text style={styles.orgTileValue}>{getMetafieldDisplayValue(metafield, selectedProductForEdit)}</Text>
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

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openCollectionsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Collection</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.collection || 'Select collection'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openVendorsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Vendor</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.vendor || 'Select vendor'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openBrandsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Brand</Text>
                    <Text style={styles.orgTileValue}>{selectedProductForEdit.brand || 'Select brand'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle]}
                    onPress={() => openTagsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Tags</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.tags || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select tags';
                        } else {
                          return `${selectedIds.length} tag${selectedIds.length !== 1 ? 's' : ''} selected`;
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.tags || '[]');
                    if (selectedIds.length > 0) {
                      const selectedTags = availableTags.filter(tag => selectedIds.includes(tag.id));
                      return selectedTags.map((tag) => (
                        <TouchableOpacity
                          key={tag.id}
                          style={[styles.tile, styles.orgTileSingle]}
                          onPress={() => openTagsDrawer(selectedProductForEdit, true)}
                        >
                          <Text style={styles.orgTileLabel}>{tag.name}</Text>
                          <Text style={styles.orgTileValue}>{tag.notes || 'No description'}</Text>
                        </TouchableOpacity>
                      ));
                    }
                    return null;
                  })()}

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
                    style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile, { borderTopWidth: 0 }]}
                    onPress={() => openOptionsDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Options</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.options || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select options';
                        } else {
                          return selectedIds.length.toString();
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.options || '[]');
                    if (selectedIds.length > 0) {
                      const selectedOptions = availableOptions.filter(option => selectedIds.includes(option.id));
                      return selectedOptions.map((option) => (
                        <View
                          key={option.id}
                          style={[styles.tile, styles.orgTileSingle, styles.optionTileWithThumbnail]}
                        >
                          {renderIdentifierThumbnail(option.identifier || '')}
                          <View style={styles.optionTileContent}>
                            <Text style={styles.orgTileLabel}>{option.title}</Text>
                            <Text style={styles.orgTileValue}>{option.value || 'Not set'}</Text>
                          </View>
                        </View>
                      ));
                    }
                    return null;
                  })()}

                  <TouchableOpacity
                    style={[styles.tile, styles.orgTileSingle, styles.optionsModifiersTile]}
                    onPress={() => openModifiersDrawer(selectedProductForEdit, true)}
                  >
                    <Text style={styles.orgTileLabel}>Modifiers</Text>
                    <Text style={styles.orgTileValue}>
                      {(() => {
                        const selectedIds = parseSelectedIds(selectedProductForEdit.modifiers || '[]');
                        if (selectedIds.length === 0) {
                          return 'Select modifiers';
                        } else {
                          return selectedIds.length.toString();
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {(() => {
                    const selectedIds = parseSelectedIds(selectedProductForEdit.modifiers || '[]');
                    if (selectedIds.length > 0) {
                      const selectedModifiers = availableModifiers.filter(modifier => selectedIds.includes(modifier.id));
                      return selectedModifiers.map((modifier) => (
                        <View
                          key={modifier.id}
                          style={[styles.tile, styles.orgTileSingle]}
                        >
                          <Text style={styles.orgTileLabel}>{modifier.title}</Text>
                          <Text style={styles.orgTileValue}>{modifier.value ? `$${modifier.value.toFixed(2)}` : 'Not set'}</Text>
                        </View>
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
                    {/* Generate Variants Button */}
                    <TouchableOpacity
                      style={styles.generateVariantsButton}
                      onPress={openInventoryGenerationModal}
                    >
                      <Ionicons name="layers-outline" size={20} color="#0066CC" />
                      <Text style={styles.generateVariantsText}>Generate Variants from Options</Text>
                    </TouchableOpacity>

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

      {/* Edit Inventory Item Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editInventoryModalVisible && selectedInventoryItem !== null}
        onRequestClose={() => setEditInventoryModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              {selectedInventoryItem?.sku || 'Edit Inventory Item'}
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={updateInventoryItem}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>S</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedInventoryItem && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              {/* Image and Path Row */}
              <View style={styles.categoryTilesContainer}>
                <View style={styles.imageTile}>
                  <SingleImageUploader
                    imageUrl={selectedInventoryItem.image || '[]'}
                    onImageChange={handleInventoryImageChange}
                  />
                </View>

                <View style={[styles.imageTile, { justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 }]}>
                  <View style={{ width: '100%' }}>
                    <Text style={styles.priceTileLabel}>Barcode</Text>
                    <TextInput
                      style={[styles.tileInput, { fontSize: 14, fontWeight: '500', color: '#333', marginTop: 4, width: '100%' }]}
                      value={selectedInventoryItem.barcode}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, barcode: text})}
                      placeholder="Enter barcode"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={{ width: '100%' }}>
                    <Text style={styles.priceTileLabel}>Path</Text>
                    <TextInput
                      style={[styles.tileInput, { fontSize: 14, fontWeight: '500', color: '#333', marginTop: 4, width: '100%' }]}
                      value={selectedInventoryItem.path}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, path: text})}
                      placeholder="Enter path"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              {/* Second Row - 3 Tiles */}
              <View style={styles.tilesContainer}>
                <View style={styles.tilesRow}>
                  <View style={[styles.tile, styles.tileLeft, activeInventoryTab === 'metafields' && { backgroundColor: '#f0f8ff' }]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 16 }}
                      onPress={() => {
                        if (activeInventoryTab === 'metafields') {
                          setMetafieldsDrawerVisible(true);
                        } else {
                          setActiveInventoryTab('metafields');
                        }
                      }}
                    >
                      <Text style={styles.priceTileValue}>M</Text>
                      <Text style={[styles.priceTileLabel, { fontSize: 10 }]}>Metafields</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.tile, styles.tileMiddle, activeInventoryTab === 'pricing' && { backgroundColor: '#f0f8ff' }]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 16 }}
                      onPress={() => setActiveInventoryTab(activeInventoryTab === 'pricing' ? null : 'pricing')}
                    >
                      <Text style={styles.priceTileValue}>${selectedInventoryItem.price?.toFixed(2) || '0.00'}</Text>
                      <Text style={styles.priceTileLabel}>Price</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.tile, styles.tileRight, activeInventoryTab === 'stock' && { backgroundColor: '#f0f8ff' }]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 16 }}
                      onPress={() => setActiveInventoryTab(activeInventoryTab === 'stock' ? null : 'stock')}
                    >
                      <Text style={styles.stockTileValue}>{selectedInventoryItem.onhand || 0}</Text>
                      <Text style={styles.priceTileLabel}>On Hand</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Metafields Section - Tab Content */}
              {activeInventoryTab === 'metafields' && (
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  {/* Selected Metafields Display */}
                  {selectedMetafieldIds.length > 0 ? (
                    <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0, paddingHorizontal: 16, paddingVertical: 12 }]}>
                      <Text style={[styles.orgTileLabel, { marginBottom: 8 }]}>Selected Metafields</Text>
                      {selectedMetafieldIds.map((metafieldId) => {
                        const metafield = availableMetafields.find(m => m.id === metafieldId);
                        return metafield ? (
                          <View key={metafieldId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                            <Text style={{ fontSize: 14, color: '#333' }}>{metafield.title}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const updatedIds = selectedMetafieldIds.filter(id => id !== metafieldId);
                                setSelectedMetafieldIds(updatedIds);
                                if (selectedInventoryItem) {
                                  setSelectedInventoryItem({
                                    ...selectedInventoryItem,
                                    metafields: JSON.stringify(updatedIds)
                                  });
                                }
                              }}
                            >
                              <MaterialIcons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                          </View>
                        ) : null;
                      })}
                    </View>
                  ) : (
                    <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 14, color: '#999' }}>No metafields selected</Text>
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Tap the Metafields tile to add</Text>
                    </View>
                  )}
                </View>
              )}



              {/* Pricing Section - Tab Content */}
              {activeInventoryTab === 'pricing' && (
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}>
                    <Text style={styles.orgTileLabel}>Reorder Level</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.reorderlevel?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, reorderlevel: parseInt(text) || 0})}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Cost</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.cost?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, cost: parseFloat(text) || 0})}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Price</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.price?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, price: parseFloat(text) || 0})}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Sale Price</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.saleprice?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, saleprice: parseFloat(text) || 0})}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Margin</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.margin?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, margin: parseFloat(text) || 0})}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Stock Section - Tab Content */}
              {activeInventoryTab === 'stock' && (
                <View style={[styles.orgTilesContainer, { marginTop: 0, marginBottom: 0, paddingTop: 0, marginHorizontal: 0, borderTopWidth: 0 }]}>
                  <View style={[styles.tile, styles.orgTileSingle, { borderTopWidth: 0 }]}>
                    <Text style={styles.orgTileLabel}>Available</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.available?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, available: parseInt(text) || 0})}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Committed</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.committed?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, committed: parseInt(text) || 0})}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>Unavailable</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.unavailable?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, unavailable: parseInt(text) || 0})}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.tile, styles.orgTileSingle]}>
                    <Text style={styles.orgTileLabel}>On Hand</Text>
                    <TextInput
                      style={styles.tileInput}
                      value={selectedInventoryItem.onhand?.toString()}
                      onChangeText={(text) => setSelectedInventoryItem({...selectedInventoryItem, onhand: parseInt(text) || 0})}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}


            </ScrollView>
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
          <View style={styles.optionsModalHeader}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setCreateOptionModalVisible(true);
                // Reset all option form values for new option
                setNewOptionTitle('');
                setNewOptionValue('');
                setSelectedOptionTitleType('');
                setCustomOptionTitle('');
                setSelectedIdentifierType(null);
                setIdentifierColorValue('#000000');
                setIdentifierImageValue('');
                setIdentifierTextValue('');
              }}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
            <Text style={styles.optionsModalTitle}>Select Options</Text>
            <View style={styles.optionsHeaderActions}>
              <Text style={styles.optionsSelectionCount}>
                {selectedOptionIds.length}
              </Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleOptionsSelection}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={availableOptions
              .filter(option => option.parentid === null)
              .sort((a, b) => {
                const aSelected = selectedOptionIds.includes(a.id);
                const bSelected = selectedOptionIds.includes(b.id);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return 0;
              })
            }
            renderItem={({ item }) => {
              const children = availableOptions
                .filter(child => child.parentid === item.id)
                .sort((a, b) => {
                  const aSelected = selectedOptionIds.includes(a.id);
                  const bSelected = selectedOptionIds.includes(b.id);
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  return 0;
                });
              return (
                <View style={styles.optionGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      styles.optionItemWithThumbnail,
                      selectedOptionIds.includes(item.id) && styles.selectedOptionItem
                    ]}
                    onPress={() => toggleOptionSelection(item.id)}
                  >
                    {renderIdentifierThumbnail(item.identifier || '')}
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>{item.title}</Text>
                      <Text style={styles.optionValue}>{item.value}</Text>
                    </View>
                  </TouchableOpacity>

                  {children.map(child => {
                    const grandChildren = availableOptions
                      .filter(gc => gc.parentid === child.id)
                      .sort((a, b) => {
                        const aSelected = selectedOptionIds.includes(a.id);
                        const bSelected = selectedOptionIds.includes(b.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return 0;
                      });
                    return (
                      <View key={child.id}>
                        <TouchableOpacity
                          style={[
                            styles.childOptionItem,
                            styles.optionItemWithThumbnail,
                            selectedOptionIds.includes(child.id) && styles.selectedOptionItem
                          ]}
                          onPress={() => toggleOptionSelection(child.id)}
                        >
                          {renderIdentifierThumbnail(child.identifier || '')}
                          <View style={styles.optionContent}>
                            <Text style={styles.childOptionTitle}>{child.title}</Text>
                            <Text style={styles.childOptionValue}>{child.value}</Text>
                          </View>
                        </TouchableOpacity>

                        {grandChildren.map(grandChild => (
                          <TouchableOpacity
                            key={grandChild.id}
                            style={[
                              styles.grandChildOptionItem,
                              styles.optionItemWithThumbnail,
                              selectedOptionIds.includes(grandChild.id) && styles.selectedOptionItem
                            ]}
                            onPress={() => toggleOptionSelection(grandChild.id)}
                          >
                            {renderIdentifierThumbnail(grandChild.identifier || '')}
                            <View style={styles.optionContent}>
                              <Text style={styles.grandChildOptionTitle}>{grandChild.title}</Text>
                              <Text style={styles.grandChildOptionValue}>{grandChild.value}</Text>
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
          <View style={styles.optionsModalHeader}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setCreateMetafieldModalVisible(true);
                // Reset all metafield form values for new metafield
                setNewMetafieldTitle('');
                setNewMetafieldValue('');
                setNewMetafieldGroup('Products');
                setNewMetafieldType('Single line text');
                setNewMetafieldFilter(0);
                setSelectedMetafieldTitleType('');
                setCustomMetafieldTitle('');
                // Reset value configuration states
                setMetafieldDefaultValue('');
                setMetafieldMinValue('');
                setMetafieldMaxValue('');
                setMetafieldUnit('');
                setMetafieldValidationPattern('');
              }}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
            <Text style={styles.optionsModalTitle}>Select Metafields</Text>
            <View style={styles.optionsHeaderActions}>
              <Text style={styles.optionsSelectionCount}>
                {selectedMetafieldIds.length}
              </Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleMetafieldsSelection}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={availableMetafields.sort((a, b) => {
              const aSelected = selectedMetafieldIds.includes(a.id);
              const bSelected = selectedMetafieldIds.includes(b.id);
              if (aSelected && !bSelected) return -1;
              if (!aSelected && bSelected) return 1;
              return a.title.localeCompare(b.title);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedMetafieldIds.includes(item.id) && styles.selectedOptionItem
                ]}
                onPress={() => toggleMetafieldSelection(item.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
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
          <View style={styles.optionsModalHeader}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setCreateModifierModalVisible(true);
                // Reset all modifier form values for new modifier
                setNewModifierTitle('');
                setNewModifierNotes('');
                setNewModifierType('percentage');
                setNewModifierValue(0);
                setNewModifierValueSign('+');
                setSelectedModifierTitleType('');
                setCustomModifierTitle('');
                setSelectedModifierIdentifierType(null);
                setModifierIdentifierColorValue('#000000');
                setModifierIdentifierImageValue('[]');
                setModifierIdentifierTextValue('');
              }}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
            <Text style={styles.optionsModalTitle}>Select Modifiers</Text>
            <View style={styles.optionsHeaderActions}>
              <Text style={styles.optionsSelectionCount}>
                {selectedModifierIds.length}
              </Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleModifiersSelection}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={availableModifiers.sort((a, b) => {
              const aSelected = selectedModifierIds.includes(a.id);
              const bSelected = selectedModifierIds.includes(b.id);
              if (aSelected && !bSelected) return -1;
              if (!aSelected && bSelected) return 1;
              return a.title.localeCompare(b.title);
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  styles.optionItemWithThumbnail,
                  selectedModifierIds.includes(item.id) && styles.selectedOptionItem
                ]}
                onPress={() => toggleModifierSelection(item.id)}
              >
                {renderIdentifierThumbnail(item.identifier || '')}
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionValue}>
                    {item.type && `${item.type}`}
                    {item.value && ` • $${item.value.toFixed(2)}`}
                  </Text>
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

      {/* Collections Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={collectionsDrawerVisible}
        onRequestClose={() => setCollectionsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Collection</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setCreateCollectionModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableCollections.filter(col => col.parent === null)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => selectCollection(item.id)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{item.name}</Text>
                  {item.notes && (
                    <Text style={styles.categoryNotes}>{item.notes}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No collections available</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Vendors Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={vendorsDrawerVisible}
        onRequestClose={() => setVendorsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Vendor</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setCreateVendorModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableVendors}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => selectVendor(item.id)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{item.name}</Text>
                  {item.notes && (
                    <Text style={styles.categoryNotes}>{item.notes}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No vendors available</Text>
              </View>
            )}
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
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tabContentNoPadding} showsVerticalScrollIndicator={false}>
            {/* Option Title */}
            <View style={styles.createOptionSection}>
              <TouchableOpacity
                style={styles.createOptionTile}
                onPress={() => setOptionTitleDrawerVisible(true)}
              >
                <Text style={styles.createOptionLabel}>title</Text>
                <Text style={styles.createOptionValue}>
                  {getOptionTitleDisplayValue()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Option Value */}
            <View style={styles.createOptionSection}>
              <View style={styles.createOptionTileNoBorder}>
                <Text style={styles.createOptionLabel}>Value</Text>
                <TextInput
                  style={styles.createOptionInput}
                  value={newOptionValue}
                  onChangeText={setNewOptionValue}
                  placeholder="Enter value"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Identifier Tiles */}
            <View style={styles.identifierTilesContainer}>
              <View style={styles.identifierTilesRow}>
                {/* Color Tile */}
                <TouchableOpacity
                  style={[
                    styles.identifierTile,
                    selectedIdentifierType === 'color' && styles.selectedIdentifierTile,
                    selectedIdentifierType === 'color' && { backgroundColor: identifierColorValue }
                  ]}
                  onPress={() => handleIdentifierTypeSelection('color')}
                >
                  <Text style={[
                    styles.identifierTileLabel,
                    selectedIdentifierType === 'color' && { color: '#ffffff' }
                  ]}>Color</Text>
                </TouchableOpacity>

                {/* Image Tile */}
                <View
                  style={[
                    styles.identifierTile,
                    selectedIdentifierType === 'image' && styles.selectedIdentifierTile
                  ]}
                >
                  <SingleImageUploader
                    imageUrl={identifierImageValue}
                    onImageChange={(imageUrl) => {
                      handleIdentifierTypeSelection('image');
                      handleIdentifierImageChange(imageUrl);
                    }}
                    style={styles.fullTileImageUploader}
                    showFullImage={true}
                    hideText={true}
                    onImageTap={() => setImageClearDrawerVisible(true)}
                  />
                </View>

                {/* Text Tile */}
                <View
                  style={[
                    styles.identifierTile,
                    styles.identifierTileRight,
                    selectedIdentifierType === 'text' && styles.selectedIdentifierTile
                  ]}
                >
                  <TextInput
                    style={styles.textTileInput}
                    value={identifierTextValue}
                    onChangeText={(text) => {
                      handleIdentifierTypeSelection('text');
                      setIdentifierTextValue(text.toUpperCase());
                    }}
                    placeholder="TEXT"
                    placeholderTextColor="#999"
                    textAlign="center"
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Image Clear Bottom Drawer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={imageClearDrawerVisible}
        onRequestClose={() => setImageClearDrawerVisible(false)}
      >
        <View style={styles.bottomDrawerOverlay}>
          <TouchableOpacity
            style={styles.bottomDrawerBackdrop}
            onPress={() => setImageClearDrawerVisible(false)}
          />
          <View style={styles.bottomDrawerContainer}>
            <View style={styles.bottomDrawerHeader}>
              <Text style={styles.bottomDrawerTitle}>Image Options</Text>
            </View>

            <TouchableOpacity
              style={styles.bottomDrawerOption}
              onPress={() => {
                setIdentifierImageValue('');
                setImageClearDrawerVisible(false);
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.bottomDrawerOptionText, { color: '#FF3B30' }]}>Clear Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomDrawerOption}
              onPress={() => setImageClearDrawerVisible(false)}
            >
              <Ionicons name="close-outline" size={24} color="#666" />
              <Text style={styles.bottomDrawerOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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

          <ScrollView style={styles.tabContentNoPadding} showsVerticalScrollIndicator={false}>
            {/* Metafield Title */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                style={styles.createOptionTile}
                onPress={() => setMetafieldTitleDrawerVisible(true)}
              >
                <Text style={styles.createOptionLabel}>title</Text>
                <Text style={styles.createOptionValue}>
                  {getMetafieldTitleDisplayValue()}
                </Text>
              </TouchableOpacity>
            </View>



            {/* Group */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                style={styles.createOptionTile}
                onPress={() => setMetafieldGroupDrawerVisible(true)}
              >
                <Text style={styles.createOptionLabel}>Group</Text>
                <Text style={styles.createOptionValue}>
                  {newMetafieldGroup}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filter Toggle */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <View style={styles.tilesRow}>
                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileLeft,
                    { borderTopWidth: 0 },
                    newMetafieldFilter === 1 && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewMetafieldFilter(1)}
                >
                  <Text style={styles.statusTileLabel}>Filterable</Text>
                  <Text style={styles.statusTileValue}>
                    {newMetafieldFilter === 1 ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileRight,
                    { borderTopWidth: 0 },
                    newMetafieldFilter === 0 && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewMetafieldFilter(0)}
                >
                  <Text style={styles.statusTileLabel}>Not Filterable</Text>
                  <Text style={styles.statusTileValue}>
                    {newMetafieldFilter === 0 ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Value Type */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                style={styles.createOptionTile}
                onPress={() => setMetafieldValueTypeDrawerVisible(true)}
              >
                <Text style={styles.createOptionLabel}>Value Type</Text>
                <Text style={styles.createOptionValue}>
                  {newMetafieldType}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider before Value Configuration section */}
            <View style={styles.tilesDivider} />

            {/* Value Configuration Fields */}
            {getValueTypeConfigFields().includes('defaultValue') && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Default Value</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={metafieldDefaultValue}
                    onChangeText={setMetafieldDefaultValue}
                    placeholder={`Default ${newMetafieldType.toLowerCase()}`}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}

            {getValueTypeConfigFields().includes('minValue') && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Minimum Value</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={metafieldMinValue}
                    onChangeText={setMetafieldMinValue}
                    placeholder="Minimum value"
                    placeholderTextColor="#999"
                    keyboardType={newMetafieldType.includes('Number') ? 'numeric' : 'default'}
                  />
                </View>
              </View>
            )}

            {getValueTypeConfigFields().includes('maxValue') && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Maximum Value</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={metafieldMaxValue}
                    onChangeText={setMetafieldMaxValue}
                    placeholder="Maximum value"
                    placeholderTextColor="#999"
                    keyboardType={newMetafieldType.includes('Number') ? 'numeric' : 'default'}
                  />
                </View>
              </View>
            )}

            {getValueTypeConfigFields().includes('unit') && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Unit</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={metafieldUnit}
                    onChangeText={setMetafieldUnit}
                    placeholder="kg, cm, lbs, etc."
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}

            {getValueTypeConfigFields().includes('validationPattern') && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Validation Pattern</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={metafieldValidationPattern}
                    onChangeText={setMetafieldValidationPattern}
                    placeholder="Regex pattern (optional)"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}
          </ScrollView>
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

          <ScrollView style={styles.tabContentNoPadding} showsVerticalScrollIndicator={false}>
            {/* Modifier Title */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                style={styles.createOptionTile}
                onPress={() => setModifierTitleDrawerVisible(true)}
              >
                <Text style={styles.createOptionLabel}>title</Text>
                <Text style={styles.createOptionValue}>
                  {getModifierTitleDisplayValue()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Title Input (if Custom is selected) */}
            {shouldShowCustomModifierTitleTile() && (
              <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
                <View style={styles.createOptionTileNoBorder}>
                  <Text style={styles.createOptionLabel}>Custom Title</Text>
                  <TextInput
                    style={styles.createOptionInput}
                    value={customModifierTitle}
                    onChangeText={setCustomModifierTitle}
                    placeholder="Enter custom title"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}

            {/* Modifier Type */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <View style={styles.tilesRow}>
                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileLeft,
                    { borderTopWidth: 0 },
                    newModifierType === 'percentage' && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewModifierType('percentage')}
                >
                  <Text style={styles.statusTileLabel}>Percentage</Text>
                  <Text style={styles.statusTileValue}>
                    {newModifierType === 'percentage' ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileRight,
                    { borderTopWidth: 0 },
                    newModifierType === 'fixed' && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewModifierType('fixed')}
                >
                  <Text style={styles.statusTileLabel}>Fixed</Text>
                  <Text style={styles.statusTileValue}>
                    {newModifierType === 'fixed' ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider before Value section */}
            <View style={styles.tilesDivider} />

            {/* Modifier Value Sign */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <View style={styles.tilesRow}>
                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileLeft,
                    { borderTopWidth: 0 },
                    newModifierValueSign === '+' && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewModifierValueSign('+')}
                >
                  <Text style={styles.statusTileLabel}>Plus (+)</Text>
                  <Text style={styles.statusTileValue}>
                    {newModifierValueSign === '+' ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tile,
                    styles.statusTileRight,
                    { borderTopWidth: 0 },
                    newModifierValueSign === '-' && { backgroundColor: '#E3F2FD' }
                  ]}
                  onPress={() => setNewModifierValueSign('-')}
                >
                  <Text style={styles.statusTileLabel}>Minus (-)</Text>
                  <Text style={styles.statusTileValue}>
                    {newModifierValueSign === '-' ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider before Value input */}
            <View style={styles.tilesDivider} />

            {/* Modifier Value */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <View style={styles.createOptionTileNoBorder}>
                <Text style={styles.createOptionLabel}>Value</Text>
                <TextInput
                  style={styles.createOptionInput}
                  value={newModifierValue.toString()}
                  onChangeText={(text) => setNewModifierValue(parseFloat(text) || 0)}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Divider after Value section */}
            <View style={styles.tilesDivider} />

            {/* Identifier Tiles */}
            <View style={styles.identifierTilesContainer}>
              <View style={styles.identifierTilesRow}>
                {/* Color Tile */}
                <TouchableOpacity
                  style={[
                    styles.identifierTile,
                    selectedModifierIdentifierType === 'color' && styles.selectedIdentifierTile,
                    selectedModifierIdentifierType === 'color' && { backgroundColor: modifierIdentifierColorValue }
                  ]}
                  onPress={() => handleModifierIdentifierTypeSelection('color')}
                >
                  <Text style={[
                    styles.identifierTileLabel,
                    selectedModifierIdentifierType === 'color' && { color: '#ffffff' }
                  ]}>Color</Text>
                </TouchableOpacity>

                {/* Image Tile */}
                <View
                  style={[
                    styles.identifierTile,
                    selectedModifierIdentifierType === 'image' && styles.selectedIdentifierTile
                  ]}
                >
                  <SingleImageUploader
                    imageUrl={modifierIdentifierImageValue}
                    onImageChange={(imageUrl) => {
                      handleModifierIdentifierTypeSelection('image');
                      handleModifierIdentifierImageChange(imageUrl);
                    }}
                    style={styles.fullTileImageUploader}
                    showFullImage={true}
                    hideText={true}
                    onImageTap={() => setModifierImageClearDrawerVisible(true)}
                  />
                </View>

                {/* Text Tile */}
                <View
                  style={[
                    styles.identifierTile,
                    styles.identifierTileRight,
                    selectedModifierIdentifierType === 'text' && styles.selectedIdentifierTile
                  ]}
                >
                  <TextInput
                    style={styles.textTileInput}
                    value={modifierIdentifierTextValue}
                    onChangeText={(text) => {
                      handleModifierIdentifierTypeSelection('text');
                      setModifierIdentifierTextValue(text.toUpperCase());
                    }}
                    placeholder="TEXT"
                    placeholderTextColor="#999"
                    textAlign="center"
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            {/* Divider before Notes section */}
            <View style={styles.tilesDivider} />

            {/* Notes */}
            <View style={[styles.createOptionSection, { borderBottomWidth: 0 }]}>
              <View style={styles.createOptionTileNoBorder}>
                <TextInput
                  style={[styles.createOptionInput, styles.textArea, { textAlign: 'left' }]}
                  value={newModifierNotes}
                  onChangeText={setNewModifierNotes}
                  placeholder="Modifier notes"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </ScrollView>
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

      {/* Brands Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={brandsDrawerVisible}
        onRequestClose={() => setBrandsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Brand</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setCreateBrandModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableBrands}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => selectBrand(item.id)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{item.name}</Text>
                  {item.notes && (
                    <Text style={styles.categoryNotes}>{item.notes}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No brands available</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Tags Multi-Select Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={tagsDrawerVisible}
        onRequestClose={() => setTagsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Tags</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setCreateTagModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#0066CC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleTagsSelection}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>

          <FlatList
            data={availableTags}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedTagIds.includes(item.id) && styles.selectedOptionItem
                ]}
                onPress={() => toggleTagSelection(item.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.name}</Text>
                  {item.notes && (
                    <Text style={styles.optionValue}>{item.notes}</Text>
                  )}
                </View>
                <View style={styles.checkbox}>
                  {selectedTagIds.includes(item.id) && (
                    <Ionicons name="checkmark" size={16} color="#0066CC" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tags available</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Create New Collection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createCollectionModalVisible}
        onRequestClose={() => setCreateCollectionModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Collection</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewCollection}
              disabled={isCreatingCollection}
            >
              {isCreatingCollection ? (
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
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Collection Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.categoryTilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newCollectionImage || '[]'}
                  onImageChange={(imageUrl) => setNewCollectionImage(imageUrl)}
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
                      onPress={() => {
                        setSelectedParentCollection(null);
                        setNewCollectionParent(null);
                      }}
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
                value={newCollectionNotes}
                onChangeText={setNewCollectionNotes}
                placeholder="Add notes about this collection..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create New Vendor Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createVendorModalVisible}
        onRequestClose={() => setCreateVendorModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Vendor</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewVendor}
              disabled={isCreatingVendor}
            >
              {isCreatingVendor ? (
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
                value={newVendorName}
                onChangeText={setNewVendorName}
                placeholder="Vendor Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.categoryTilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newVendorImage || '[]'}
                  onImageChange={(imageUrl) => setNewVendorImage(imageUrl)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newVendorNotes}
                onChangeText={setNewVendorNotes}
                placeholder="Add notes about this vendor..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create New Brand Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createBrandModalVisible}
        onRequestClose={() => setCreateBrandModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Brand</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewBrand}
              disabled={isCreatingBrand}
            >
              {isCreatingBrand ? (
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
                value={newBrandName}
                onChangeText={setNewBrandName}
                placeholder="Brand Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.categoryTilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newBrandImage || '[]'}
                  onImageChange={(imageUrl) => setNewBrandImage(imageUrl)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newBrandNotes}
                onChangeText={setNewBrandNotes}
                placeholder="Add notes about this brand..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create New Tag Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={createTagModalVisible}
        onRequestClose={() => setCreateTagModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Create New Tag</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={createNewTag}
              disabled={isCreatingTag}
            >
              {isCreatingTag ? (
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
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Tag Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.categoryTilesContainer}>
              <View style={styles.imageTile}>
                <SingleImageUploader
                  imageUrl={newTagImage || '[]'}
                  onImageChange={(imageUrl) => setNewTagImage(imageUrl)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.notesInput}
                value={newTagNotes}
                onChangeText={setNewTagNotes}
                placeholder="Add notes about this tag..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
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
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.parentModalContainer}>
          <View style={styles.parentModalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.parentModalTitle}>Parent Collection</Text>
          </View>

          <FlatList
            data={availableCollections.filter(col => col.parent === null)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.parentCategoryItem}
                onPress={() => {
                  setSelectedParentCollection(item);
                  setNewCollectionParent(item.id);
                  setParentCollectionModalVisible(false);
                }}
              >
                <Text style={styles.parentCategoryText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.parentCategoryDivider} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No collections available as parents</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Units Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={unitsDrawerVisible}
        onRequestClose={() => setUnitsDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Unit</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setUnitsDrawerVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={standardUnits}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.unitItem}
                onPress={() => selectUnit(item)}
              >
                <Text style={styles.unitText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Inventory Generation Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={generateInventoryModalVisible}
        onRequestClose={() => setGenerateInventoryModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setGenerateInventoryModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Generate Inventory Variants</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={generateInventoryItems}
              disabled={isGeneratingInventory}
            >
              {isGeneratingInventory ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Generate</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Settings Section */}
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>SKU Pattern</Text>
              <TextInput
                style={styles.input}
                value={inventoryGenerationSettings.skuPattern}
                onChangeText={(text) => setInventoryGenerationSettings({...inventoryGenerationSettings, skuPattern: text})}
                placeholder="e.g., {product}-{option1}-{option2}"
              />
              <Text style={styles.helperText}>Use {'{product}'}, {'{option1}'}, {'{option2}'}, {'{option3}'} as placeholders</Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Default Cost ($)</Text>
              <TextInput
                style={styles.input}
                value={inventoryGenerationSettings.defaultCost.toString()}
                onChangeText={(text) => setInventoryGenerationSettings({...inventoryGenerationSettings, defaultCost: parseFloat(text) || 0})}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Default Price ($)</Text>
              <TextInput
                style={styles.input}
                value={inventoryGenerationSettings.defaultPrice.toString()}
                onChangeText={(text) => setInventoryGenerationSettings({...inventoryGenerationSettings, defaultPrice: parseFloat(text) || 0})}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Default Stock Quantity</Text>
              <TextInput
                style={styles.input}
                value={inventoryGenerationSettings.defaultStock.toString()}
                onChangeText={(text) => setInventoryGenerationSettings({...inventoryGenerationSettings, defaultStock: parseInt(text) || 0})}
                placeholder="10"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Default Sale Price ($)</Text>
              <TextInput
                style={styles.input}
                value={inventoryGenerationSettings.defaultSalePrice.toString()}
                onChangeText={(text) => setInventoryGenerationSettings({...inventoryGenerationSettings, defaultSalePrice: parseFloat(text) || 0})}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            {/* Preview Section */}
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview ({inventoryGenerationPreview.length} variants will be generated)</Text>
              {inventoryGenerationPreview.slice(0, 5).map((combination, index) => {
                const previewSku = generateSKU(selectedProductForEdit?.title || '', combination, inventoryGenerationSettings.skuPattern);
                return (
                  <View key={index} style={styles.previewItem}>
                    <Text style={styles.previewSku}>{previewSku}</Text>
                    <Text style={styles.previewOptions}>
                      {[combination.option1, combination.option2, combination.option3].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                );
              })}
              {inventoryGenerationPreview.length > 5 && (
                <Text style={styles.previewMore}>... and {inventoryGenerationPreview.length - 5} more variants</Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Option Title Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={optionTitleDrawerVisible}
        onRequestClose={() => setOptionTitleDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Option Type</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            data={optionTitleTypes}
            renderItem={({ item }) => {
              if (item === 'Custom') {
                return (
                  <View style={[styles.categoryItem, { backgroundColor: '#E3F2FD' }]}>
                    <TextInput
                      style={styles.customTitleInput}
                      value={customOptionTitle}
                      onChangeText={setCustomOptionTitle}
                      placeholder="Enter custom option title"
                      placeholderTextColor="#999"
                      autoFocus={false}
                    />
                    <TouchableOpacity
                      style={styles.customCheckButton}
                      onPress={() => handleOptionTitleTypeSelection('Custom')}
                    >
                      <Ionicons name="checkmark" size={16} color="#0066CC" />
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => handleOptionTitleTypeSelection(item)}
                >
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryTitle}>{item}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Color Picker Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={colorPickerDrawerVisible}
        onRequestClose={() => setColorPickerDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Color</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setColorPickerDrawerVisible(false)}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorPreviewLarge}>
                <View style={[styles.colorPreviewCircle, { backgroundColor: identifierColorValue }]} />
                <Text style={styles.colorValueText}>{identifierColorValue}</Text>
              </View>

              <View style={styles.colorInputSection}>
                <Text style={styles.inputLabel}>Hex Color</Text>
                <TextInput
                  style={styles.colorHexInput}
                  value={identifierColorValue}
                  onChangeText={setIdentifierColorValue}
                  placeholder="#000000"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.colorPresetsSection}>
                <Text style={styles.inputLabel}>Color Presets</Text>
                <View style={styles.colorPresetsGrid}>
                  {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorPresetItem, { backgroundColor: color }]}
                      onPress={() => setIdentifierColorValue(color)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modifier Title Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modifierTitleDrawerVisible}
        onRequestClose={() => setModifierTitleDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Modifier Type</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            data={modifierTitleTypes}
            renderItem={({ item }) => {
              if (item === 'Custom') {
                return (
                  <View style={[styles.categoryItem, { backgroundColor: '#E3F2FD' }]}>
                    <TextInput
                      style={styles.customTitleInput}
                      value={customModifierTitle}
                      onChangeText={setCustomModifierTitle}
                      placeholder="Enter custom modifier title"
                      placeholderTextColor="#999"
                      autoFocus={false}
                    />
                    <TouchableOpacity
                      style={styles.customCheckButton}
                      onPress={() => handleModifierTitleTypeSelection('Custom')}
                    >
                      <Ionicons name="checkmark" size={16} color="#0066CC" />
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => handleModifierTitleTypeSelection(item)}
                >
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryTitle}>{item}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Metafield Title Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={metafieldTitleDrawerVisible}
        onRequestClose={() => setMetafieldTitleDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Metafield Type</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            data={metafieldTitleTypes}
            renderItem={({ item }) => {
              if (item === 'Custom') {
                return (
                  <View style={[styles.categoryItem, { backgroundColor: '#E3F2FD' }]}>
                    <TextInput
                      style={styles.customTitleInput}
                      value={customMetafieldTitle}
                      onChangeText={setCustomMetafieldTitle}
                      placeholder="Enter custom metafield title"
                      placeholderTextColor="#999"
                      autoFocus={false}
                    />
                    <TouchableOpacity
                      style={styles.customCheckButton}
                      onPress={() => handleMetafieldTitleTypeSelection('Custom')}
                    >
                      <Ionicons name="checkmark" size={16} color="#0066CC" />
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => handleMetafieldTitleTypeSelection(item)}
                >
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryTitle}>{item}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Metafield Group Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={metafieldGroupDrawerVisible}
        onRequestClose={() => setMetafieldGroupDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Group</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            data={metafieldGroups}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  newMetafieldGroup === item && { backgroundColor: '#E3F2FD' }
                ]}
                onPress={() => handleMetafieldGroupSelection(item)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{item}</Text>
                  {newMetafieldGroup === item && (
                    <Ionicons name="checkmark" size={20} color="#0066CC" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Metafield Value Type Selection Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={metafieldValueTypeDrawerVisible}
        onRequestClose={() => setMetafieldValueTypeDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Value Type</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            data={metafieldValueTypes}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  newMetafieldType === item && { backgroundColor: '#E3F2FD' }
                ]}
                onPress={() => handleMetafieldValueTypeSelection(item)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{item}</Text>
                  {newMetafieldType === item && (
                    <Ionicons name="checkmark" size={20} color="#0066CC" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Modifier Color Picker Drawer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modifierColorPickerDrawerVisible}
        onRequestClose={() => setModifierColorPickerDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Select Color</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setModifierColorPickerDrawerVisible(false)}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorPreviewLarge}>
                <View style={[styles.colorPreviewCircle, { backgroundColor: modifierIdentifierColorValue }]} />
                <Text style={styles.colorValueText}>{modifierIdentifierColorValue}</Text>
              </View>

              <View style={styles.colorInputSection}>
                <Text style={styles.inputLabel}>Hex Color</Text>
                <TextInput
                  style={styles.colorHexInput}
                  value={modifierIdentifierColorValue}
                  onChangeText={setModifierIdentifierColorValue}
                  placeholder="#000000"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.colorPresetsSection}>
                <Text style={styles.inputLabel}>Color Presets</Text>
                <View style={styles.colorPresetsGrid}>
                  {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorPresetItem, { backgroundColor: color }]}
                      onPress={() => setModifierIdentifierColorValue(color)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modifier Image Clear Bottom Drawer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modifierImageClearDrawerVisible}
        onRequestClose={() => setModifierImageClearDrawerVisible(false)}
      >
        <View style={styles.bottomDrawerOverlay}>
          <TouchableOpacity
            style={styles.bottomDrawerBackdrop}
            onPress={() => setModifierImageClearDrawerVisible(false)}
          />
          <View style={styles.bottomDrawerContainer}>
            <View style={styles.bottomDrawerHeader}>
              <Text style={styles.bottomDrawerTitle}>Image Options</Text>
            </View>

            <TouchableOpacity
              style={styles.bottomDrawerOption}
              onPress={() => {
                setModifierIdentifierImageValue('[]');
                setModifierImageClearDrawerVisible(false);
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.bottomDrawerOptionText, { color: '#FF3B30' }]}>Clear Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomDrawerOption}
              onPress={() => setModifierImageClearDrawerVisible(false)}
            >
              <Ionicons name="close-outline" size={24} color="#666" />
              <Text style={styles.bottomDrawerOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Metafield Value Drawer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={metafieldValueDrawerVisible}
        onRequestClose={() => setMetafieldValueDrawerVisible(false)}
      >
        <View style={styles.bottomDrawerOverlay}>
          <TouchableOpacity
            style={styles.bottomDrawerBackdrop}
            onPress={() => setMetafieldValueDrawerVisible(false)}
          />
          <View style={styles.bottomDrawerContainer}>
            <View style={styles.bottomDrawerHeader}>
              <Text style={styles.bottomDrawerTitle}>
                {selectedMetafieldForEdit?.title || 'Edit Metafield Value'}
              </Text>
            </View>

            {selectedMetafieldForEdit && (
              <View style={{ padding: 20 }}>
                {selectedMetafieldForEdit.type === 'Boolean' ? (
                  <View>
                    <TouchableOpacity
                      style={styles.bottomDrawerOption}
                      onPress={() => {
                        setCurrentMetafieldValue('true');
                        setMetafieldValueDrawerVisible(false);
                      }}
                    >
                      <Text style={styles.bottomDrawerOptionText}>True</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.bottomDrawerOption}
                      onPress={() => {
                        setCurrentMetafieldValue('false');
                        setMetafieldValueDrawerVisible(false);
                      }}
                    >
                      <Text style={styles.bottomDrawerOptionText}>False</Text>
                    </TouchableOpacity>
                  </View>
                ) : selectedMetafieldForEdit.type === 'Color' ? (
                  <View>
                    <Text style={styles.inputLabel}>Color Value</Text>
                    <TextInput
                      style={styles.colorHexInput}
                      value={currentMetafieldValue}
                      onChangeText={setCurrentMetafieldValue}
                      placeholder="#000000"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                    />
                  </View>
                ) : selectedMetafieldForEdit.type === 'Multi-line text' ? (
                  <View>
                    <Text style={styles.inputLabel}>Value</Text>
                    <TextInput
                      style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                      value={currentMetafieldValue}
                      onChangeText={setCurrentMetafieldValue}
                      placeholder="Enter value..."
                      placeholderTextColor="#999"
                      multiline
                    />
                  </View>
                ) : (
                  <View>
                    <Text style={styles.inputLabel}>Value</Text>
                    <TextInput
                      style={styles.input}
                      value={currentMetafieldValue}
                      onChangeText={setCurrentMetafieldValue}
                      placeholder="Enter value..."
                      placeholderTextColor="#999"
                      keyboardType={
                        selectedMetafieldForEdit.type === 'Number (integer)' ||
                        selectedMetafieldForEdit.type === 'Number (decimal)' ? 'numeric' : 'default'
                      }
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.bottomDrawerOption, { backgroundColor: '#0066CC', marginTop: 20, borderRadius: 8 }]}
                  onPress={() => {
                    // Update the metafield value in the database here
                    setMetafieldValueDrawerVisible(false);
                  }}
                >
                  <Text style={[styles.bottomDrawerOptionText, { color: '#fff', textAlign: 'center' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
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
  tabContentNoPadding: {
    padding: 0,
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
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  inventoryAvailable: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    paddingVertical: 0,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  optionItemWithThumbnail: {
    paddingLeft: 0,
  },
  childOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 16,
    paddingLeft: 0,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  grandChildOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 16,
    paddingLeft: 0,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  selectedOptionItem: {
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  // Options modal specific header styles
  optionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    height: 48,
  },
  optionsModalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'left',
    marginLeft: 16,
    marginRight: 16,
  },
  optionsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionsSelectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
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
  // Square tiles (pricing and second row)
  tileLeft: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    aspectRatio: 1,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  tileMiddle: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    aspectRatio: 1,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  tileRight: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    aspectRatio: 1,
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
  stockTileValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  stockTileUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },
  // QR Code styles
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  qrCodeImage: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  qrCodePlaceholder: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  qrCodeValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  qrPattern: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  qrDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 0.5,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  // Image tile styles
  imageTileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageTile: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Light blue background for main Options and Modifiers tiles
  optionsModifiersTile: {
    backgroundColor: '#f0f8ff',
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
  tileInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    minWidth: 80,
    padding: 0,
    margin: 0,
  },
  checkButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTitleInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginRight: 8,
  },
  customCheckButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Color preview in identifier tile
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Identifier value input styles
  colorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDisplay: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  colorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  imageSelector: {
    alignItems: 'flex-end',
  },
  identifierImagePreview: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  imageUploadText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  // Create New Option Modal Styles
  createOptionSection: {
    marginBottom: 0,
  },
  createOptionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 60,
  },
  createOptionTileNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    minHeight: 60,
  },
  createOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  createOptionValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  createOptionInput: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
    padding: 0,
  },
  createIdentifierRow: {
    flexDirection: 'row',
    gap: 0,
  },
  createIdentifierTile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  createIdentifierLeft: {
    borderRightWidth: 0,
  },
  createIdentifierMiddle: {
    borderRightWidth: 0,
  },
  createIdentifierRight: {
    // No additional border styles needed
  },
  createIdentifierSelected: {
    backgroundColor: '#E3F2FD',
  },
  createIdentifierButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  createIdentifierLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  createColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  createIdentifierValueText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  createImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createTextContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createTextInput: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 4,
    minHeight: 30,
    flex: 1,
    width: '100%',
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
  tilesDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: -16,
    marginVertical: 0,
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
  formNotesInput: {
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
  // Units selection styles
  unitItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  unitText: {
    fontSize: 16,
    color: '#333',
  },
  // Generate variants button styles
  generateVariantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  generateVariantsText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Inventory generation modal styles
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewSku: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  previewOptions: {
    fontSize: 12,
    color: '#666',
  },
  previewMore: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  // Identifier tiles styles
  identifierTilesContainer: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    marginBottom: 0,
    marginTop: 0,
    marginHorizontal: -16,
  },
  identifierTilesRow: {
    flexDirection: 'row',
  },
  identifierTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identifierTileRight: {
    borderRightWidth: 0,
  },
  selectedIdentifierTile: {
    backgroundColor: '#e3f2fd',
  },
  identifierTileLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },

  imageInputContainer: {
    width: 50,
    height: 50,
  },
  fullTileImageUploader: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  textInput: {
    fontSize: 12,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 4,
    padding: 6,
    width: 80,
    textAlign: 'center',
  },
  textTileInput: {
    width: '100%',
    height: '100%',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  // Color picker styles
  colorPickerContainer: {
    padding: 16,
  },
  colorPreviewLarge: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  colorPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  colorValueText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  colorInputSection: {
    marginBottom: 24,
  },
  colorHexInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  colorPresetsSection: {
    marginBottom: 24,
  },
  colorPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPresetItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  // Bottom drawer styles
  bottomDrawerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomDrawerBackdrop: {
    flex: 1,
  },
  bottomDrawerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  bottomDrawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  bottomDrawerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  bottomDrawerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomDrawerOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  // Identifier thumbnail styles
  optionTileWithThumbnail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  optionTileContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
  },
  identifierThumbnail: {
    width: 48,
    height: 48,
    backgroundColor: '#f8f9fa',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    flexShrink: 0,
  },
  textThumbnail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});