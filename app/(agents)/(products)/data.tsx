import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../../app/context/onboarding';

export default function ProductDataScreen() {
  const router = useRouter();
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const { profileData } = useOnboarding();

  const handleBackPress = () => {
    router.back();
  };

  const createProductTables = async () => {
    try {
      console.log('Creating product tables...');
      setIsCreatingTables(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Create all product tables
      const createTablesResponse = await fetch(apiUrl, {
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
                sql: `CREATE TABLE IF NOT EXISTS products (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT,
                  medias TEXT,
                  excerpt TEXT,
                  notes TEXT,
                  type TEXT,
                  category TEXT,
                  collection TEXT,
                  unit TEXT,
                  price REAL,
                  saleprice REAL,
                  vendor TEXT,
                  brand TEXT,
                  options TEXT,
                  modifiers TEXT,
                  metafields TEXT,
                  saleinfo TEXT,
                  stores TEXT,
                  pos INTEGER,
                  website INTEGER,
                  seo TEXT,
                  tags TEXT,
                  cost REAL,
                  qrcode TEXT,
                  stock INTEGER,
                  createdat TEXT,
                  updatedat TEXT,
                  publishat TEXT,
                  publish TEXT,
                  promoinfo TEXT,
                  featured INTEGER,
                  relproducts TEXT,
                  sellproducts TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS inventory (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  productId INTEGER,
                  sku TEXT,
                  barcode TEXT,
                  image TEXT,
                  option1 TEXT,
                  option2 TEXT,
                  option3 TEXT,
                  reorderlevel INTEGER,
                  path TEXT,
                  available INTEGER,
                  committed INTEGER,
                  unavailable INTEGER,
                  onhand INTEGER,
                  metafields TEXT,
                  cost REAL,
                  price REAL,
                  margin REAL,
                  saleprice REAL,
                  FOREIGN KEY (productId) REFERENCES products(id)
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS stocks (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  parentid INTEGER,
                  available INTEGER,
                  committed INTEGER,
                  datetime TEXT,
                  expdate TEXT,
                  fifo REAL,
                  path TEXT,
                  FOREIGN KEY (parentid) REFERENCES inventory(id)
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS categories (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  image TEXT,
                  notes TEXT,
                  parent INTEGER
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS collections (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  image TEXT,
                  notes TEXT,
                  parent INTEGER
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS vendors (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  image TEXT,
                  notes TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS brands (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  image TEXT,
                  notes TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS path (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  parentid INTEGER,
                  title TEXT,
                  notes TEXT,
                  location TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS tags (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  image TEXT,
                  notes TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS metafields (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  parentid INTEGER,
                  title TEXT,
                  value TEXT,
                  "group" TEXT,
                  type TEXT,
                  filter INTEGER
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS options (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  parentid INTEGER,
                  title TEXT,
                  value TEXT,
                  identifier TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS modifiers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT,
                  notes TEXT,
                  type TEXT,
                  value REAL,
                  identifier TEXT
                )`
              }
            },
            {
              type: "execute",
              stmt: {
                sql: `CREATE TABLE IF NOT EXISTS media (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  parentid INTEGER,
                  type TEXT,
                  url TEXT,
                  "order" INTEGER
                )`
              }
            }
          ]
        })
      });

      setIsCreatingTables(false);

      if (createTablesResponse.ok) {
        console.log('Product tables created successfully');
        Alert.alert(
          'Success',
          'Product tables created successfully.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to create product tables:', await createTablesResponse.text());
        Alert.alert(
          'Error',
          'Failed to create product tables. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating product tables:', error);
      setIsCreatingTables(false);
      Alert.alert(
        'Error',
        'An error occurred while creating product tables. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Data</Text>
      </View>

      {isCreatingTables && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Creating product tables...</Text>
        </View>
      )}

      <ScrollView style={styles.content}>


        <TouchableOpacity
          style={styles.createButton}
          onPress={createProductTables}
          disabled={isCreatingTables}
        >
          <Text style={styles.createButtonText}>Create Product Tables</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
});