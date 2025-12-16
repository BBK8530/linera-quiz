import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { createApolloProvider } from '@vue/apollo-option';

// Configure environment variable types
declare global {
  interface ImportMetaEnv {
    VITE_HOST?: string;
    VITE_APP_ID?: string;
    VITE_CHAIN_ID?: string;
    BASE_URL?: string;
    VITE_PORT?: string;
  }
  
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}
export function getNodeUrl() {
  const { VITE_HOST, VITE_PORT, VITE_CHAIN_ID, VITE_APP_ID } = import.meta.env;
  return `http://${VITE_HOST}:${VITE_PORT}/chains/${VITE_CHAIN_ID}/applications/${VITE_APP_ID}`;
}
// Set up GraphQL link
const httpLink = createHttpLink({
  uri: getNodeUrl(),
});

// Create Apollo client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

// Create Vue Apollo Provider
export const apolloProvider = createApolloProvider({
  defaultClient: apolloClient,
});

// Export Provider as default and named export
export default apolloProvider;
export { apolloProvider as GraphQLProvider };
