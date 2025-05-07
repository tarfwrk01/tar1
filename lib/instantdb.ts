import { i, init } from '@instantdb/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';

// Define the schema for InstantDB
export const schema = i.schema({
  entities: {
    users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string().optional(),
      createdAt: i.string(),
    }),
    // Add more collections as needed
  },
});

// Get the app ID from environment variables
const appId = '84f087af-f6a5-4a5f-acbc-bc4008e3a725';

// Debug log
console.log('InstantDB App ID:', appId);

// Create InstantDB client with React Native specific configuration
export const instant = init({
  appId,
  schema,
  storage: AsyncStorage,
});

// Export types for TypeScript
export type Schema = typeof schema;
export type User = Schema['entities']['users'];
export type InstantUser = {
  id: string;
  email: string;
};
