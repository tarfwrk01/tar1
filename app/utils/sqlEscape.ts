/**
 * SQL string escaping utilities to prevent injection vulnerabilities
 */

/**
 * Escape SQL string values by doubling single quotes
 * This is the standard SQL escaping method for string literals
 */
export function escapeSQLString(value: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }
  
  // Replace single quotes with double single quotes
  return value.replace(/'/g, "''");
}

/**
 * Escape SQL identifiers (table names, column names)
 * Uses double quotes for identifier escaping
 */
export function escapeSQLIdentifier(identifier: string): string {
  if (typeof identifier !== 'string') {
    throw new Error('SQL identifier must be a string');
  }
  
  // Remove any existing quotes and escape with double quotes
  const cleaned = identifier.replace(/"/g, '');
  return `"${cleaned}"`;
}

/**
 * Validate and escape SQL identifier for safe use in queries
 * Only allows alphanumeric characters and underscores
 */
export function escapeSQL(identifier: string): string {
  if (typeof identifier !== 'string') {
    throw new Error('SQL identifier must be a string');
  }
  
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  
  return identifier;
}

/**
 * Escape and format SQL LIKE pattern
 */
export function escapeLikePattern(pattern: string): string {
  if (typeof pattern !== 'string') {
    return String(pattern);
  }
  
  // Escape special LIKE characters: %, _, \
  return pattern
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_');   // Escape underscores
}

/**
 * Build a safe parameterized query with proper escaping
 */
export function buildSafeQuery(
  template: string, 
  params: Record<string, any> = {}
): { sql: string; args: any[] } {
  const args: any[] = [];
  let paramIndex = 0;
  
  // Replace named parameters with positional parameters
  const sql = template.replace(/:(\w+)/g, (match, paramName) => {
    if (paramName in params) {
      args.push(params[paramName]);
      return '?';
    }
    throw new Error(`Missing parameter: ${paramName}`);
  });
  
  return { sql, args };
}

/**
 * Sanitize user input for safe database operations
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return null;
  }
  
  if (typeof input === 'string') {
    // Remove null bytes and control characters except newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
  
  if (typeof input === 'number') {
    // Ensure it's a valid number
    return isNaN(input) ? null : input;
  }
  
  if (typeof input === 'boolean') {
    return input ? 1 : 0; // Convert to integer for SQLite
  }
  
  if (Array.isArray(input)) {
    return JSON.stringify(input.map(sanitizeInput));
  }
  
  if (typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[escapeSQL(key)] = sanitizeInput(value);
    }
    return JSON.stringify(sanitized);
  }
  
  return String(input);
}

/**
 * Validate and sanitize product data before database operations
 */
export function sanitizeProductData(product: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  // Define allowed fields and their types
  const allowedFields = {
    title: 'string',
    image: 'string',
    medias: 'json',
    excerpt: 'string',
    notes: 'string',
    type: 'string',
    category: 'string',
    collection: 'string',
    unit: 'string',
    price: 'number',
    saleprice: 'number',
    vendor: 'string',
    brand: 'string',
    options: 'json',
    modifiers: 'json',
    metafields: 'json',
    saleinfo: 'string',
    stores: 'string',
    pos: 'boolean',
    website: 'boolean',
    seo: 'json',
    tags: 'string',
    cost: 'number',
    qrcode: 'string',
    stock: 'number',
    publish: 'string',
    promoinfo: 'string',
    featured: 'boolean',
    relproducts: 'json',
    sellproducts: 'json'
  };
  
  for (const [key, value] of Object.entries(product)) {
    if (key in allowedFields) {
      const expectedType = allowedFields[key as keyof typeof allowedFields];
      
      switch (expectedType) {
        case 'string':
          sanitized[key] = sanitizeInput(value);
          break;
        case 'number':
          sanitized[key] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
          break;
        case 'boolean':
          sanitized[key] = value ? 1 : 0;
          break;
        case 'json':
          try {
            // Ensure it's valid JSON
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            sanitized[key] = JSON.stringify(parsed);
          } catch {
            sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
          }
          break;
        default:
          sanitized[key] = sanitizeInput(value);
      }
    }
  }
  
  return sanitized;
}

/**
 * Create a safe INSERT query for products
 */
export function createInsertQuery(
  tableName: string, 
  data: Record<string, any>
): { sql: string; args: any[] } {
  const sanitizedData = sanitizeProductData(data);
  const fields = Object.keys(sanitizedData);
  const placeholders = fields.map(() => '?').join(', ');
  const values = Object.values(sanitizedData);
  
  const sql = `INSERT INTO ${escapeSQL(tableName)} (${fields.map(escapeSQL).join(', ')}) VALUES (${placeholders})`;
  
  return { sql, args: values };
}

/**
 * Create a safe UPDATE query for products
 */
export function createUpdateQuery(
  tableName: string, 
  data: Record<string, any>, 
  whereClause: string,
  whereArgs: any[] = []
): { sql: string; args: any[] } {
  const sanitizedData = sanitizeProductData(data);
  const fields = Object.keys(sanitizedData);
  const setClause = fields.map(field => `${escapeSQL(field)} = ?`).join(', ');
  const values = Object.values(sanitizedData);
  
  const sql = `UPDATE ${escapeSQL(tableName)} SET ${setClause} WHERE ${whereClause}`;
  
  return { sql, args: [...values, ...whereArgs] };
}
