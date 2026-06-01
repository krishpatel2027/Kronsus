import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/store/AuthContext';
import { OfflineProvider } from './src/store/OfflineContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AdjustStockScreen from './src/screens/AdjustStockScreen';
import BarcodeScannerScreen from './src/screens/BarcodeScannerScreen';
import React, { useContext } from 'react';

const Stack = createNativeStackNavigator();

// Authenticated flow – dashboard & stock adjustment
const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AdjustStock" component={AdjustStockScreen} options={{ headerShown: false }} />
    <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ title: 'Scan Product' }} />
  </Stack.Navigator>
);

// Unauthenticated flow – login / register
const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const { token } = useContext(AuthContext);
  return token ? <MainStack /> : <AuthStack />;
};

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </OfflineProvider>
    </AuthProvider>
  );
}

