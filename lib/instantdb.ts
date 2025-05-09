import { init } from '@instantdb/react-native';
import 'react-native-get-random-values';
import schema from '../instant.schema';

// Get the app ID from environment variables
const appId = process.env.INSTANT_APP_ID || '84f087af-f6a5-4a5f-acbc-bc4008e3a725';

// Debug log
console.log('InstantDB App ID:', appId);

// Create InstantDB client with React Native specific configuration
export const instant = init({
  appId,
  schema,
});

// Export types for TypeScript
export type Schema = typeof schema;
export type InstantUser = {
  id: string;
  email: string;
};
