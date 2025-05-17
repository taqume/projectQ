import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

// Navigasyon ve diğer tipler
export type EnterPasswordScreenProps = {
  // navigation prop'u RootNavigator'dan gelmiyor, doğrudan kullanılıyor.
  // Bu ekranın navigasyon stack'inin bir parçası olup olmayacağına göre tipi değişir.
  // Şimdilik AuthContext ile yönetildiği için doğrudan navigasyon prop'u almayabilir.
  onAuthSuccess: (privateKey: string) => void; 
  // Farklı cüzdana gitme talebini RootNavigator'a bildirmek için bir callback eklenebilir.
  onRequestSwitchToAuthFlow: () => void;
};

const WALLET_STORAGE_KEY = 'currentUserWallet';

const EnterPasswordScreen: React.FC<EnterPasswordScreenProps> = ({ onAuthSuccess, onRequestSwitchToAuthFlow }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Bu ekran sadece cüzdan varsa gösterileceği için hasWallet kontrolü burada gereksiz olabilir,
  // bu mantık AuthProvider'da zaten var.

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const credentials = await Keychain.getGenericPassword({ service: WALLET_STORAGE_KEY });
      if (credentials && credentials.password) {
        const encryptedBundleString = credentials.password; // Bu artık JSON string'i olmalı
        try {
          const storedBundle = JSON.parse(encryptedBundleString);
          if (storedBundle && storedBundle.encryptedPrivateKey) {
            const decryptedPrivateKeyBytes = CryptoJS.AES.decrypt(storedBundle.encryptedPrivateKey, password);
            const plainPrivateKey = decryptedPrivateKeyBytes.toString(CryptoJS.enc.Utf8);

            if (plainPrivateKey) {
              new ethers.Wallet(plainPrivateKey); 
              onAuthSuccess(plainPrivateKey); 
            } else {
              // toString(Utf8) boş string dönerse şifre yanlıştır
              setError('Girilen şifre yanlış. Lütfen tekrar deneyin.');
            }
          } else {
            setError('Şifrelenmiş özel anahtar cüzdan verisinde bulunamadı.');
          }
        } catch (e: any) {
          if (e instanceof SyntaxError) { // JSON.parse hatası
            console.error("Anahtarlık veri okuma hatası (JSON parse):", e);
            setError('Kaydedilmiş cüzdan verisi bozuk. Yeni cüzdan oluşturun veya içe aktarın.');
          } else { // CryptoJS.AES.decrypt veya ethers.Wallet hatası
            console.error("Şifre çözme/doğrulama hatası:", e);
            setError(`Şifre çözme hatası: ${e.message || 'Bilinmeyen bir hata oluştu.'} Veri bozuk olabilir veya şifre yanlıştır.`);
          }
        }
      } else {
        setError('Kaydedilmiş cüzdan bulunamadı. Lütfen yeni bir cüzdan oluşturun veya içe aktarın.');
      }
    } catch (e) {
      console.error("Giriş genel hatası:", e);
      setError('Giriş sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cüzdan Şifrenizi Girin</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#A09DAE"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.buttonContainer}>
          <Button title={isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"} onPress={handleLogin} disabled={isLoading} />
        </View>
        <TouchableOpacity onPress={onRequestSwitchToAuthFlow} style={styles.differentWalletButton}>
            <Text style={styles.differentWalletText}>Farklı bir cüzdan kullan veya yeni oluştur</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242038',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    width: '100%',
    backgroundColor: '#3A3557',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
  loadingText: {
      marginTop: 10,
      color: '#A09DAE',
      fontSize: 16,
  },
  differentWalletButton: {
      marginTop: 20,
      padding: 10,
  },
  differentWalletText: {
      color: '#725AC1',
      fontSize: 15,
      textDecorationLine: 'underline',
  }
});

export default EnterPasswordScreen; 