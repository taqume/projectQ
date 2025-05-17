import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView, Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { useAuth } from '../../navigation/RootNavigator';

// Navigasyon ve route tipleri
type SetPasswordScreenProps = {
  navigation: any; // StackNavigationProp<AuthStackParamList, 'SetPassword'>
  route: any; // RouteProp<AuthStackParamList, 'SetPassword'>
};

const WALLET_STORAGE_KEY = 'currentUserWallet';
const KEYCHAIN_USERNAME = 'walletBundle'; // Keychain için sabit username

const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ navigation, route }) => {
  const { mnemonic, privateKey: importedPrivateKey } = route.params; // privateKey burada importedPrivateKey olarak adlandırılmış.
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();

  const handleSetPassword = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor. Lütfen kontrol edin.');
      return;
    }

    setIsLoading(true);
    try {
      let plainPrivateKey;
      // Eğer ImportWalletScreen'den mnemonic ile birlikte privateKey de gönderildiyse,
      // importedPrivateKey dolu olacaktır. Onu kullanalım.
      if (mnemonic && importedPrivateKey) {
        plainPrivateKey = importedPrivateKey;
        // Mnemonic varlığını da kontrol ederek (zaten SetPassword'e gönderiliyor),
        // şifreleme sırasında mnemonic'in de şifrelenmesini sağlayabiliriz.
      } else if (mnemonic) { // Sadece mnemonic varsa (eski akış veya direkt privateKey yollanmadıysa)
        const wallet = ethers.Wallet.fromMnemonic(mnemonic);
        plainPrivateKey = wallet.privateKey;
      } else if (importedPrivateKey) { // Sadece özel anahtar varsa (normal içe aktarma)
        try {
            new ethers.Wallet(importedPrivateKey);
            plainPrivateKey = importedPrivateKey;
        } catch (e) {
            setError('Geçersiz özel anahtar. Lütfen kontrol edin.');
            setIsLoading(false);
            return;
        }
      } else {
        setError('Cüzdan bilgisi bulunamadı.');
        setIsLoading(false);
        return;
      }

      // Önceki cüzdan bilgilerini sil (aynı servis ve username ile üzerine yazılacak ama yine de iyi bir pratik)
      await Keychain.resetGenericPassword({ service: WALLET_STORAGE_KEY });

      // Özel anahtarı ve varsa mnemonic'i kullanıcının girdiği şifre ile AES kullanarak şifrele
      const encryptedPrivateKey = CryptoJS.AES.encrypt(plainPrivateKey, password).toString();
      const encryptedMnemonic = mnemonic ? CryptoJS.AES.encrypt(mnemonic, password).toString() : null;

      const dataToStore = {
        encryptedPrivateKey,
        encryptedMnemonic,
      };

      await Keychain.setGenericPassword(
        KEYCHAIN_USERNAME, // Sabit bir username
        JSON.stringify(dataToStore), // Şifrelenmiş verileri içeren JSON string'i
        { service: WALLET_STORAGE_KEY }
      );
        
      Alert.alert(
        'Başarılı!',
        'Cüzdanınız başarıyla kuruldu ve şifreniz ayarlandı.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              auth.login(plainPrivateKey);
            }
          }
        ]
      );

    } catch (e) {
      console.error("Şifre ayarlama hatası:", e);
      setError('Cüzdan kurulumunda bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Güvenlik Şifresi Oluşturun</Text>
        <Text style={styles.instructions}>
          Cüzdanınıza hızlı erişim için bir şifre belirleyin. Bu şifre, özel anahtarınızı telefonunuzda şifreleyerek koruyacaktır.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Şifre (en az 6 karakter)"
          placeholderTextColor="#A09DAE"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Şifreyi Tekrar Girin"
          placeholderTextColor="#A09DAE"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <View style={styles.buttonContainer}>
          <Button 
            title={isLoading ? "Ayarlanıyor..." : "Şifreyi Ayarla ve Cüzdanı Kaydet"} 
            onPress={handleSetPassword} 
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
    marginBottom: 15,
  },
  instructions: {
    fontSize: 16,
    color: '#A09DAE',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    backgroundColor: '#3A3557',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 15,
  },
});

export default SetPasswordScreen; 