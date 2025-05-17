import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import CreateWalletWarningScreen from '../screens/auth/CreateWalletWarningScreen';
import GenerateMnemonicScreen from '../screens/auth/GenerateMnemonicScreen';
import VerifyMnemonicScreen from '../screens/auth/VerifyMnemonicScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import ImportWalletScreen from '../screens/auth/ImportWalletScreen';
// EnterPasswordScreen burada olmayacak, RootNavigator'da ele alınacak

export type AuthStackParamList = {
  Welcome: undefined;
  CreateWalletWarning: undefined;
  GenerateMnemonic: undefined;
  VerifyMnemonic: { mnemonic: string };
  SetPassword: { mnemonic?: string; privateKey?: string };
  ImportWallet: undefined;
  // AppEntryPoint: undefined; // Bu Root'ta olacak
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false, // Genellikle auth ekranlarında başlık olmaz
        // İstediğiniz gibi özelleştirebilirsiniz
        // headerStyle: { backgroundColor: '#242038' },
        // headerTintColor: '#FFFFFF',
        // headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateWalletWarning" component={CreateWalletWarningScreen} />
      <Stack.Screen name="GenerateMnemonic" component={GenerateMnemonicScreen} />
      <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonicScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 