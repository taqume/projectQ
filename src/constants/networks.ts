export const AVALANCHE_MAINNET_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
export const AVALANCHE_FUJI_RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc';

export interface Network {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  currencySymbol: string;
}

export const MainnetNetwork: Network = {
  name: 'Avalanche Mainnet',
  rpcUrl: AVALANCHE_MAINNET_RPC_URL,
  chainId: 43114,
  explorerUrl: 'https://snowtrace.io',
  currencySymbol: 'AVAX',
};

export const FujiNetwork: Network = {
  name: 'Avalanche Fuji Testnet',
  rpcUrl: AVALANCHE_FUJI_RPC_URL,
  chainId: 43113,
  explorerUrl: 'https://testnet.snowtrace.io',
  currencySymbol: 'AVAX',
};

export const SUPPORTED_NETWORKS: Record<string, Network> = {
  [MainnetNetwork.name]: MainnetNetwork,
  [FujiNetwork.name]: FujiNetwork,
}; 