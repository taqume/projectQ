import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AppNavigator from './AppNavigator'; // Ana uygulama (tablar)
import AuthNavigator from './AuthNavigator'; // Giriş/kayıt ekranları
import EnterPasswordScreen from '../screens/auth/EnterPasswordScreen';

const WALLET_STORAGE_KEY = 'currentUserWallet';

// AuthContext oluşturuluyor
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userPrivateKey: string | null; // Giriş başarılı olduğunda özel anahtarı saklamak için
  network: string | null; // Eklendi: Aktif ağ (örn: 'Avalanche Mainnet', 'Fuji Testnet')
  walletAddress: string | null; // EKLENDİ: Aktif cüzdan adresi
  login: (privateKey: string, networkName?: string) => void; // networkName eklendi
  logout: () => void;
  setNetwork: (network: string) => void; // Eklendi: Ağı değiştirmek için fonksiyon
  setWalletAddress: (address: string | null) => void; // EKLENDİ: Cüzdan adresini ayarlamak için
  // Şifre değiştirme için eklenecekler
  setDecryptedDataForPasswordChange: (privateKey: string, mnemonic: string | null) => void;
  getDecryptedDataForPasswordChange: () => { privateKeyForChange: string | null, mnemonicForChange: string | null };
  clearDecryptedDataForPasswordChange: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPrivateKey, setUserPrivateKey] = useState<string | null>(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string | null>(null); // EKLENDİ
  const [requiresPasswordEntry, setRequiresPasswordEntry] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>('Avalanche Mainnet'); // Eklendi
  // Şifre değiştirme için state'ler
  const [decryptedPrivateKeyForPChange, setDecryptedPrivateKeyForPChange] = useState<string | null>(null);
  const [decryptedMnemonicForPChange, setDecryptedMnemonicForPChange] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const credentials = await Keychain.getGenericPassword({ service: WALLET_STORAGE_KEY });
        if (credentials) {
          // Cüzdan var, şifre sorma ekranını göster
          setRequiresPasswordEntry(true);
          setIsAuthenticated(false); // Şifre girilene kadar authenticated değil
        } else {
          // Cüzdan yok, AuthNavigator'a yönlendir
          setIsAuthenticated(false);
          setRequiresPasswordEntry(false);
        }
      } catch (error) {
        console.error('Keychain check failed', error);
        setIsAuthenticated(false);
        setRequiresPasswordEntry(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthState();
  }, []);

  const login = (privateKey: string, networkName: string = 'Avalanche Mainnet') => {
    setUserPrivateKey(privateKey);
    setCurrentNetwork(networkName); // Ağ ayarlandı
    // Cüzdan adresi privateKey'den türetilip burada set edilebilir veya 
    // WalletScreen'de signer oluşturulduğunda set edilebilir.
    // Şimdilik WalletScreen'in set etmesine izin veriyoruz.
    // WalletScreen'de signer oluşturulduğunda setWalletAddress çağrılacak.
    setIsAuthenticated(true);
    setRequiresPasswordEntry(false); // Şifre girildi, artık bu ekrana gerek yok
  };

  const logout = async () => {
    try {
      await Keychain.resetGenericPassword({ service: WALLET_STORAGE_KEY });
      setUserPrivateKey(null);
      setCurrentWalletAddress(null); // EKLENDİ: Cüzdan adresi de sıfırlanmalı
      setCurrentNetwork('Avalanche Mainnet'); // Varsayılana dön veya null yap
      setIsAuthenticated(false);
      setRequiresPasswordEntry(false); // Tekrar AuthNavigator'a yönlendir
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const setNetwork = (network: string) => {
    setCurrentNetwork(network);
    // Burada ağ değiştiğinde cüzdan verilerini yeniden yüklemek gibi ek işlemler gerekebilir.
  };

  const setWalletAddressAuth = (address: string | null) => { // EKLENDİ: Yeni fonksiyon
    setCurrentWalletAddress(address);
  };

  const switchToAuthFlow = () => {
    setIsAuthenticated(false);
    setRequiresPasswordEntry(false); // Bu da AuthNavigator'ı tetikler
    // Keychain'deki veriyi silmiyoruz, kullanıcı şifresini unutmuş olabilir,
    // yeni cüzdan oluşturabilir veya eskisini içe aktarabilir.
    // Eğer çıkış yaparsa `logout` çağrılır ve o zaman silinir.
  };
  
  // Şifre değiştirme fonksiyonları
  const setDecryptedData = (privateKey: string, mnemonic: string | null) => {
    setDecryptedPrivateKeyForPChange(privateKey);
    setDecryptedMnemonicForPChange(mnemonic);
  };

  const getDecryptedData = () => {
    return {
      privateKeyForChange: decryptedPrivateKeyForPChange,
      mnemonicForChange: decryptedMnemonicForPChange,
    };
  };

  const clearDecryptedData = () => {
    setDecryptedPrivateKeyForPChange(null);
    setDecryptedMnemonicForPChange(null);
  };
  
  const authContextValue = useMemo(() => ({
    isAuthenticated,
    isLoading,
    userPrivateKey,
    network: currentNetwork, // Değişti: network -> currentNetwork
    walletAddress: currentWalletAddress, // EKLENDİ
    login,
    logout,
    setNetwork, // Eklendi
    setWalletAddress: setWalletAddressAuth, // EKLENDİ
    // Şifre değiştirme fonksiyonlarını context'e ekle
    setDecryptedDataForPasswordChange: setDecryptedData,
    getDecryptedDataForPasswordChange: getDecryptedData,
    clearDecryptedDataForPasswordChange: clearDecryptedData,
  }), [
    isAuthenticated, 
    isLoading, 
    userPrivateKey, 
    currentNetwork, 
    currentWalletAddress,
    decryptedPrivateKeyForPChange, // Bağımlılıklara eklendi
    decryptedMnemonicForPChange    // Bağımlılıklara eklendi
  ]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Uygulama Yükleniyor...</Text>
      </View>
    );
  }

  if (requiresPasswordEntry && !isAuthenticated) {
    return <EnterPasswordScreen 
      onAuthSuccess={(pk: string) => login(pk)} 
      onRequestSwitchToAuthFlow={switchToAuthFlow}
    />;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </AuthContext.Provider>
  );
};

// App.tsx'de AuthProvider ile sarmalanacak ana bileşen
const RootNavigator = () => {
  return <AuthProvider><ActualApp /></AuthProvider>; 
};

// AuthProvider'dan sonra gelen gerçek uygulama mantığı için bir ara bileşen
// Bu, useAuth() çağrılarının AuthProvider kapsamında yapılmasını sağlar.
const ActualApp = () => {
    const { isAuthenticated, isLoading } = useAuthInternal();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }
    // EnterPasswordScreen durumu AuthProvider içinde ele alınıyor.
    return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
};

// Hook'u AuthProvider'ın altındaki bileşenler için ayıralım
const useAuthInternal = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthInternal must be used within an AuthProvider');
    }
    return context;
};


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#242038',
  },
  loadingText: {
      marginTop: 10,
      color: '#A09DAE',
      fontSize: 16,
  }
});

export default RootNavigator; 