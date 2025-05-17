export interface FeedData {
  address: string;
  decimals: number; // Fiyat verisinin ondalık sayısı
}

export interface ChainlinkFeeds {
  [pair: string]: { // Örneğin 'AVAX/USD'
    mainnet?: FeedData;
    fuji?: FeedData;
  };
}

// Bu adresler Chainlink dökümantasyonundan kontrol edilmelidir.
export const CHAINLINK_FEEDS: ChainlinkFeeds = {
  'AVAX/USD': {
    mainnet: {
      address: '0x0A77230d17318075983913bC2145DB16C7366156',
      decimals: 8,
    },
    fuji: {
      address: '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD', // Fuji AVAX/USD
      decimals: 8,
    },
  },
  'ETH/USD': {
    mainnet: {
      address: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
      decimals: 8,
    },
    fuji: {
      address: '0x86d67c3D3BC88332C7d791360130553473e7B964', // Fuji ETH/USD (Varsayımsal, kontrol edin)
      decimals: 8,
    },
  },
  'BTC/USD': {
    mainnet: {
      address: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
      decimals: 8,
    },
    fuji: {
      address: '0x3363Aa78137c51754A8cF57022930bb3125C2396', // Fuji BTC/USD (Varsayımsal, kontrol edin)
      decimals: 8,
    },
  },
  'TRY/USD': {
    mainnet: {
      address: '0xA61bF273688Ea095b5e4c11f1AF5E763F7aEEE91',
      decimals: 8,
    },
  },
};

export const getFeedAddress = (pair: string, networkName: 'mainnet' | 'fuji'): FeedData | undefined => {
  const feed = CHAINLINK_FEEDS[pair];
  if (!feed) return undefined;
  return feed[networkName];
}; 