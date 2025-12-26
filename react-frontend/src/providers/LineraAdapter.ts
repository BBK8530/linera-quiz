import {
  initialize as initLinera,
  Faucet,
  Client,
  Wallet,
  Application,
} from '@linera/client';
import type { Wallet as DynamicWallet } from '@dynamic-labs/sdk-react-core';
import { DynamicSigner } from './DynamicSigner';
import { LINERA_RPC_URL, APP_ID } from '../constants';

export interface LineraProvider {
  client: Client;
  wallet: Wallet;
  faucet: Faucet;
  address: string;
  chainId: string;
}

export class LineraAdapter {
  private static instance: LineraAdapter | null = null;
  private provider: LineraProvider | null = null;
  private application: Application | null = null;
  private wasmInitPromise: Promise<unknown> | null = null;
  private connectPromise: Promise<LineraProvider> | null = null;
  private onConnectionChangeCallbacks: Array<() => void> = [];
  private isConnecting: boolean = false;
  private currentWalletAddress: string | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): LineraAdapter {
    if (!LineraAdapter.instance) LineraAdapter.instance = new LineraAdapter();
    return LineraAdapter.instance;
  }

  async connect(
    dynamicWallet: DynamicWallet,
    rpcUrl?: string,
  ): Promise<LineraProvider> {
    const walletAddress = dynamicWallet.address;
    
    // 如果已经有连接且是同一个钱包，直接返回
    if (this.provider && this.currentWalletAddress === walletAddress) {
      console.log('🔗 Already connected to Linera with same wallet, reusing existing connection');
      return this.provider;
    }
    
    // 如果正在连接中，等待现有的连接
    if (this.connectPromise) {
      console.log('🔗 Connection in progress, waiting...');
      return this.connectPromise;
    }

    if (!dynamicWallet) {
      throw new Error('Dynamic wallet is required for Linera connection');
    }

    try {
      this.isConnecting = true;
      this.currentWalletAddress = walletAddress;
      this.connectPromise = (async () => {
        console.log('🔗 Connecting with Dynamic wallet:', walletAddress);

        try {
          if (!this.wasmInitPromise) this.wasmInitPromise = initLinera();
          await this.wasmInitPromise;
          console.log('✅ Linera WASM modules initialized successfully');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('storage is already initialized')) {
            console.warn(
              '⚠️ Linera storage already initialized; continuing without re-init',
            );
          } else {
            throw e;
          }
        }

        const faucet = await new Faucet(rpcUrl || LINERA_RPC_URL);
        const wallet = await faucet.createWallet();
        const chainId = await faucet.claimChain(wallet, walletAddress);

        const signer = await new DynamicSigner(dynamicWallet);
        const client = await new Client(wallet, signer, false);
        console.log('✅ Linera wallet created successfully!');

        this.provider = {
          client,
          wallet,
          faucet,
          chainId,
          address: walletAddress,
        };
        
        this.isInitialized = true;

        // 触发所有连接状态变化回调
        this.onConnectionChangeCallbacks.forEach(callback => callback());
        
        return this.provider;
      })();

      const provider = await this.connectPromise;
      return provider;
    } catch (error) {
      console.error('Failed to connect to Linera:', error);
      // 连接失败时清理状态
      this.currentWalletAddress = null;
      this.provider = null;
      this.application = null;
      throw new Error(
        `Failed to connect to Linera network: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      // 连接完成后清除状态
      this.connectPromise = null;
      this.isConnecting = false;
    }
  }

  async setApplication(appId?: string) {
    if (!this.provider) throw new Error('Not connected to Linera');

    const application = await this.provider.client.application(appId || APP_ID);

    if (!application) throw new Error('Failed to get application');
    console.log('✅ Linera application set successfully!');
    this.application = application;
    // 触发所有连接状态变化回调
    this.onConnectionChangeCallbacks.forEach(callback => callback());
  }

  async queryApplication<T>(query: object): Promise<T> {
    if (!this.application) throw new Error('Application not set');

    const queryString = JSON.stringify(query);
    console.log('📤 Sending Linera query:', queryString);

    const result = await this.application.query(queryString);

    console.log('📥 Received Linera response:', result);

    const response = JSON.parse(result);

    // Check for errors in the response
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors
        .map((error: any) => error.message)
        .join('\n');
      throw new Error(`Linera query error: ${errorMessages}`);
    }

    return response as T;
  }

  async mutateApplication<T>(mutation: object): Promise<T> {
    if (!this.application) throw new Error('Application not set');

    const mutationString = JSON.stringify(mutation);
    console.log('📤 Sending Linera mutation:', mutationString);

    // Use query method for mutations as execute method doesn't exist in Application class
    const result = await this.application.query(mutationString);

    console.log('📥 Received Linera mutation response:', result);

    const response = JSON.parse(result);

    // Check for errors in the response
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors
        .map((error: any) => error.message)
        .join('\n');
      throw new Error(`Linera mutation error: ${errorMessages}`);
    }

    return response as T;
  }

  getProvider(): LineraProvider {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider;
  }

  getFaucet(): Faucet {
    if (!this.provider?.faucet) throw new Error('Faucet not set');
    return this.provider.faucet;
  }

  getWallet(): Wallet {
    if (!this.provider?.wallet) throw new Error('Wallet not set');
    return this.provider.wallet;
  }

  getApplication(): Application {
    if (!this.application) throw new Error('Application not set');
    return this.application;
  }

  isChainConnected(): boolean {
    return this.provider !== null;
  }

  isApplicationSet(): boolean {
    return this.application !== null;
  }

  onConnectionStateChange(callback: () => void): void {
    this.onConnectionChangeCallbacks.push(callback);
  }

  offConnectionStateChange(callback?: () => void): void {
    if (callback) {
      this.onConnectionChangeCallbacks =
        this.onConnectionChangeCallbacks.filter(cb => cb !== callback);
    } else {
      this.onConnectionChangeCallbacks = [];
    }
  }

  reset(): void {
    console.log('🔄 Resetting Linera connection');
    this.application = null;
    this.provider = null;
    this.connectPromise = null;
    this.currentWalletAddress = null;
    this.isConnecting = false;
    this.isInitialized = false;
    // 触发所有连接状态变化回调
    this.onConnectionChangeCallbacks.forEach(callback => callback());
  }

  isConnectedWithWallet(walletAddress: string): boolean {
    return this.provider !== null && 
           this.currentWalletAddress === walletAddress && 
           this.isInitialized;
  }

  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    if (this.isConnecting || this.connectPromise) {
      return 'connecting';
    }
    if (this.provider && this.isInitialized) {
      return 'connected';
    }
    return 'disconnected';
  }
}

// Export singleton instance
export const lineraAdapter = LineraAdapter.getInstance();
