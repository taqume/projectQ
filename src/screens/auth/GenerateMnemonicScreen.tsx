import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard'; // Yeni import eklendi
import { ethers } from 'ethers';

// Navigasyon tipleri
type GenerateMnemonicScreenProps = {
  navigation: any; // StackNavigationProp<AuthStackParamList, 'GenerateMnemonic'>
  route: any; // Gerekirse parametre almak için: RouteProp<AuthStackParamList, 'GenerateMnemonic'>
};

const GenerateMnemonicScreen: React.FC<GenerateMnemonicScreenProps> = ({ navigation }) => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  useEffect(() => {
    // Ekran yüklendiğinde rastgele 12 kelime oluştur
    const wallet = ethers.Wallet.createRandom();
    setMnemonic(wallet.mnemonic!.phrase);
  }, []);

  const copyToClipboard = async () => {
    if (mnemonic) {
      Clipboard.setString(mnemonic);
      Alert.alert('Kopyalandı', 'Kurtarma kelimeleri panoya kopyalandı.');
    }
  };

  const proceedToVerify = () => {
    if (mnemonic) {
      // Kelimeleri doğrulama ekranına mnemonic ile birlikte gönder
      navigation.navigate('VerifyMnemonic', { mnemonic });
    }
  };

  if (!mnemonic) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Kelimeler oluşturuluyor...</Text>
      </SafeAreaView>
    );
  }

  const words = mnemonic.split(' ');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Gizli Kurtarma İfadeniz</Text>
        <Text style={styles.instructions}>
          Bu 12 kelimeyi doğru sırada ve güvenli bir yerde saklayın. Bir sonraki adımda doğrulamanız istenecektir.
        </Text>
        
        <View style={styles.mnemonicContainer}>
          {words.map((word, index) => (
            <View key={index} style={styles.wordBox}>
              <Text style={styles.wordNumber}>{index + 1}.</Text>
              <Text style={styles.wordText}>{word}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <Text style={styles.copyButtonText}>Kelimeleri Kopyala</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button 
            title="Devam Et (Doğrula)"
            onPress={proceedToVerify} 
          />
        </View>
        <Button 
          title="Geri"
          onPress={() => navigation.goBack()}
          color="#A09DAE"
        />
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
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  instructions: {
    fontSize: 16,
    color: '#A09DAE',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 10, // Kelime kutuları için iç boşluk
  },
  wordBox: {
    backgroundColor: '#3A3557',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '48%', // İki sütunlu görünüm için
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordNumber: {
    color: '#A09DAE',
    fontSize: 15,
    marginRight: 8,
  },
  wordText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  copyButton: {
    backgroundColor: '#725AC1',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 10,
  },
});

export default GenerateMnemonicScreen; 