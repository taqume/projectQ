import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Alert, Modal, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/RootNavigator';
import { MainnetNetwork, FujiNetwork, SUPPORTED_NETWORKS } from '../constants/networks';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';
import Clipboard from '@react-native-clipboard/clipboard';

const WALLET_STORAGE_KEY = 'currentUserWallet';
const KEYCHAIN_USERNAME = 'walletBundle';

const SettingsScreen = () => {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  // Ortak Modal State'leri (Özel Anahtar ve Mnemonic için)
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoPasswordInput, setInfoPasswordInput] = useState('');
  const [retrievedInfo, setRetrievedInfo] = useState<string | null>(null);
  const [infoModalError, setInfoModalError] = useState<string | null>(null);
  const [infoTypeToRetrieve, setInfoTypeToRetrieve] = useState<'privateKey' | 'mnemonic' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [retrievedDataLabel, setRetrievedDataLabel] = useState('');

  // Şifre Değiştirme Modal State'leri
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeStep, setPasswordChangeStep] = useState(1);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  const handleLogout = async () => {
    await auth.logout();
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordChangeStep(1);
    setPasswordChangeError(null);
  };

  const handleChangeNetwork = (newNetworkName: string) => {
    if (auth.network === newNetworkName) {
      return;
    }
    auth.setNetwork(newNetworkName);
    Alert.alert("Ağ Değiştirildi", `${newNetworkName} ağına geçildi.`);
  };

  const currentNetworkName = auth.network || MainnetNetwork.name;

  // Bilgi Görüntüleme (Özel Anahtar / Mnemonic) Fonksiyonları
  const openInfoModal = (type: 'privateKey' | 'mnemonic') => {
    setInfoTypeToRetrieve(type);
    setShowInfoModal(true);
    setInfoPasswordInput('');
    setRetrievedInfo(null);
    setInfoModalError(null);
    if (type === 'privateKey') {
      setModalTitle('Özel Anahtarınızı Görüntüleyin');
      setRetrievedDataLabel('Özel Anahtarınız:');
    } else if (type === 'mnemonic') {
      setModalTitle('12 Kelimenizi (Mnemonic) Görüntüleyin');
      setRetrievedDataLabel('12 Kelimeniz (Mnemonic):');
    }
  };

  const handleRetrieveInfo = async () => {
    if (!infoPasswordInput) {
      setInfoModalError('Lütfen şifrenizi girin.');
      return;
    }
    setInfoModalError(null);
    setRetrievedInfo(null);
    try {
      const credentials = await Keychain.getGenericPassword({ service: WALLET_STORAGE_KEY });
      
      if (credentials && credentials.username === KEYCHAIN_USERNAME && credentials.password) {
        const storedBundle = JSON.parse(credentials.password);
        let dataToDisplay: string | null = null;

        if (infoTypeToRetrieve === 'privateKey' && storedBundle.encryptedPrivateKey) {
          try {
            const decryptedBytes = CryptoJS.AES.decrypt(storedBundle.encryptedPrivateKey, infoPasswordInput);
            dataToDisplay = decryptedBytes.toString(CryptoJS.enc.Utf8);
            if (!dataToDisplay) {
              setInfoModalError('Girilen şifre yanlış. Lütfen tekrar deneyin.');
              return;
            }
          } catch (err: any) {
            console.error("Özel anahtar şifre çözme hatası:", err);
            setInfoModalError(`Şifre çözme hatası: ${err.message || 'Bilinmeyen bir hata oluştu.'} Veri bozuk olabilir.`);
            return;
          }
        } else if (infoTypeToRetrieve === 'mnemonic') {
          if (storedBundle.encryptedMnemonic) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(storedBundle.encryptedMnemonic, infoPasswordInput);
              dataToDisplay = decryptedBytes.toString(CryptoJS.enc.Utf8);
              if (!dataToDisplay) {
                setInfoModalError('Girilen şifre yanlış. Lütfen tekrar deneyin.');
                return;
              }
            } catch (err: any) {
              console.error("Mnemonic şifre çözme hatası:", err);
              setInfoModalError(`Şifre çözme hatası: ${err.message || 'Bilinmeyen bir hata oluştu.'} Veri bozuk olabilir.`);
              return;
            }
          } else {
            setInfoModalError('Bu cüzdan için kayıtlı 12 kelime bulunmamaktadır.');
            return;
          }
        }

        if (dataToDisplay) {
          setRetrievedInfo(dataToDisplay);
        } else {
          setInfoModalError('Şifre yanlış veya istenen veri cüzdan kaydında bulunmuyor/bozuk.');
        }
      } else {
        setInfoModalError('Kaydedilmiş cüzdan verisi bulunamadı veya formatı yanlış.');
      }
    } catch (e) {
      console.error("Bilgi alma hatası:", e);
      setInfoModalError('Bilgi alınırken bir hata oluştu.');
    }
  };

  // Şifre Değiştirme Fonksiyonları
  const openPasswordChangeModal = () => {
    setShowPasswordChangeModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordChangeStep(1);
    setPasswordChangeError(null);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      setPasswordChangeError('Lütfen mevcut şifrenizi girin.');
      return;
    }
    setPasswordChangeError(null);
    try {
      const credentials = await Keychain.getGenericPassword({ service: WALLET_STORAGE_KEY });
      if (credentials && credentials.username === KEYCHAIN_USERNAME && credentials.password) {
        const storedBundle = JSON.parse(credentials.password);
        if (storedBundle.encryptedPrivateKey) {
            try {
                const decryptedBytes = CryptoJS.AES.decrypt(storedBundle.encryptedPrivateKey, currentPassword);
                const plainPrivateKey = decryptedBytes.toString(CryptoJS.enc.Utf8);
                
                if (plainPrivateKey) {
                    let plainMnemonic: string | null = null;
                    if (storedBundle.encryptedMnemonic) {
                        try {
                            const decryptedMnemonicBytes = CryptoJS.AES.decrypt(storedBundle.encryptedMnemonic, currentPassword);
                            plainMnemonic = decryptedMnemonicBytes.toString(CryptoJS.enc.Utf8);
                            if (!plainMnemonic && storedBundle.encryptedMnemonic) { 
                                console.warn("Mevcut şifre ile mnemonic çözülemedi (boş sonuç), ancak özel anahtar çözüldü. Devam ediliyor.");
                            }
                        } catch (mnemonicErr: any) {
                            console.warn(`Mnemonic şifre çözme sırasında hata (devam ediliyor): ${mnemonicErr.message}`);
                            plainMnemonic = null;
                        }
                    }
                    auth.setDecryptedDataForPasswordChange(plainPrivateKey, plainMnemonic);
                    setPasswordChangeStep(2); 
                    setCurrentPassword(''); 
                } else {
                    setPasswordChangeError('Mevcut şifreniz yanlış.');
                }
            } catch (err: any) {
                console.error("Mevcut şifre doğrulama (özel anahtar çözme) hatası:", err);
                setPasswordChangeError(`Şifre çözme hatası: ${err.message || 'Bilinmeyen bir hata oluştu.'} Veri bozuk olabilir veya şifre yanlış.`);
            }
        } else {
            setPasswordChangeError('Şifrelenmiş özel anahtar bulunamadı.');
        }
      } else {
        setPasswordChangeError('Kaydedilmiş cüzdan verisi bulunamadı veya formatı yanlış.');
      }
    } catch (e) {
      console.error("Mevcut şifre doğrulama hatası:", e);
      setPasswordChangeError('Şifre doğrulanırken bir hata oluştu.');
    }
  };

  const handleConfirmNewPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordChangeError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('Yeni şifreler eşleşmiyor.');
      return;
    }
    setPasswordChangeError(null);

    // AuthContext'ten çözülmüş verileri al
    const { privateKeyForChange, mnemonicForChange } = auth.getDecryptedDataForPasswordChange();

    if (!privateKeyForChange) { // Sadece özel anahtarın varlığını kontrol etmemiz yeterli
        setPasswordChangeError('Önceki adımdan cüzdan verileri alınamadı. Lütfen tekrar başlayın.');
        setPasswordChangeStep(1); 
        auth.clearDecryptedDataForPasswordChange(); // Context'i temizle
        return;
    }
    setPasswordChangeError(null);

    try {
      const newEncryptedPrivateKey = CryptoJS.AES.encrypt(privateKeyForChange, newPassword).toString();
      const newEncryptedMnemonic = mnemonicForChange ? CryptoJS.AES.encrypt(mnemonicForChange, newPassword).toString() : null;

      const newDataToStore = {
        encryptedPrivateKey: newEncryptedPrivateKey,
        encryptedMnemonic: newEncryptedMnemonic,
      };

      // await Keychain.setGenericPassword('walletData', newEncryptedPrivateKey, { service: WALLET_STORAGE_KEY, username: KEYCHAIN_USERNAME }); // Hatalı ve eksik
      await Keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(newDataToStore), { service: WALLET_STORAGE_KEY });
      
      Alert.alert('Başarılı', 'Güvenlik şifreniz başarıyla değiştirildi.');
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordChangeStep(1);
      auth.clearDecryptedDataForPasswordChange(); // Context'i temizle

    } catch (e) {
      console.error("Yeni şifre ayarlama hatası:", e);
      setPasswordChangeError('Şifre güncellenirken bir hata oluştu.');
      auth.clearDecryptedDataForPasswordChange(); // Hata durumunda da context'i temizle
    }
  };

  const copyToClipboard = (data: string, type: string) => {
    Clipboard.setString(data);
    Alert.alert("Kopyalandı!", `${type} panoya kopyalandı.`);
  };

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Ayarlar</Text>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Ağ Ayarları</Text>
            <View style={styles.networkSelectionContainer}>
              <TouchableOpacity 
                style={[styles.networkButton, currentNetworkName === MainnetNetwork.name && styles.activeNetworkButton]}
                onPress={() => handleChangeNetwork(MainnetNetwork.name)}>
                <Text style={[styles.networkButtonText, currentNetworkName === MainnetNetwork.name && styles.activeNetworkButtonText]}>
                  Mainnet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.networkButton, currentNetworkName === FujiNetwork.name && styles.activeNetworkButton]}
                onPress={() => handleChangeNetwork(FujiNetwork.name)}>
                <Text style={[styles.networkButtonText, currentNetworkName === FujiNetwork.name && styles.activeNetworkButtonText]}>
                  Fuji Testnet
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Güvenlik ve Gizlilik</Text>
            <TouchableOpacity style={styles.settingItem} onPress={() => openInfoModal('privateKey')}>
              <Text style={styles.settingTextButton}>Özel Anahtarı Görüntüle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => openInfoModal('mnemonic')}>
              <Text style={styles.settingTextButton}>12 Kelimeyi (Mnemonic) Görüntüle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={openPasswordChangeModal}>
              <Text style={styles.settingTextButton}>Şifreyi Değiştir</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logoutButtonContainer}>
            <Button title="Cüzdandan Çıkış Yap" onPress={handleLogout} color="#FF6B6B"/>
          </View>
        </View>
      </ScrollView>

      {/* Bilgi Görüntüleme (Özel Anahtar/Mnemonic) Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showInfoModal}
        onRequestClose={() => {
          setShowInfoModal(false);
          setRetrievedInfo(null);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Güvenlik Şifreniz"
              placeholderTextColor="#A09DAE"
              secureTextEntry
              value={infoPasswordInput}
              onChangeText={setInfoPasswordInput}
            />
            {infoModalError && <Text style={styles.modalErrorText}>{infoModalError}</Text>}
            {retrievedInfo && (
              <View style={styles.retrievedDataContainer}>
                <Text style={styles.retrievedDataTitle}>{retrievedDataLabel}</Text>
                <Text selectable style={styles.retrievedDataText}>{retrievedInfo}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(retrievedInfo!, infoTypeToRetrieve === 'privateKey' ? 'Özel Anahtar' : '12 Kelime')}>
                    <Text style={styles.copyButtonText}>Kopyala</Text>
                </TouchableOpacity>
              </View>
            )}
            {!retrievedInfo && (
                <Button title="Onayla ve Görüntüle" onPress={handleRetrieveInfo} />
            )}
            <View style={{ marginTop: 10 }}>
                <Button title="Kapat" onPress={() => setShowInfoModal(false)} color="#888" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Şifre Değiştirme Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordChangeModal}
        onRequestClose={() => {
          setShowPasswordChangeModal(false);
          setPasswordChangeStep(1);
          setPasswordChangeError(null);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {passwordChangeStep === 1 && (
              <>
                <Text style={styles.modalTitle}>Mevcut Şifrenizi Girin</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Mevcut Şifre"
                  placeholderTextColor="#A09DAE"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                {passwordChangeError && <Text style={styles.modalErrorText}>{passwordChangeError}</Text>}
                <Button title="Doğrula" onPress={handleVerifyCurrentPassword} />
              </>
            )}
            {passwordChangeStep === 2 && (
              <>
                <Text style={styles.modalTitle}>Yeni Şifre Belirleyin</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Yeni Şifre (en az 6 karakter)"
                  placeholderTextColor="#A09DAE"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Yeni Şifreyi Tekrar Girin"
                  placeholderTextColor="#A09DAE"
                  secureTextEntry
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                />
                {passwordChangeError && <Text style={styles.modalErrorText}>{passwordChangeError}</Text>}
                <Button title="Yeni Şifreyi Kaydet" onPress={handleConfirmNewPassword} />
              </>
            )}
            <View style={{ marginTop: 15 }}>
              <Button title="İptal" onPress={() => setShowPasswordChangeModal(false)} color="#888" />
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: { 
    flex: 1,
    backgroundColor: '#242038',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CAC4D0',
    marginBottom: 15,
  },
  networkSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#3A3557',
    borderRadius: 8,
    padding: 5,
  },
  networkButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNetworkButton: {
    backgroundColor: '#725AC1',
  },
  networkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activeNetworkButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingItem: {
    backgroundColor: '#3A3557',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingTextButton: {
    color: '#82AFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingLabel: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  settingInfoText: {
    color: '#A09DAE',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButtonContainer: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '90%',
    margin: 20,
    backgroundColor: "#2E2A47",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#3A3557',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#504A6D',
  },
  modalErrorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retrievedDataContainer: {
    marginTop: 15,
    marginBottom:15,
    padding: 10,
    backgroundColor: '#3A3557',
    borderRadius: 8,
    width:'100%',
    alignItems:'center'
  },
  retrievedDataTitle:{
      fontSize:16,
      fontWeight:'bold',
      color:'#FFFFFF',
      marginBottom:8
  },
  retrievedDataText: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom:10
  },
  copyButton: {
      backgroundColor: '#725AC1',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 5,
  },
  copyButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
  }
});

export default SettingsScreen; 