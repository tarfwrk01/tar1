# Standard Instructions for Turso Database Table Creation

This document provides standardized instructions for creating and managing database tables in Turso. These instructions can be applied to any table schema required by the application.

## Core Concepts

The application uses two essential tables as its foundation:

1. **memories** - Stores application memory content
2. **tableconfig** - Registry for all other table schemas

The `tableconfig` table is particularly important as it stores the configuration for all other tables in the system.

## Standard Table Creation Process

Follow these steps to create any new table in the Turso database:

### 1. Get Database Credentials

```javascript
// Get profile data from context
const profile = await getProfileData(); // Implementation depends on your context
const { tursoDbName, tursoApiToken } = profile;

// Validate credentials
if (!tursoDbName || !tursoApiToken) {
  throw new Error('Missing database credentials');
}
```

### 2. Construct API URL

```javascript
const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;
```

### 3. Register Table Schema in TableConfig

```javascript
// Store table schema in tableconfig
await fetch(apiUrl, {
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
          sql: `INSERT INTO tableconfig (name, config) VALUES (?, ?)`,
          args: [tableName, JSON.stringify(tableConfig)]
        }
      }
    ]
  })
});
```

### 4. Create the Table

```javascript
// Execute CREATE TABLE statement
await fetch(apiUrl, {
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
          sql: createTableSQL
        }
      }
    ]
  })
});
```

### 5. Verify Table Creation

```javascript
// Verify table exists
const verifyResponse = await fetch(apiUrl, {
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
          sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          args: [tableName]
        }
      }
    ]
  })
});

const verifyData = await verifyResponse.json();
// Check if table exists in the response
```

## Standard Utility Function

For consistency across the application, use this standard utility function to create tables:

```javascript
/**
 * Creates a table in Turso database
 * @param {string} tableName - Name of the table to create
 * @param {string} createTableSQL - SQL statement to create the table
 * @param {Object} tableConfig - Configuration to store in tableconfig
 * @returns {Promise<boolean>} - Success status
 */
async function createTursoTable(tableName, createTableSQL, tableConfig) {
  try {
    // Get database credentials
    const profile = await getProfileData();
    const { tursoDbName, tursoApiToken } = profile;

    if (!tursoDbName || !tursoApiToken) {
      throw new Error('Missing database credentials');
    }

    // Construct API URL
    const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

    // Step 1: Register schema in tableconfig
    await fetch(apiUrl, {
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
              sql: `INSERT INTO tableconfig (name, config) VALUES (?, ?)`,
              args: [tableName, JSON.stringify(tableConfig)]
            }
          }
        ]
      })
    });

    // Step 2: Create the table
    await fetch(apiUrl, {
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
              sql: createTableSQL
            }
          }
        ]
      })
    });

    // Step 3: Verify table creation
    const verifyResponse = await fetch(apiUrl, {
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
              sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
              args: [tableName]
            }
          }
        ]
      })
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.results &&
        verifyData.results[0] &&
        verifyData.results[0].type === 'success' &&
        verifyData.results[0].rows &&
        verifyData.results[0].rows.length > 0) {
      console.log(`✅ Table ${tableName} created and verified successfully`);
      return true;
    } else {
      console.log(`⚠️ Table ${tableName} creation could not be verified`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    return false;
  }
}
```

## Usage Example

Here's how to use the standard function to create any table:

```javascript
// Define your table
const tableName = "your_table_name";
const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT
)`;
const tableConfig = {
  columns: [
    { name: "id", type: "INTEGER", constraints: "PRIMARY KEY" },
    { name: "name", type: "TEXT", constraints: "NOT NULL" },
    { name: "description", type: "TEXT" },
    { name: "created_at", type: "TEXT" }
  ]
};

// Create the table
const success = await createTursoTable(tableName, createTableSQL, tableConfig);
if (success) {
  console.log(`Table ${tableName} created successfully`);
} else {
  console.error(`Failed to create table ${tableName}`);
}
```

## Creating Multiple Tables

To create multiple related tables:

```javascript
// Create tables in sequence, respecting dependencies
async function createProductTables() {
  // Create categories table first
  const categoriesSuccess = await createTursoTable(
    "categories",
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    )`,
    {
      columns: [
        { name: "id", type: "INTEGER", constraints: "PRIMARY KEY" },
        { name: "name", type: "TEXT", constraints: "NOT NULL" },
        { name: "description", type: "TEXT" }
      ]
    }
  );

  // Then create products table that references categories
  const productsSuccess = await createTursoTable(
    "products",
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price REAL,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )`,
    {
      columns: [
        { name: "id", type: "INTEGER", constraints: "PRIMARY KEY" },
        { name: "title", type: "TEXT", constraints: "NOT NULL" },
        { name: "description", type: "TEXT" },
        { name: "price", type: "REAL" },
        { name: "category_id", type: "INTEGER" }
      ],
      foreignKeys: [
        { column: "category_id", references: "categories(id)" }
      ]
    }
  );

  return categoriesSuccess && productsSuccess;
}
```

## Best Practices

1. Always use `CREATE TABLE IF NOT EXISTS` to avoid errors if the table already exists
2. Include proper constraints (NOT NULL, UNIQUE, etc.) for data integrity
3. Store table configurations in the `tableconfig` table for future reference
4. Create tables in the correct order when there are foreign key dependencies
5. Use parameterized queries when inserting data to prevent SQL injection
6. Verify table creation after executing CREATE TABLE statements

## Product Tables

The Product Agent creates and manages the following tables:

### Products Table
```sql
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  images TEXT, -- JSON array of URLs
  excerpt TEXT,
  notes TEXT,
  type TEXT, -- physical, digital
  category TEXT,
  collection TEXT,
  unit TEXT,
  price REAL,
  saleprice REAL,
  vendor TEXT,
  brand TEXT,
  options TEXT, -- JSON array of option objects with id, title, value, identifierType, identifierValue, group
  modifiers TEXT,
  metafields TEXT,
  saleinfo TEXT,
  stores TEXT,
  location TEXT,
  saleschannel TEXT,
  pos INTEGER, -- BOOLEAN stored as INTEGER (0 or 1)
  website INTEGER, -- BOOLEAN stored as INTEGER (0 or 1)
  seo TEXT, -- JSON with slug, title, keywords
  tags TEXT,
  cost REAL,
  barcode TEXT,
  createdat TEXT,
  updatedat TEXT,
  publishat TEXT,
  publish TEXT, -- active, draft, archived
  promoinfo TEXT,
  featured INTEGER, -- BOOLEAN stored as INTEGER (0 or 1)
  relproducts TEXT, -- JSON array of product IDs
  sellproducts TEXT -- JSON array of product IDs
)
```

### Inventory Table
```sql
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER,
  sku TEXT,
  image TEXT,
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  reorderlevel INTEGER,
  reorderqty INTEGER,
  warehouse TEXT,
  expiry TEXT,
  batchno TEXT,
  quantity INTEGER,
  cost REAL,
  price REAL,
  margin REAL,
  saleprice REAL,
  FOREIGN KEY (productId) REFERENCES products(id)
)
```

### Categories Table
```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT,
  parent INTEGER
)
```

### Collections Table
```sql
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT,
  parent INTEGER
)
```

### Vendors Table
```sql
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT
)
```

### Brands Table
```sql
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT
)
```

### Warehouses Table
```sql
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT
)
```

### Stores Table
```sql
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT
)
```

### Tags Table
```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  image TEXT,
  notes TEXT
)
```

### Metafields Table
```sql
CREATE TABLE IF NOT EXISTS metafields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parentid INTEGER,
  title TEXT,
  value TEXT
)
```

### Options Table
```sql
CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parentid INTEGER,
  title TEXT,
  value TEXT
)
```

### Media Table
```sql
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parentid INTEGER,
  type TEXT,
  url TEXT,
  "order" INTEGER
)
```