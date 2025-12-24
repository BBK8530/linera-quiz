import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: `http://128.140.73.28:8080/chains/e1f14a27f2b7e7ffa4c7ab45dab80b88d8cf18984f9c75c15644f7cdf408ddcb/applications/41aa5c82097979c4cb419d7ba5ad8e79bef96ad5d2017e3633e75a336d774b4a`, // 根据实际情况调整GraphQL服务器地址
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
