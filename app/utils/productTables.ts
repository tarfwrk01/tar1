import { createTursoTable } from './tursoDb';

/**
 * Creates all product-related tables in the Turso database
 * @returns {Promise<boolean>} Success status
 */
export const createProductTables = async (): Promise<boolean> => {
  try {
    console.log('Creating product tables...');
    
    // Create products table
    const productsSuccess = await createTursoTable(
      'products',
      `CREATE TABLE IF NOT EXISTS products (
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
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'title', type: 'TEXT' },
          { name: 'images', type: 'TEXT', description: 'JSON array of URLs' },
          { name: 'excerpt', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' },
          { name: 'type', type: 'TEXT', description: 'physical, digital' },
          { name: 'category', type: 'TEXT' },
          { name: 'collection', type: 'TEXT' },
          { name: 'unit', type: 'TEXT' },
          { name: 'price', type: 'REAL' },
          { name: 'saleprice', type: 'REAL' },
          { name: 'vendor', type: 'TEXT' },
          { name: 'brand', type: 'TEXT' },
          { name: 'options', type: 'TEXT', description: 'JSON array of option objects with id, title, value, identifierType, identifierValue, group' },
          { name: 'modifiers', type: 'TEXT' },
          { name: 'metafields', type: 'TEXT' },
          { name: 'saleinfo', type: 'TEXT' },
          { name: 'stores', type: 'TEXT' },
          { name: 'location', type: 'TEXT' },
          { name: 'saleschannel', type: 'TEXT' },
          { name: 'pos', type: 'INTEGER', description: 'BOOLEAN stored as INTEGER (0 or 1)' },
          { name: 'website', type: 'INTEGER', description: 'BOOLEAN stored as INTEGER (0 or 1)' },
          { name: 'seo', type: 'TEXT', description: 'JSON with slug, title, keywords' },
          { name: 'tags', type: 'TEXT' },
          { name: 'cost', type: 'REAL' },
          { name: 'barcode', type: 'TEXT' },
          { name: 'createdat', type: 'TEXT' },
          { name: 'updatedat', type: 'TEXT' },
          { name: 'publishat', type: 'TEXT' },
          { name: 'publish', type: 'TEXT', description: 'active, draft, archived' },
          { name: 'promoinfo', type: 'TEXT' },
          { name: 'featured', type: 'INTEGER', description: 'BOOLEAN stored as INTEGER (0 or 1)' },
          { name: 'relproducts', type: 'TEXT', description: 'JSON array of product IDs' },
          { name: 'sellproducts', type: 'TEXT', description: 'JSON array of product IDs' }
        ]
      }
    );

    // Create inventory table
    const inventorySuccess = await createTursoTable(
      'inventory',
      `CREATE TABLE IF NOT EXISTS inventory (
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
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'productId', type: 'INTEGER' },
          { name: 'sku', type: 'TEXT' },
          { name: 'image', type: 'TEXT' },
          { name: 'option1', type: 'TEXT' },
          { name: 'option2', type: 'TEXT' },
          { name: 'option3', type: 'TEXT' },
          { name: 'reorderlevel', type: 'INTEGER' },
          { name: 'reorderqty', type: 'INTEGER' },
          { name: 'warehouse', type: 'TEXT' },
          { name: 'expiry', type: 'TEXT' },
          { name: 'batchno', type: 'TEXT' },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'cost', type: 'REAL' },
          { name: 'price', type: 'REAL' },
          { name: 'margin', type: 'REAL' },
          { name: 'saleprice', type: 'REAL' }
        ],
        foreignKeys: [
          { column: 'productId', references: 'products(id)' }
        ]
      }
    );

    // Create categories table
    const categoriesSuccess = await createTursoTable(
      'categories',
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT,
        parent INTEGER
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' },
          { name: 'parent', type: 'INTEGER' }
        ]
      }
    );

    // Create collections table
    const collectionsSuccess = await createTursoTable(
      'collections',
      `CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT,
        parent INTEGER
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' },
          { name: 'parent', type: 'INTEGER' }
        ]
      }
    );

    // Create vendors table
    const vendorsSuccess = await createTursoTable(
      'vendors',
      `CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' }
        ]
      }
    );

    // Create brands table
    const brandsSuccess = await createTursoTable(
      'brands',
      `CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' }
        ]
      }
    );

    // Create warehouses table
    const warehousesSuccess = await createTursoTable(
      'warehouses',
      `CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' }
        ]
      }
    );

    // Create stores table
    const storesSuccess = await createTursoTable(
      'stores',
      `CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' }
        ]
      }
    );

    // Create tags table
    const tagsSuccess = await createTursoTable(
      'tags',
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        image TEXT,
        notes TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'name', type: 'TEXT', constraints: 'UNIQUE' },
          { name: 'image', type: 'TEXT' },
          { name: 'notes', type: 'TEXT' }
        ]
      }
    );

    // Create metafields table
    const metafieldsSuccess = await createTursoTable(
      'metafields',
      `CREATE TABLE IF NOT EXISTS metafields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parentid INTEGER,
        title TEXT,
        value TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'parentid', type: 'INTEGER' },
          { name: 'title', type: 'TEXT' },
          { name: 'value', type: 'TEXT' }
        ]
      }
    );

    // Create options table
    const optionsSuccess = await createTursoTable(
      'options',
      `CREATE TABLE IF NOT EXISTS options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parentid INTEGER,
        title TEXT,
        value TEXT
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'parentid', type: 'INTEGER' },
          { name: 'title', type: 'TEXT' },
          { name: 'value', type: 'TEXT' }
        ]
      }
    );

    // Create media table
    const mediaSuccess = await createTursoTable(
      'media',
      `CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parentid INTEGER,
        type TEXT,
        url TEXT,
        "order" INTEGER
      )`,
      {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
          { name: 'parentid', type: 'INTEGER' },
          { name: 'type', type: 'TEXT' },
          { name: 'url', type: 'TEXT' },
          { name: 'order', type: 'INTEGER' }
        ]
      }
    );

    // Check if all tables were created successfully
    const allTablesCreated = 
      productsSuccess && 
      inventorySuccess && 
      categoriesSuccess && 
      collectionsSuccess && 
      vendorsSuccess && 
      brandsSuccess && 
      warehousesSuccess && 
      storesSuccess && 
      tagsSuccess && 
      metafieldsSuccess && 
      optionsSuccess && 
      mediaSuccess;

    console.log('Product tables creation completed. Success:', allTablesCreated);
    return allTablesCreated;
  } catch (error) {
    console.error('Error creating product tables:', error);
    return false;
  }
};
