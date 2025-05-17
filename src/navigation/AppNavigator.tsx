import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WalletScreen from '../screens/WalletScreen';
import NFTScreen from '../screens/NFTScreen';
import SwapScreen from '../screens/SwapScreen';
import SettingsScreen from '../screens/SettingsScreen';

// İkonları import edelim (doğru yolları ve isimleri kontrol edin)
// import WalletIcon from '../icons/wallet_icon.png'; // Örnek, kendi ikon adınıza göre güncelleyin
// import NftIcon from '../icons/nft_icon.png';
// import SwapIcon from '../icons/swap_icon.png';
// import SettingsIcon from '../icons/settings_icon.png';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          // Simdilik ikonlar yerine metin kullanalım, sonra Image ile değiştirilecek
          if (route.name === 'Cüzdan') {
            // iconName = focused ? 'wallet-active' : 'wallet-inactive';
            // return <Image source={WalletIcon} style={{ width: size, height: size, tintColor: color }} />;
            return <Image source={require('../icons/wallet-icon.png')} style={[styles.icon, { tintColor: color }]} />;
          } else if (route.name === 'NFT') {
            return <Image source={require('../icons/nft-icon.png')} style={[styles.icon, { tintColor: color }]} />;
          } else if (route.name === 'Swap') {
            return <Image source={require('../icons/swap-icon.png')} style={[styles.icon, { tintColor: color }]} />;
          } else if (route.name === 'Ayarlar') {
            return <Image source={require('../icons/settings-icon.png')} style={[styles.icon, { tintColor: color }]} />;
          }
          // You can return any component that you like here!
          // return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFFFFF', // Aktif renk beyaz yapıldı
        tabBarInactiveTintColor: 'gray',   
        tabBarStyle: {
          backgroundColor: '#242038', // Arka plan mor tonu (Cüzdan ekranı ile aynı)
          // Diğer stil ayarları (borderTopColor vs.) Figma tasarımına göre eklenebilir
        },
        headerShown: false, // Şimdilik başlıkları kapatalım, gerekirse ekran bazlı açarız
      })}
    >
      <Tab.Screen name="Cüzdan" component={WalletScreen} />
      <Tab.Screen name="NFT" component={NFTScreen} />
      <Tab.Screen name="Swap" component={SwapScreen} />
      <Tab.Screen name="Ayarlar" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  icon: {
    width: 24, // İkon boyutunuza göre ayarlayın
    height: 24, // İkon boyutunuza göre ayarlayın
  },
});

export default AppNavigator; 