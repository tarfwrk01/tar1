import { escapeSQL } from '../utils/sqlEscape';

export interface DatabaseCredentials {
  tursoDbName: string;
  tursoApiToken: string;
}

export interface QueryRequest {
  type: 'execute';
  stmt: {
    sql: string;
    args?: any[];
  };
}

export interface DatabaseResponse<T = any> {
  results: Array<{
    response: {
      result: {
        rows: any[][];
        columns: string[];
      };
    };
  }>;
}

/**
 * Centralized database service for Turso operations
 */
export class DatabaseService {
  private credentials: DatabaseCredentials;
  private baseUrl: string;

  constructor(credentials: DatabaseCredentials) {
    this.credentials = credentials;
    this.baseUrl = `https://${credentials.tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;
  }

  /**
   * Execute a single SQL query with retry logic
   */
  async executeQuery<T = any>(
    sql: string, 
    args: any[] = [], 
    retries = 3
  ): Promise<DatabaseResponse<T>> {
    const request: QueryRequest = {
      type: 'execute',
      stmt: { sql, args }
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.credentials.tursoApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: [request] })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Database query failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Database query attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('All database query attempts failed');
  }

  /**
   * Execute multiple SQL queries in a transaction
   */
  async executeTransaction(queries: QueryRequest[], retries = 3): Promise<DatabaseResponse[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.credentials.tursoApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: queries })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Database transaction failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.results;
      } catch (error) {
        console.error(`Database transaction attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('All database transaction attempts failed');
  }

  /**
   * Fetch products with pagination and filtering
   */
  async fetchProducts(
    limit = 100, 
    offset = 0, 
    searchQuery = '', 
    filters: Record<string, any> = {}
  ) {
    let sql = `
      SELECT id, title, image, price, type, category, vendor, brand, stock, publish
      FROM products
    `;
    
    const conditions: string[] = [];
    const args: any[] = [];

    // Add search condition
    if (searchQuery.trim()) {
      conditions.push('title LIKE ?');
      args.push(`%${searchQuery}%`);
    }

    // Add filter conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        conditions.push(`${escapeSQL(key)} = ?`);
        args.push(value);
      }
    });

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    return this.executeQuery(sql, args);
  }

  /**
   * Fetch a single product by ID
   */
  async fetchProductById(id: number) {
    const sql = `
      SELECT id, title, image, medias, excerpt, notes, type, category, collection, unit,
             price, saleprice, vendor, brand, options, modifiers, metafields,
             saleinfo, stores, pos, website, seo, tags, cost, qrcode, stock, createdat,
             updatedat, publishat, publish, promoinfo, featured, relproducts, sellproducts
      FROM products 
      WHERE id = ?
    `;
    
    return this.executeQuery(sql, [id]);
  }

  /**
   * Insert a new product
   */
  async insertProduct(product: Record<string, any>) {
    const fields = Object.keys(product);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(product);

    const sql = `
      INSERT INTO products (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    return this.executeQuery(sql, values);
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, updates: Record<string, any>) {
    const fields = Object.keys(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const sql = `UPDATE products SET ${setClause} WHERE id = ?`;
    
    return this.executeQuery(sql, values);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number) {
    const sql = 'DELETE FROM products WHERE id = ?';
    return this.executeQuery(sql, [id]);
  }

  /**
   * Fetch options with hierarchy
   */
  async fetchOptions(limit = 100) {
    const sql = `
      SELECT id, parentid, title, value, identifier 
      FROM options 
      ORDER BY title 
      LIMIT ?
    `;
    
    return this.executeQuery(sql, [limit]);
  }

  /**
   * Fetch metafields
   */
  async fetchMetafields(limit = 100) {
    const sql = `
      SELECT id, parentid, title, value, "group", type, filter 
      FROM metafields 
      ORDER BY title 
      LIMIT ?
    `;
    
    return this.executeQuery(sql, [limit]);
  }

  /**
   * Fetch modifiers
   */
  async fetchModifiers(limit = 100) {
    const sql = `
      SELECT id, title, notes, type, value, identifier 
      FROM modifiers 
      ORDER BY title 
      LIMIT ?
    `;
    
    return this.executeQuery(sql, [limit]);
  }

  /**
   * Fetch categories with hierarchy
   */
  async fetchCategories(limit = 100) {
    const sql = `
      SELECT id, name, image, notes, parent 
      FROM categories 
      ORDER BY name 
      LIMIT ?
    `;
    
    return this.executeQuery(sql, [limit]);
  }

  /**
   * Generic fetch method for collections, vendors, brands, tags
   */
  async fetchGenericEntities(
    tableName: string, 
    fields = ['id', 'name', 'image', 'notes'], 
    limit = 100
  ) {
    const sql = `
      SELECT ${fields.join(', ')} 
      FROM ${escapeSQL(tableName)} 
      ORDER BY name 
      LIMIT ?
    `;
    
    return this.executeQuery(sql, [limit]);
  }

  /**
   * Count total products for pagination
   */
  async countProducts(searchQuery = '', filters: Record<string, any> = {}) {
    let sql = 'SELECT COUNT(*) as total FROM products';
    const conditions: string[] = [];
    const args: any[] = [];

    if (searchQuery.trim()) {
      conditions.push('title LIKE ?');
      args.push(`%${searchQuery}%`);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        conditions.push(`${escapeSQL(key)} = ?`);
        args.push(value);
      }
    });

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    return this.executeQuery(sql, args);
  }
}
