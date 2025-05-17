import React from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';

// Navigasyon tiplerini import edelim (daha sonra tanımlanacak)
type WelcomeScreenProps = {
  navigation: any; // Gerçek tip StackNavigationProp<AuthStackParamList, 'Welcome'> gibi olmalı
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Kripto Cüzdanına Hoş Geldiniz!</Text>
        <Text style={styles.subtitle}>Başlamak için bir seçenek belirleyin.</Text>
        <View style={styles.buttonContainer}>
          <Button 
            title="Yeni Cüzdan Oluştur" 
            onPress={() => navigation.navigate('CreateWalletWarning')} // Navigasyon ismi sonradan ayarlanacak
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button 
            title="Var Olan Cüzdanı İçe Aktar" 
            onPress={() => navigation.navigate('ImportWallet')} // Navigasyon ismi sonradan ayarlanacak
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242038', // Ana tema rengi
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#A09DAE',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
});

export default WelcomeScreen; 