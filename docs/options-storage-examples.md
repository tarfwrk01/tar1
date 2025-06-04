# Options Storage Format Examples

## New Simplified Format

The products table `options` column now stores complete option details in a clean, simplified format instead of just IDs.

### Data Structure

Each option object contains:
- `id`: Unique option ID (number)
- `title`: Option name/type (string)
- `value`: Option value (string)
- `identifierType`: Type of identifier - 'color', 'image', or 'text' (string)
- `identifierValue`: Parsed identifier value (string)
- `group`: Option group name (string, defaults to 'group 1')

### Examples

#### 1. Empty Options (No options selected)
```json
"[]"
```

#### 2. Single Color Option
```json
[
  {
    "id": 1,
    "title": "Color",
    "value": "Red",
    "identifierType": "color",
    "identifierValue": "#FF0000",
    "group": "Colors"
  }
]
```

#### 3. Multiple Options (Size and Color)
```json
[
  {
    "id": 1,
    "title": "Size",
    "value": "Large",
    "identifierType": "text",
    "identifierValue": "L",
    "group": "Sizes"
  },
  {
    "id": 3,
    "title": "Color",
    "value": "Blue",
    "identifierType": "color",
    "identifierValue": "#0000FF",
    "group": "Colors"
  }
]
```

#### 4. Image Identifier Option
```json
[
  {
    "id": 5,
    "title": "Material",
    "value": "Cotton",
    "identifierType": "image",
    "identifierValue": "https://example.com/cotton.jpg",
    "group": "Materials"
  }
]
```

#### 5. Complex Product with Multiple Option Groups
```json
[
  {
    "id": 1,
    "title": "Size",
    "value": "Medium",
    "identifierType": "text",
    "identifierValue": "M",
    "group": "Sizes"
  },
  {
    "id": 2,
    "title": "Size",
    "value": "Large",
    "identifierType": "text",
    "identifierValue": "L",
    "group": "Sizes"
  },
  {
    "id": 10,
    "title": "Color",
    "value": "Black",
    "identifierType": "color",
    "identifierValue": "#000000",
    "group": "Colors"
  },
  {
    "id": 11,
    "title": "Color",
    "value": "White",
    "identifierType": "color",
    "identifierValue": "#FFFFFF",
    "group": "Colors"
  }
]
```

## Benefits of Simplified Format

1. **Clean structure**: Simplified object format without nested JSON strings
2. **Self-contained**: All option details are stored with the product
3. **Performance**: No need to join with options table for display
4. **Data integrity**: Option details are preserved even if options table changes
5. **Easy parsing**: Direct access to identifier type and value
6. **Grouping**: Maintains option group information for better organization

## Backward Compatibility

The system maintains backward compatibility with the old format (array of IDs) through the `parseSelectedIds` and `parseSelectedOptions` helper functions.

## Usage in Code

```typescript
// Parse options with full details
const selectedOptions = parseSelectedOptions(product.options || '[]');

// Display options with identifier information
selectedOptions.forEach(option => {
  console.log(`${option.title}: ${option.value}`);
  console.log(`Type: ${option.identifierType}`);
  console.log(`Value: ${option.identifierValue}`);
  console.log(`Group: ${option.group}`);

  // Render based on identifier type
  if (option.identifierType === 'color') {
    // Show color swatch with option.identifierValue as background color
  } else if (option.identifierType === 'image') {
    // Show image with option.identifierValue as URL
  } else if (option.identifierType === 'text') {
    // Show text badge with option.identifierValue as text
  }
});
```
