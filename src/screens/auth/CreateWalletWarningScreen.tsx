import React from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';

// Navigasyon tipleri
type CreateWalletWarningScreenProps = {
  navigation: any; // StackNavigationProp<AuthStackParamList, 'CreateWalletWarning'>
};

const CreateWalletWarningScreen: React.FC<CreateWalletWarningScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Önemli Uyarı!</Text>
        <Text style={styles.warningText}>
          Şimdi size 12 kelimeden oluşan gizli kurtarma ifadeniz gösterilecektir.
          Bu kelimeler cüzdanınıza erişimin tek yoludur.
          Kaybederseniz varlıklarınıza bir daha ASLA erişemezsiniz.
        </Text>
        <Text style={styles.warningText}>
          Bu kelimeleri GÜVENLİ bir şekilde saklayın. Kimseyle paylaşmayın.
          Ekran görüntüsü almayın. Dijital ortamda (e-posta, bulut vb.) saklamayın.
          En güvenli yöntem, kağıda yazıp fiziksel olarak saklamaktır.
        </Text>
        <View style={styles.buttonContainer}>
          <Button 
            title="Anladım, Devam Et" 
            onPress={() => navigation.navigate('GenerateMnemonic')} // Navigasyon ismi sonradan ayarlanacak
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
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 25,
  },
  warningText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 15,
  },
});

export default CreateWalletWarningScreen; 