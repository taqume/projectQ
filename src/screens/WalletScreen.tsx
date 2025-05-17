import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, SafeAreaView, RefreshControl, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ethers, BigNumber } from 'ethers'; // BigNumber eklendi
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../navigation/RootNavigator'; // useAuth hook'u import edilecek

import { SUPPORTED_NETWORKS, Network, MainnetNetwork, FujiNetwork } from '../constants/networks';
import { TOKENS, Token, getTokenAddress, STATIC_KMPS_ICON, AVAX_ICON, ETH_ICON, BTC_ICON } from '../constants/tokens';
import { CHAINLINK_FEEDS, getFeedAddress, FeedData } from '../constants/chainlinkFeeds';
import { AGGREGATOR_V3_INTERFACE_ABI, ERC20_ABI } from '../constants/abi';

// Örnek varlık verisi (normalde API'den veya state'ten gelecek)
const assetsData = [
  {
    id: '1',
    name: 'KMPS',
    balance: '0.00',
    valueTL: '0.00 TL',
    price: '(1 KMPS = 25.00 TL)',
    icon: require('../icons/kmps-icon.png'), 
  },
  {
    id: '2',
    name: 'AVAX',
    balance: '0.000',
    valueTL: '0.00 TL',
    price: '(1 AVAX = 1002.34 TL)',
    icon: require('../icons/avax-icon.png'),
  },
  {
    id: '3',
    name: 'ETH',
    balance: '0.0000',
    valueTL: '0.00 TL',
    price: '(1 ETH = 1,000,000.24 TL)',
    icon: require('../icons/eth-icon.png'),
  },
  {
    id: '4',
    name: 'BTC',
    balance: '0.0000',
    valueTL: '0.00 TL',
    price: '(1 BTC = 123,344,234.29 TL)',
    icon: require('../icons/btc-icon.png'),
  },
];

// Tipleri tanımlayalım
interface ActionButtonProps {
  icon: any; // Daha spesifik bir tip kullanmak daha iyi olur, örn: ImageSourcePropType
  label: string;
}

interface DisplayAsset extends Token {
  balance: string;
  valueUSD?: string; // USD değeri (Chainlink'ten)
  valueTRY: string;  // TL değeri (hesaplanmış)
  priceUSD?: string; // Birim fiyat USD
  priceTRY: string;  // Birim fiyat TL
}

interface AssetRowProps {
  asset: DisplayAsset;
}

// Yeni arayüzler
interface Transaction {
  hash: string;
  type: 'send' | 'receive' | 'contract_call' | 'self'; // 'self' eklendi (kendine işlem)
  from: string;
  to: string;
  value: string; // Formatlanmış değer (örn: "0.5 AVAX" veya "10 WETH.e")
  timestamp: number; // Unix timestamp
  dateString?: string; // Formatlanmış tarih
  tokenSymbol?: string;
  isError?: boolean;
  blockNumber?: string;
}

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState('Varlıklar'); // 'Varlıklar' veya 'NFTler'
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  // Yerel state yerine AuthContext'teki walletAddress kullanılacak
  // const [walletAddress, setWalletAddress] = useState<string | null>(null); 
  // const [shortAddress, setShortAddress] = useState<string | null>(null); 

  const walletAddress = auth?.walletAddress; // AuthContext'ten al
  const shortAddress = walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : null;

  const [displayedAssets, setDisplayedAssets] = useState<DisplayAsset[]>([]); 
  const [totalBalanceTRY, setTotalBalanceTRY] = useState<string>('0,00 TL'); // tr-TR formatına güncellendi
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false); 
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh için state
  
  // İşlem geçmişi için state'ler
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // ethers state'leri ve useEffect'leri aktif ediliyor
  const [currentProvider, setCurrentProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [currentSigner, setCurrentSigner] = useState<ethers.Wallet | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<Network | null>(null);

  useEffect(() => {
    const networkName = auth?.network || MainnetNetwork.name;
    const networkConfig = SUPPORTED_NETWORKS[networkName] || MainnetNetwork;
    
    setActiveNetwork(networkConfig);
    console.log(`Using network: ${networkConfig.name} (${networkConfig.chainId}) RPC: ${networkConfig.rpcUrl}`);
    try {
      const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
      setCurrentProvider(provider);
      console.log("Provider created successfully");

      if (auth?.userPrivateKey) {
        console.log("User private key found, creating signer...");
        const signerInstance = new ethers.Wallet(auth.userPrivateKey, provider);
        setCurrentSigner(signerInstance);
        // Adres yönetimi AuthContext üzerinden yapılacak
        if (!auth.walletAddress || auth.walletAddress !== signerInstance.address) {
          auth.setWalletAddress(signerInstance.address); 
        }
        console.log("Signer created, address from AuthContext:", auth.walletAddress);
      } else {
        console.log("User private key NOT found.");
        setCurrentSigner(null);
        if (auth?.walletAddress) {
            auth.setWalletAddress(null); // Adresi AuthContext'te de sıfırla
        }
      }
    } catch (error) {
      console.error("Error initializing ethers provider/signer:", error);
      setCurrentProvider(null);
      setCurrentSigner(null);
      if (auth?.walletAddress) {
        auth.setWalletAddress(null);
      }
      Alert.alert("Ağ Hatası", "Sağlayıcı veya cüzdan oluşturulurken bir hata oluştu.");
    }
  }, [auth?.network, auth?.userPrivateKey, auth?.setWalletAddress, auth?.walletAddress]); // Bağımlılıklar güncellendi

  const fetchAssetsData = useCallback(async (isManualRefresh = false) => {
    if (!currentProvider || !walletAddress || !activeNetwork) {
      console.log("fetchAssetsData: Provider, walletAddress (from Auth), or activeNetwork is missing.");
      console.log("fetchAssetsData values: ", { currentProvider: !!currentProvider, walletAddress, activeNetwork: !!activeNetwork });
      setDisplayedAssets([]);
      setTotalBalanceTRY('0,00 TL');
      if (isManualRefresh) setRefreshing(false); // Manuel yenileme ise bitir
      return;
    }
    console.log("fetchAssetsData: Starting to fetch assets...");
    if (isManualRefresh) {
      setRefreshing(true); // Sadece manuel yenilemede RefreshControl'u aktif et
    } else {
      setIsLoadingAssets(true); // Otomatik veya ilk yüklemede global yükleme göstergesi
    }
    setDisplayedAssets([]);
    setTotalBalanceTRY('0,00 TL');

    const newAssets: DisplayAsset[] = [];
    let calculatedTotalBalanceTRY = BigNumber.from(0);

    try {
      const feedNetworkName = activeNetwork.name === MainnetNetwork.name ? 'mainnet' : 'fuji';

      // 1. TRY/USD kurunu al ve USD/TRY'ye çevir
      let usdToTryRate = ethers.utils.parseUnits("30.0", 8); // Varsayılan sabit kur (1 USD = 30 TRY)
      console.log("TRY_USD_DEBUG: Initial fixed USD/TRY rate (raw):", usdToTryRate.toString());
      
      const tryUsdFeedData = getFeedAddress('TRY/USD', feedNetworkName);
      console.log("TRY_USD_DEBUG: TRY/USD FeedData:", tryUsdFeedData);

      if (tryUsdFeedData && tryUsdFeedData.address) {
        try {
          console.log("TRY_USD_DEBUG: Attempting to get checksum for TRY/USD feed address:", tryUsdFeedData.address);
          const checksumTryUsdAddress = ethers.utils.getAddress(tryUsdFeedData.address);
          console.log("TRY_USD_DEBUG: Checksum TRY/USD feed address:", checksumTryUsdAddress);
          const priceFeedContractTryUsd = new ethers.Contract(checksumTryUsdAddress, AGGREGATOR_V3_INTERFACE_ABI, currentProvider);
          console.log("TRY_USD_DEBUG: TRY/USD PriceFeedContract created.");
          const roundDataTryUsd = await priceFeedContractTryUsd.latestRoundData();
          const tryToUsdRate = roundDataTryUsd.answer; // Bu 8 ondalıklı (TRY/USD)
          console.log("TRY_USD_DEBUG: Fetched TRY/USD rate from Chainlink (raw):", tryToUsdRate.toString());

          if (!tryToUsdRate.isZero()) {
            // USD/TRY = 1 / (TRY/USD)
            // (1 * 10^feedDecimals * 10^feedDecimals) / tryToUsdRate
            // Sonucun 8 ondalıklı olması için, 1'i 16 ondalıklı yapıp bölelim.
            const oneWithSixteenDecimals = ethers.utils.parseUnits("1", 16); // (10^8 * 10^8)
            usdToTryRate = oneWithSixteenDecimals.div(tryToUsdRate);
            console.log("TRY_USD_DEBUG: Calculated USD/TRY rate (raw):", usdToTryRate.toString());
          } else {
            console.warn("TRY_USD_DEBUG: TRY/USD rate from Chainlink is zero, using fixed rate.");
            Alert.alert("Kur Uyarısı", "TRY/USD kuru sıfır döndü. Sabit kur (30 TL) kullanılacak.");
          }
        } catch (e) {
          console.error("TRY_USD_DEBUG: Error fetching TRY/USD rate from Chainlink:", e);
          Alert.alert("Kur Hatası", "TRY/USD kuru Chainlink'ten alınırken bir sorun oluştu. Sabit kur (30 TL) kullanılacak.");
        }
      } else {
        console.warn("TRY_USD_DEBUG: TRY/USD feed address not found for network:", feedNetworkName, "Using fixed rate.");
        Alert.alert("Kur Bilgisi Yok", "TRY/USD kur bilgisi bu ağ için bulunamadı. Sabit kur (30 TL) kullanılacak.");
      }

      // Tüm tokenları işle (TOKENS listesinden)
      for (const token of TOKENS) {
        let balance = BigNumber.from(0);
        let priceUSD_BN = BigNumber.from(0); // 8 ondalıklı
        let valueTRY_BN = BigNumber.from(0);
        let formattedBalance = "0.00";
        let displayValueTRY = "0.00 TL";
        let displayPriceTRY = "N/A";
        let displayPriceUSD = "N/A";

        if (token.symbol === 'KMPS') {
          balance = BigNumber.from(0); // KMPS miktarı 0
          // KMPS fiyatı sabit 25 TL
          const kmpsFixedPriceTRY_BN = ethers.utils.parseUnits(token.fixedPriceTRY!.toString(), 8); // 8 ondalıklı varsayalım
          valueTRY_BN = BigNumber.from(0); // Bakiye 0 olduğu için değeri de 0
          
          formattedBalance = "0.00";
          displayValueTRY = "0,00 TL"; // Zaten tr-TR formatında
          displayPriceTRY = `1 KMPS ≈ ${token.fixedPriceTRY!.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`; // Yeni hali

          if (!usdToTryRate.isZero()) {
            const kmpsPriceTRY_forUSDCalc = ethers.utils.parseUnits(token.fixedPriceTRY!.toString(), 8);
            const usdValueForKmps = kmpsPriceTRY_forUSDCalc.mul(ethers.utils.parseUnits("1", 8)).div(usdToTryRate);
            displayPriceUSD = `${parseFloat(ethers.utils.formatUnits(usdValueForKmps, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
          }

        } else if (token.symbol === 'AVAX') { // Native currency (AVAX)
          try {
            balance = await currentProvider.getBalance(walletAddress);
            console.log(`DEBUG_AVAX: Raw AVAX balance for ${walletAddress}: ${balance.toString()}`);
            const avaxUsdFeedData = getFeedAddress('AVAX/USD', feedNetworkName);
            console.log("DEBUG_AVAX: AVAX/USD FeedData:", avaxUsdFeedData);
            if (avaxUsdFeedData && avaxUsdFeedData.address) {
              console.log("DEBUG_AVAX: Attempting to get checksum for AVAX/USD feed address:", avaxUsdFeedData.address);
              const checksumAddressAnkr = ethers.utils.getAddress(avaxUsdFeedData.address);
              console.log("DEBUG_AVAX: Checksum AVAX/USD feed address:", checksumAddressAnkr);
              const priceFeedContractAVAX = new ethers.Contract(checksumAddressAnkr, AGGREGATOR_V3_INTERFACE_ABI, currentProvider);
              console.log("DEBUG_AVAX: AVAX/USD PriceFeedContract created.");
              const roundDataAVAX = await priceFeedContractAVAX.latestRoundData();
              priceUSD_BN = roundDataAVAX.answer; // 8 ondalıklı
              console.log(`DEBUG_AVAX: AVAX/USD rate from Chainlink (raw): ${priceUSD_BN.toString()}`);
            } else {
              console.warn("DEBUG_AVAX: AVAX/USD feed address not found for network:", activeNetwork.name);
            }
          } catch (e) {
            console.error(`DEBUG_AVAX: Error fetching AVAX data:`, e);
          }
        } else { // ERC20 Tokens
          const tokenAddress = getTokenAddress(token.symbol, activeNetwork.name);
          console.log(`DEBUG_ERC20 (${token.symbol}): Token address from getTokenAddress: ${tokenAddress} for network ${activeNetwork.name}`);
          if (tokenAddress) {
            try {
              console.log(`DEBUG_ERC20 (${token.symbol}): Attempting to get checksum for token address: ${tokenAddress}`);
              const checksumTokenAddr = ethers.utils.getAddress(tokenAddress.toLowerCase()); // .toLowerCase() eklendi
              console.log(`DEBUG_ERC20 (${token.symbol}): Checksum token address: ${checksumTokenAddr}`); 
              const erc20Contract = new ethers.Contract(checksumTokenAddr, ERC20_ABI, currentProvider);
              console.log(`DEBUG_ERC20 (${token.symbol}): ERC20 Contract created.`);
              balance = await erc20Contract.balanceOf(walletAddress);
              console.log(`DEBUG_ERC20 (${token.symbol}): Raw balance: ${balance.toString()}`);
              
              let priceFeedPairSymbol: string | undefined = undefined;
              if (token.symbol === 'WETH.e') {
                priceFeedPairSymbol = 'ETH/USD';
              } else if (token.symbol === 'WBTC.e') {
                priceFeedPairSymbol = 'BTC/USD';
              } // Diğer ERC20 tokenlar için gerekirse buraya eklenebilir

              if (priceFeedPairSymbol) {
                const tokenUsdFeedData = getFeedAddress(priceFeedPairSymbol, feedNetworkName);
                console.log(`DEBUG_ERC20 (${token.symbol}): Price feed data for ${priceFeedPairSymbol}:`, tokenUsdFeedData);
                if (tokenUsdFeedData && tokenUsdFeedData.address) {
                  console.log(`DEBUG_ERC20 (${token.symbol}): Attempting to get checksum for ${priceFeedPairSymbol} feed address: ${tokenUsdFeedData.address}`);
                  const checksumFeedAddr = ethers.utils.getAddress(tokenUsdFeedData.address);
                  console.log(`DEBUG_ERC20 (${token.symbol}): Checksum ${priceFeedPairSymbol} feed address: ${checksumFeedAddr}`);
                  const priceFeedContractToken = new ethers.Contract(checksumFeedAddr, AGGREGATOR_V3_INTERFACE_ABI, currentProvider);
                  console.log(`DEBUG_ERC20 (${token.symbol}): ${priceFeedPairSymbol} PriceFeedContract created.`);
                  const roundDataToken = await priceFeedContractToken.latestRoundData();
                  priceUSD_BN = roundDataToken.answer; // 8 ondalıklı
                  console.log(`DEBUG_ERC20 (${token.symbol}): ${priceFeedPairSymbol} rate from Chainlink (raw): ${priceUSD_BN.toString()}`);
                } else {
                  console.warn(`DEBUG_ERC20 (${token.symbol}): ${priceFeedPairSymbol} feed address not found for network:`, feedNetworkName);
                }
              } else {
                 console.warn(`DEBUG_ERC20 (${token.symbol}): No specific price feed pair configured for ${token.symbol}`);
              }
            } catch (e) {
              console.error(`DEBUG_ERC20 (${token.symbol}): Error fetching data:`, e);
            }
          } else {
            console.warn(`DEBUG_ERC20 (${token.symbol}): Address for ${token.symbol} not found on network ${activeNetwork.name}`);
          }
        }

        // Ortak Hesaplamalar ve Formatlama
        formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
        
        if (token.symbol === 'KMPS') {
            // KMPS için priceUSD ve valueTRY yukarıda zaten hesaplandı ve formatlandı.
            // valueTRY burada BigNumber olarak kalmalı, toplam bakiyeye eklenecek.
            // formattedPriceTRY ve formattedPriceUSD de yukarıda ayarlandı.
             const kmpsFixedPriceTRY = ethers.utils.parseUnits(token.fixedPriceTRY!.toString(), 8); // 8 ondalıklı varsayalım
             valueTRY_BN = balance.mul(kmpsFixedPriceTRY).div(ethers.utils.parseUnits("1", token.decimals)); // Bakiye * Fiyat (ondalıkları düzenle)
             // KMPS için bakiye 0 olduğu için valueTRY = 0 olacak, ama formül bu şekilde.
             // formattedValueTRY zaten "0.00" olarak ayarlandı, KMPS bakiyesi 0 olduğu için.
        } else if (!priceUSD_BN.isZero() && !usdToTryRate.isZero()) {
          // Değer USD = (Bakiye / 10^tokenDecimals) * (PriceUSD / 10^8)
          // Değer TRY = Değer USD * (usdToTryRate / 10^8)
          
          // priceUSD: 8 ondalıklı
          // usdToTryRate: 8 ondalıklı
          // balance: token.decimals ondalıklı

          const valueInUSD_BN = balance.mul(priceUSD_BN).div(ethers.utils.parseUnits("1", token.decimals)); // Sonuç 8 ondalıklı
          const valueInTRY_BN = valueInUSD_BN.mul(usdToTryRate).div(ethers.utils.parseUnits("1", 8)); // Sonuç 8 ondalıklı
          
          valueTRY_BN = valueInTRY_BN; // Toplam bakiye için BigNumber olarak sakla

          displayValueTRY = `${parseFloat(ethers.utils.formatUnits(valueInTRY_BN, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

          // Birim Fiyat TRY = (PriceUSD / 10^8) * (usdToTryRate / 10^8)
          const unitPriceTRY_BN = priceUSD_BN.mul(usdToTryRate).div(ethers.utils.parseUnits("1", 8)); // Sonuç 8 ondalıklı
          
          displayPriceUSD = priceUSD_BN.isZero() ? "N/A" : `1 ${token.symbol} ≈ ${parseFloat(ethers.utils.formatUnits(priceUSD_BN, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
          displayPriceTRY = unitPriceTRY_BN.isZero() || usdToTryRate.isZero() ? "N/A" : `1 ${token.symbol} ≈ ${parseFloat(ethers.utils.formatUnits(unitPriceTRY_BN, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
          console.log(`DEBUG_CALC (${token.symbol}): Balance: ${formattedBalance}, PriceUSD_BN: ${priceUSD_BN.toString()}, PriceTRY_BN: ${unitPriceTRY_BN.toString()}, ValueTRY_BN: ${valueTRY_BN.toString()}`);
          console.log(`DEBUG_CALC (${token.symbol}): Raw priceUSD_BN: ${priceUSD_BN.toString()}, Raw usdToTryRate: ${usdToTryRate.toString()}`);
          console.log(`DEBUG_CALC (${token.symbol}): Raw valueInUSD_BN: ${valueInUSD_BN.toString()}, Raw valueInTRY_BN: ${valueInTRY_BN.toString()}`);

        } else {
          // Fiyat bilgisi yoksa veya kur bilgisi yoksa
          valueTRY_BN = BigNumber.from(0);
          displayValueTRY = "0,00 TL"; // TR formatına uygun N/A durumu
          displayPriceUSD = priceUSD_BN.isZero() ? "N/A" : `1 ${token.symbol} ≈ ${parseFloat(ethers.utils.formatUnits(priceUSD_BN, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
          displayPriceTRY = (priceUSD_BN.isZero() || usdToTryRate.isZero()) ? "N/A" : "Fiyat Yok"; // N/A yerine daha açıklayıcı bir ifade veya 0,00 TL
           console.log(`DEBUG_CALC (${token.symbol}): Price or rate missing. PriceUSD_BN: ${priceUSD_BN.toString()}, PriceTRY_BN: ${displayPriceTRY}`);
        }
        
        // KMPS için özel ikon yolu, diğerleri Token arayüzünden geliyor
        const iconSource = token.symbol === 'KMPS' ? STATIC_KMPS_ICON : 
                           token.symbol === 'AVAX' ? AVAX_ICON :
                           token.symbol === 'WETH.e' ? ETH_ICON :
                           token.symbol === 'WBTC.e' ? BTC_ICON : 
                           null; // Fallback require('../icons/question-mark.png') yerine null

        newAssets.push({
          ...token,
          icon: iconSource, // Dinamik olarak ata
          balance: parseFloat(formattedBalance).toFixed(token.displayDecimals),
          valueTRY: displayValueTRY,
          priceTRY: displayPriceTRY,
          priceUSD: displayPriceUSD, // priceUSD'yi de ekleyelim
        });
        calculatedTotalBalanceTRY = calculatedTotalBalanceTRY.add(valueTRY_BN);
      }

      setDisplayedAssets(newAssets);
      // Toplam bakiyeyi TL olarak formatla (kuruşları da hesaba katarak)
      setTotalBalanceTRY(`${parseFloat(ethers.utils.formatUnits(calculatedTotalBalanceTRY, 8)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`);
      console.log("fetchAssetsData: Successfully fetched and processed assets.");
      console.log("DEBUG_TOTAL_BALANCE: Raw calculatedTotalBalanceTRY:", calculatedTotalBalanceTRY.toString());
      console.log("DEBUG_TOTAL_BALANCE: Formatted totalBalanceTRY:", parseFloat(ethers.utils.formatUnits(calculatedTotalBalanceTRY, 8)).toFixed(2));

    } catch (error) {
      console.error("fetchAssetsData: General error during asset fetching:", error);
      Alert.alert("Veri Hatası", "Varlık verileri alınırken bir sorun oluştu.");
      setDisplayedAssets([]);
      setTotalBalanceTRY('0,00 TL');
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setIsLoadingAssets(false);
      }
      console.log("fetchAssetsData: Finished.");
    }
  }, [currentProvider, walletAddress, activeNetwork, auth?.network]);

  const fetchTransactionHistory = useCallback(async () => {
    if (!walletAddress || !activeNetwork) {
      console.log("fetchTransactionHistory: walletAddress or activeNetwork is missing.");
      setTransactionHistory([]);
      return;
    }
    console.log(`Fetching transaction history for ${walletAddress} on ${activeNetwork.name}`);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setTransactionHistory([]); // Her yüklemede geçmişi temizle

    const isMainnet = activeNetwork.name === MainnetNetwork.name;
    const baseUrl = isMainnet ? 'https://api.snowtrace.io/api' : 'https://api-testnet.snowtrace.io/api';

    try {
      const txlistUrl = `${baseUrl}?module=account&action=txlist&address=${walletAddress}&page=1&offset=5&sort=desc`;
      const tokentxUrl = `${baseUrl}?module=account&action=tokentx&address=${walletAddress}&page=1&offset=5&sort=desc`;

      console.log("DEBUG_HISTORY: txlistUrl", txlistUrl);
      console.log("DEBUG_HISTORY: tokentxUrl", tokentxUrl);

      const txlistPromise = fetch(txlistUrl).then(res => res.json());
      const tokentxPromise = fetch(tokentxUrl).then(res => res.json());

      const [txlistResponse, tokentxResponse] = await Promise.all([txlistPromise, tokentxPromise]);

      console.log("DEBUG_HISTORY: txlistResponse status:", txlistResponse.status, "message:", txlistResponse.message);
      console.log("DEBUG_HISTORY: tokentxResponse status:", tokentxResponse.status, "message:", tokentxResponse.message);

      let combinedTransactions: Transaction[] = [];

      // Normal işlemleri işle
      if (txlistResponse.status === "1" && Array.isArray(txlistResponse.result)) {
        const normalTransactions: Transaction[] = txlistResponse.result.map((tx: any) => {
          const valInAvax = ethers.utils.formatEther(tx.value);
          let type: Transaction['type'] = 'contract_call'; // Varsayılan
          if (tx.from.toLowerCase() === walletAddress.toLowerCase() && tx.to.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'self';
          } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'send';
          } else if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'receive';
          }
          return {
            hash: tx.hash,
            type: type,
            from: tx.from,
            to: tx.to,
            value: `${parseFloat(valInAvax).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} AVAX`,
            timestamp: parseInt(tx.timeStamp),
            dateString: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            isError: tx.isError === "1",
            blockNumber: tx.blockNumber,
          };
        });
        combinedTransactions.push(...normalTransactions);
      } else if (txlistResponse.status === "0" && txlistResponse.message === "No transactions found") {
        console.log("DEBUG_HISTORY: No normal transactions found.");
      } else if (txlistResponse.status === "0") {
        console.warn("DEBUG_HISTORY: Error fetching normal transactions:", txlistResponse.message);
        // Belki kullanıcıya bir mesaj göstermeli (historyError state'i üzerinden)
        // setHistoryError("Normal işlemler alınırken bir sorun oluştu: " + txlistResponse.message);
      }

      // ERC20 token transferlerini işle
      if (tokentxResponse.status === "1" && Array.isArray(tokentxResponse.result)) {
        const erc20Transactions: Transaction[] = tokentxResponse.result.map((tx: any) => {
          const tokenInfo = TOKENS.find(t => t.symbol.toLowerCase() === tx.tokenSymbol.toLowerCase());
          const decimals = tokenInfo ? tokenInfo.decimals : 18; // Varsayılan 18
          const valFormatted = ethers.utils.formatUnits(tx.value, decimals);
          let type: Transaction['type'] = 'contract_call'; // Varsayılan
          if (tx.from.toLowerCase() === walletAddress.toLowerCase() && tx.to.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'self';
          } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'send';
          } else if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
            type = 'receive';
          }
          return {
            hash: tx.hash,
            type: type,
            from: tx.from,
            to: tx.to,
            value: `${parseFloat(valFormatted).toLocaleString('tr-TR', { minimumFractionDigits: tokenInfo?.displayDecimals || 2, maximumFractionDigits: tokenInfo?.displayDecimals || 2 })} ${tx.tokenSymbol}`,
            timestamp: parseInt(tx.timeStamp),
            dateString: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            tokenSymbol: tx.tokenSymbol,
            blockNumber: tx.blockNumber,
            // isError genellikle tokentx'te bulunmaz, başarılı işlemleri listeler
          };
        });
        combinedTransactions.push(...erc20Transactions);
      } else if (tokentxResponse.status === "0" && tokentxResponse.message === "No transactions found") {
        console.log("DEBUG_HISTORY: No ERC20 transactions found.");
      } else if (tokentxResponse.status === "0") {
        console.warn("DEBUG_HISTORY: Error fetching ERC20 transactions:", tokentxResponse.message);
        // setHistoryError("Token işlemleri alınırken bir sorun oluştu: " + tokentxResponse.message);
      }

      // Birleştirilmiş işlemleri tarihe göre sırala (en yeni en üstte)
      combinedTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Son 5 işlemi al (veya daha azı varsa hepsi)
      const finalTransactions = combinedTransactions.slice(0, 5);

      if (finalTransactions.length > 0) {
        setTransactionHistory(finalTransactions);
      } else {
        console.log("DEBUG_HISTORY: No combined transactions to display after filtering.");
        // Eğer API'den hata mesajı gelmediyse ve liste boşsa, "İşlem yok" durumu
        if (txlistResponse.status === "1" && tokentxResponse.status === "1") {
            // İki API de başarılı ama sonuç yok
        } else if (txlistResponse.message !== "No transactions found" && tokentxResponse.message !== "No transactions found") {
            // Eğer her iki API de "No transactions found" dışında bir hata verdiyse error state'ini ayarla
            if(txlistResponse.status === "0" || tokentxResponse.status === "0") {
                 setHistoryError("İşlem geçmişi alınırken bir sorun oluştu.");
            }
        }
      }

    } catch (error: any) {
      console.error("Error fetching transaction history:", error);
      setHistoryError("İşlem geçmişi alınırken bir hata oluştu.");
      // Alert.alert("Geçmiş Hatası", "İşlem geçmişi alınırken bir sorun oluştu.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [walletAddress, activeNetwork]);

  const onRefresh = useCallback(async () => {
    console.log("Manual refresh triggered");
    setRefreshing(true);
    await Promise.all([
      fetchAssetsData(true),
      fetchTransactionHistory() // İşlem geçmişini de yenile
    ]);
    setRefreshing(false);
  }, [fetchAssetsData, fetchTransactionHistory]);

  useEffect(() => {
    if (currentSigner && walletAddress && activeNetwork && currentProvider) {
      fetchAssetsData(false);
      fetchTransactionHistory(); // İlk yüklemede işlem geçmişini de çek

      const intervalId = setInterval(() => {
        console.log("Automatic refresh triggered");
        fetchAssetsData(false);
        fetchTransactionHistory(); // Otomatik yenilemede geçmişi de çek
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, [currentSigner, walletAddress, activeNetwork, currentProvider, fetchAssetsData, fetchTransactionHistory]);

  const copyToClipboard = async () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      Alert.alert("Kopyalandı!", "Cüzdan adresi panoya kopyalandı.");
    }
  };

  const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => (
    <TouchableOpacity style={styles.actionButton}>
      <View style={styles.actionIconCircle}>
        <Image source={icon} style={styles.actionIcon} resizeMode="contain" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const AssetRow: React.FC<AssetRowProps> = ({ asset }) => {
    const renderIcon = () => {
      // asset.icon bir sayı (require sonucu) veya {uri: string} objesi ise Image göster
      if (typeof asset.icon === 'number' || (asset.icon && typeof (asset.icon as any).uri === 'string')) {
        return <Image source={asset.icon} style={styles.assetIcon} resizeMode="contain" />;
      }
      // Değilse (örn: null ise veya tanımsız bir ikon kaynağı ise), fallback olarak '?' metnini göster
      return (
        <View style={[styles.assetIcon, styles.fallbackIconContainer]}>
          <Text style={styles.fallbackIconText}>?</Text>
        </View>
      );
    };

    return (
      <View style={styles.assetRow}>
        {renderIcon()}
        <View style={styles.assetInfoContainer}> 
          <Text style={styles.assetName}>{asset.symbol}</Text>
          <Text style={styles.assetBalance}>
            <Text style={styles.assetBalanceAmount}>{asset.balance}</Text>{asset.symbol}
          </Text>
        </View>
        <View style={styles.assetValueContainer}> 
          <Text style={styles.assetValueTL}>{asset.valueTRY}</Text>
          <Text style={styles.assetPrice}>{asset.priceTRY}</Text>
        </View>
      </View>
    );
  };

  // Yeni TransactionRow bileşeni (AssetRow'a benzer)
  const TransactionRow: React.FC<{ item: Transaction }> = ({ item }) => {
    const isSender = item.from.toLowerCase() === walletAddress?.toLowerCase();
    const typeText = item.type === 'self' ? 'Kendine' : isSender ? 'Gönderildi' : 'Alındı';
    const interactionAddress = item.type === 'self' ? item.to : (isSender ? item.to : item.from);
    
    const shortInteractionAddress = interactionAddress 
      ? `${interactionAddress.substring(0,6)}...${interactionAddress.substring(interactionAddress.length - 4)}`
      : 'Adres Yok'; 

    const interactionText = item.type === 'self' ? 'Adres:' : (isSender ? 'Kime:' : 'Kimden:');

    // DEBUG BAŞLANGIÇ
    // console.log('Rendering TransactionRow with item:', JSON.stringify(item, null, 2));
    // console.log('Calculated typeText:', typeText, 'shortInteractionAddress:', shortInteractionAddress, 'interactionText:', interactionText);
    // console.log('item.value:', item.value, 'item.dateString:', item.dateString);
    // DEBUG SON

    return (
      <View style={styles.assetRow}> 
        <View style={styles.assetIcon}> 
          <Text style={{color: 'white', fontSize: 20}}>{isSender && item.type !== 'self' ? '↑' : item.type === 'self' ? '⇆' : '↓'}</Text>
        </View>
        <View style={styles.assetInfoContainer}>
          <Text style={styles.assetName}>{typeText}</Text>
          {/* <Text style={styles.assetBalance}>{interactionText} {shortInteractionAddress}</Text> */}
        </View>
        <View style={styles.assetValueContainer}>
          <Text style={styles.assetValueTL}>{item.value}</Text>
          {item.dateString && <Text style={styles.assetPrice}>{item.dateString}</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Üst Kısım: Ağ Bilgisi ve Adres */}
        <View style={styles.header}>
          <View style={styles.networkInfo}>
            <Image source={require('../icons/avalanche-logo.png')} style={styles.networkIcon} resizeMode="contain"/>
            <Text style={styles.networkName}>{auth?.network || 'Avalanche Mainnet'}</Text>
          </View>
          {shortAddress && (
            <TouchableOpacity style={styles.addressInfo} onPress={copyToClipboard}>
              <Text style={styles.addressText}>{shortAddress}</Text>
              <Image source={require('../icons/copy-icon.png')} style={styles.copyIcon} resizeMode="contain"/>
            </TouchableOpacity>
          )}
        </View>

        {/* Bakiye Alanı */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Anlık Varlığınız:</Text>
          {isLoadingAssets ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 5 }}/>
          ) : (
            <Text style={styles.balanceAmount}>{totalBalanceTRY}</Text>
          )}
        </View>

        {/* Hızlı İşlem Butonları */}
        <View style={styles.actionsContainer}>
          <ActionButton icon={require('../icons/send-icon.png')} label="Gönder" />
          <ActionButton icon={require('../icons/receive-icon.png')} label="Al" />
          <ActionButton icon={require('../icons/buy-icon.png')} label="Satın Al" />
          <ActionButton icon={require('../icons/food-icon.png')} label="Yemekhane" />
        </View>

        {/* Sekmeler: Varlıklar / NFTler */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Varlıklar' && styles.activeTab]}
            onPress={() => setActiveTab('Varlıklar')}
          >
            <Text style={[styles.tabText, activeTab === 'Varlıklar' && styles.activeTabText]}>Varlıklar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'NFTler' && styles.activeTab]}
            onPress={() => setActiveTab('NFTler')}
          >
            <Text style={[styles.tabText, activeTab === 'NFTler' && styles.activeTabText]}>NFTler</Text>
          </TouchableOpacity>
        </View>

        {/* İçerik Alanı: Seçili Sekmeye Göre */}
        {activeTab === 'Varlıklar' ? (
          <> 
            {isLoadingAssets && displayedAssets.length === 0 && !refreshing ? (
              <View style={styles.loadingContainerGeneric}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingTextGeneric}>Varlıklar Yükleniyor...</Text>
              </View>
            ) : displayedAssets.length > 0 ? (
              <View style={styles.assetListContainer}>
                {displayedAssets.map((asset) => (
                  <AssetRow key={asset.symbol} asset={asset} />
                ))}
              </View>
            ) : !isLoadingAssets && (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>Gösterilecek varlık bulunamadı.</Text>
                {!auth?.userPrivateKey && <Text style={styles.emptyStateHint}>Lütfen bir cüzdan oluşturun veya içe aktarın.</Text>}
              </View>
            )}

            {/* İşlem Geçmişi Bölümü */}
            <View style={styles.historySectionContainer}>
              <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
              {isLoadingHistory && transactionHistory.length === 0 ? (
                <View style={styles.loadingContainerGeneric}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingTextGeneric}>İşlem Geçmişi Yükleniyor...</Text>
                </View>
              ) : !isLoadingHistory && transactionHistory.length > 0 ? (
                <FlatList
                  data={transactionHistory}
                  renderItem={({ item }) => <TransactionRow item={item} />}
                  keyExtractor={(item) => item.hash + item.timestamp.toString()} // Daha benzersiz bir key
                  scrollEnabled={false} // Ana ScrollView içinde olduğu için
                />
              ) : !isLoadingHistory && historyError ? (
                 <View style={styles.emptyStateContainer}>
                    <Text style={styles.errorText}>{historyError}</Text>
                 </View>
              ) : !isLoadingHistory && (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>İşlem geçmişiniz bulunmamaktadır.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.nftListContainer}>
            <Text>NFT Listesi Burada Gösterilecek</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: { 
    flex: 1,
    backgroundColor: '#242038', // Arka plan rengi eklendi/teyit edildi
  },
  scrollView: { 
    flex: 1, // SafeAreaView içinde esnemesi için
  },
  container: { // Bu stil artık safeAreaContainer tarafından kullanılıyor, gerekirse adı değiştirilebilir veya kaldırılabilir.
    flex: 1,
    backgroundColor: '#242038', // Ana arka plan rengi Figma'dan
  },
  contentContainer: {
    paddingBottom: 20, // Scrollview içeriği için altta boşluk
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10, // Biraz azaltıldı
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  networkName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginRight: 5,
  },
  copyIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#725AC1', 
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  balanceLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 5,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#725AC1', // Figma'daki ikon daire rengi
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#3A3557', // Figma'daki tab arka planı
    borderRadius: 9,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#725AC1', // Figma'daki aktif tab rengi
    borderRadius: 9, // Köşeleri tam oturması için
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  assetListContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  nftListContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200, // İçerik olmadığında da bir yükseklik olsun
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3557', 
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  assetIcon: {
    width: 40,
    height: 40,
    marginRight: 12, // Biraz boşluk ayarlandı
  },
  assetInfoContainer: { // Eski assetInfo
    flex: 1, // Genişlemesi için
    justifyContent: 'center',
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 16, 
    fontWeight: '600',
  },
  assetBalance: {
    color: '#A09DAE', 
    fontSize: 13, // Font boyutu küçültüldü
    marginTop: 2,
  },
  assetBalanceAmount: { // Miktar için bold stil
    fontWeight: 'bold',
    color: '#FFFFFF', // Miktarın rengi daha belirgin olabilir
  },
  assetValueContainer: { // Eski assetValue
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  assetValueTL: {
    color: '#FFFFFF',
    fontSize: 15, 
    fontWeight: '600',
  },
  assetPrice: {
    color: '#A09DAE',
    fontSize: 11, // Font boyutu küçültüldü
    marginTop: 2, 
  },
  fabButton: { 
    position: 'absolute',
    right: 25,
    bottom: 25, // Tab bar yüksekliği ve diğer elemanlara göre ayarlanmalı
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#725AC1', // Figma'daki renk
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: { 
    width: 32, // İkon boyutuna göre ayarla
    height: 32,
    tintColor: '#FFFFFF',
  },
  fallbackIconContainer: {
    backgroundColor: '#3A3557',
    justifyContent: 'center',
    alignItems: 'center',
    // borderRadius: 20, // assetIcon zaten width/height ve marginRight içeriyor, bu direkt onu kullanıyor
  },
  fallbackIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainerGeneric: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingTextGeneric: {
    marginTop: 10,
    color: '#A09DAE',
    fontSize: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 10,
  },
  emptyStateHint: {
    color: '#A09DAE',
    fontSize: 14,
  },
  historySectionContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default WalletScreen; 