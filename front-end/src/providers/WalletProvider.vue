<script setup>
import { provide, ref, onMounted, onUnmounted, watch } from "vue";
import { InMemoryWallet } from "@linera/client";

import Web3 from "web3";

// Create wallet context
const walletContext = {
  account: ref(null),
  isConnected: ref(false),
  chainId: ref(null),
  walletType: ref(null),
  isLoading: ref(false),
  error: ref(null),
  connectWallet: null,
  disconnectWallet: null,
};

// Provide context for application use
provide("wallet", walletContext);

// Internal state
const wallet = ref(null);

const reconnectTimeout = ref(null);

// Format account address
const getFormattedAccount = (account) => {
  if (!account) return null;
  return account.startsWith("0x") ? account : `0x${account}`;
};

// Connect wallet
const connectWallet = async () => {
  walletContext.isLoading.value = true;
  walletContext.error.value = null;

  try {
    // Generate random InMemoryWallet
    wallet.value = new InMemoryWallet();
    const account = await wallet.value.getAccounts();
    const formattedAccount = getFormattedAccount(account[0]);

    walletContext.account.value = formattedAccount;
    walletContext.chainId.value = "local-test";
    walletContext.walletType.value = "in-memory";
    walletContext.isConnected.value = true;

    console.log("Randomly generated wallet:", formattedAccount);

    console.log(
      `Wallet connected: in-memory, Account: ${walletContext.account.value}`
    );
  } catch (error) {
    walletContext.error.value = error.message || "Failed to connect wallet";
    console.error("Wallet connection error:", error);
  } finally {
    walletContext.isLoading.value = false;
  }
};

// Disconnect wallet
const disconnectWallet = () => {
  walletContext.account.value = null;
  walletContext.isConnected.value = false;
  walletContext.chainId.value = null;
  walletContext.walletType.value = null;
  wallet.value = null;
};

// Expose methods
walletContext.connectWallet = connectWallet;
walletContext.disconnectWallet = disconnectWallet;

// Auto-connect wallet when component mounts
onMounted(() => {
  // Auto-generate and connect wallet
  connectWallet().catch((err) => {
    console.error("Failed to auto-connect wallet:", err);
  });
});

// Cleanup when component unmounts
onUnmounted(() => {
  if (reconnectTimeout.value) clearTimeout(reconnectTimeout.value);
});

// Provide wallet instance access
provide("lineraWallet", wallet);
</script>

<template>
  <!-- Wallet provider doesn't need to render content, only provides context -->
  <slot />
</template>
