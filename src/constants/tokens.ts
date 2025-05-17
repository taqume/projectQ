import { Network } from './networks';

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  displayDecimals: number;
  icon: any; // require('../icons/...') şeklinde olacak
  addresses: { [networkName: string]: string }; // networkName string olacak
  isNative?: boolean;
  isStable?: boolean;
  fixedPriceTRY?: number; // KMPS için eklendi
}

export const STATIC_KMPS_ICON = require('../icons/kmps-icon.png');
export const AVAX_ICON = require('../icons/avax-icon.png');
export const ETH_ICON = require('../icons/eth-icon.png');
export const BTC_ICON = require('../icons/btc-icon.png');

// Token Listesi
export const TOKENS: Token[] = [
  {
    symbol: 'KMPS',
    name: 'Kampüs Token',
    decimals: 18,
    displayDecimals: 2,
    icon: STATIC_KMPS_ICON,
    addresses: {},
    fixedPriceTRY: 25.00,
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    displayDecimals: 4,
    icon: AVAX_ICON,
    addresses: {},
    isNative: true,
  },
  {
    symbol: 'WETH.e',
    name: 'Wrapped Ether',
    decimals: 18,
    displayDecimals: 5,
    icon: ETH_ICON,
    addresses: {
      'Avalanche Mainnet': '0x49d5c2BdFfac6CE2BFdB6640F4F80F226bc10bAB',
      'Avalanche Fuji Testnet': '0xd00ae08403b9bbb9124bb305c09058e32c39a48c',
    },
  },
  {
    symbol: 'WBTC.e',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    displayDecimals: 6,
    icon: BTC_ICON,
    addresses: {
      'Avalanche Mainnet': '0x50b7545627a5162f82a992c33b87adc75187b218',
      'Avalanche Fuji Testnet': '0x408d4cd0adb7cebd1f1a1c33a0a903a5e3119b8f',
    },
  },
  // İleride daha fazla token eklenebilir
];

export const findTokenBySymbol = (symbol: string): Token | undefined => {
  return TOKENS.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
};

export function getTokenAddress(symbol: string, networkName: string): string | undefined {
  const token = TOKENS.find(t => t.symbol === symbol);
  if (token) {
    return token.addresses[networkName];
  }
  return undefined;
} 