import { Connection } from "@solana/web3.js";
import { MarginfiClient, getConfig } from '@mrgnlabs/marginfi-client-v2';
import { NodeWallet } from "@mrgnlabs/mrgn-common";

// RPC endpoint
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

// Initialize connection
export const getConnection = () => {
  return new Connection(RPC_ENDPOINT, "confirmed");
};

// Initialize wallet (dummy wallet for read-only operations)
export const getDummyWallet = () => {
  return NodeWallet.local();
};

// Get MarginFi client
export const getMarginfiClient = async () => {
  try {
    const connection = getConnection();
    const wallet = getDummyWallet();
    const config = getConfig("production"); // Use production config for mainnet
    const client = await MarginfiClient.fetch(config, wallet, connection);
    
    if (!client) {
      throw new Error("Failed to initialize MarginFi client");
    }
    
    return client;
  } catch (error) {
    console.error("Error initializing MarginFi client:", error);
    throw error;
  }
}; 