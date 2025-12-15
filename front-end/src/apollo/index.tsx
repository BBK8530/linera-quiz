import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { createApolloProvider } from '@vue/apollo-option';

// 配置环境变量类型
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
// 设置GraphQL链接
const httpLink = createHttpLink({
  uri: getNodeUrl(),
});

// 创建Apollo客户端
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

// 创建Vue Apollo Provider
export const apolloProvider = createApolloProvider({
  defaultClient: apolloClient,
});

// 导出Provider作为默认导出和命名导出
export default apolloProvider;
export { apolloProvider as GraphQLProvider };
