/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// import AppNavigator from './src/navigation/AppNavigator'; // Eski import
import RootNavigator from './src/navigation/RootNavigator';

const App = () => {
  return (
    <NavigationContainer>
      {/* <AppNavigator /> */}
      <RootNavigator />
    </NavigationContainer>
  );
};

export default App;
