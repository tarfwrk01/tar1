import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for product sub-items
export type ProductSubItem = {
  id: string;
  name: string;
};

// Define the context type
type ProductContextType = {
  selectedProduct: ProductSubItem | null;
  setSelectedProduct: (product: ProductSubItem | null) => void;
};

// Create the context with default values
const ProductContext = createContext<ProductContextType>({
  selectedProduct: null,
  setSelectedProduct: () => {},
});

// Create a provider component
export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<ProductSubItem | null>(null);

  return (
    <ProductContext.Provider value={{ selectedProduct, setSelectedProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

// Create a hook to use the product context
export function useProduct() {
  return useContext(ProductContext);
}
