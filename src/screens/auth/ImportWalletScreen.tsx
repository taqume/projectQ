import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { ethers } from 'ethers';

// Navigasyon tipleri
type ImportWalletScreenProps = {
  navigation: any; // StackNavigationProp<AuthStackParamList, 'ImportWallet'>
};

const ImportWalletScreen: React.FC<ImportWalletScreenProps> = ({ navigation }) => {
  const [importType, setImportType] = useState<'mnemonic' | 'privateKey'>('mnemonic'); // 'mnemonic' or 'privateKey'
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    setIsLoading(true); // Yükleme başladı olarak işaretle

    // Yükleme mesajını import tipine göre ayarla
    if (importType === 'mnemonic') {
        setLoadingMessage('Kurtarma ifadeniz doğrulanıyor ve cüzdanınız içe aktarılıyor. Bu işlem yaklaşık 1 dakika sürebilir, lütfen bekleyin...');
    } else {
        setLoadingMessage('Özel anahtarınız doğrulanıyor...');
    }

    // UI'ın (isLoading ve loadingMessage state'leri) güncellenmesi için bir sonraki frame'i bekle
    // Ardından yoğun işlemi başlat
    requestAnimationFrame(async () => {
        if (inputValue.trim() === '') {
            setError(importType === 'mnemonic' ? 'Lütfen 12 kelimelik kurtarma ifadenizi girin.' : 'Lütfen özel anahtarınızı girin.');
            setIsLoading(false); // Yüklemeyi bitir
            setLoadingMessage(null); // Mesajı temizle
            return;
        }

        try {
            if (importType === 'mnemonic') {
                const words = inputValue.trim().split(' ');
                if (words.length !== 12) {
                    setError('Kurtarma ifadesi 12 kelimeden oluşmalıdır.');
                    setIsLoading(false); // Yüklemeyi bitir
                    setLoadingMessage(null); // Mesajı temizle
                    return;
                }
                console.log("Mnemonic validation started...");
                console.time("fromMnemonicDuration");
                const wallet = ethers.Wallet.fromMnemonic(inputValue.trim());
                console.timeEnd("fromMnemonicDuration");
                console.log("Mnemonic validation successful, private key retrieved.");
                navigation.navigate('SetPassword', { mnemonic: inputValue.trim(), privateKey: wallet.privateKey });
            } else { // privateKey import
                new ethers.Wallet(inputValue.trim()); // Validate private key
                navigation.navigate('SetPassword', { privateKey: inputValue.trim() });
            }
        } catch (e) {
            console.error("Cüzdan içe aktarma hatası:", e);
            setError(importType === 'mnemonic' ? 'Geçersiz kurtarma ifadesi. Lütfen kontrol edin.' : 'Geçersiz özel anahtar. Lütfen kontrol edin.');
            setIsLoading(false); // Hata durumunda yüklemeyi bitir
            setLoadingMessage(null); // Mesajı temizle
        }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Cüzdanı İçe Aktar</Text>
          
          <View style={styles.importTypeSelector}>
            <TouchableOpacity 
              style={[styles.typeButton, importType === 'mnemonic' && styles.activeTypeButton]}
              onPress={() => { setImportType('mnemonic'); setError(null); setInputValue(''); }}
            >
              <Text style={[styles.typeButtonText, importType === 'mnemonic' && styles.activeTypeText]}>12 Kelime İle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, importType === 'privateKey' && styles.activeTypeButton]}
              onPress={() => { setImportType('privateKey'); setError(null); setInputValue(''); }}
            >
              <Text style={[styles.typeButtonText, importType === 'privateKey' && styles.activeTypeText]}>Özel Anahtar İle</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            {importType === 'mnemonic' 
              ? 'Lütfen 12 kelimelik kurtarma ifadenizi boşluklarla ayırarak girin.' 
              : 'Lütfen özel anahtarınızı (private key) girin.'
            }
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {isLoading && loadingMessage && <Text style={styles.loadingMessageText}>{loadingMessage}</Text>}

          <TextInput
            style={styles.input}
            placeholder={importType === 'mnemonic' ? 'örn: kelime1 kelime2 ... kelime12' : 'örn: 0xabc...def'}
            placeholderTextColor="#A09DAE"
            multiline={importType === 'mnemonic'}
            numberOfLines={importType === 'mnemonic' ? 3 : 1}
            value={inputValue}
            onChangeText={setInputValue}
            autoCapitalize="none"
          />

          <View style={styles.buttonContainer}>
            <Button 
              title={isLoading ? "İçe Aktarılıyor..." : "Cüzdanı İçe Aktar"} 
              onPress={handleImport} 
              disabled={isLoading}
            />
          </View>
          <Button 
            title="Geri"
            onPress={() => navigation.goBack()}
            color="#A09DAE"
            disabled={isLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242038',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingVertical: 20, // ScrollView için içerik paddingi
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  importTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#3A3557',
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#725AC1',
  },
  typeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTypeText: {
    color: '#FFFFFF',
  },
  instructions: {
    fontSize: 16,
    color: '#A09DAE',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    backgroundColor: '#3A3557',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 20,
    textAlignVertical: 'top', // multiline için
    minHeight: 50,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingMessageText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
});

export default ImportWalletScreen; 