import { Redirect } from 'expo-router';

export default function AgentsRedirect() {
  // Redirect to the agents screen
  return <Redirect href="/(agents)" />;
}
