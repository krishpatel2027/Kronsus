import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useIsFocused } from '@react-navigation/native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

const BarcodeScannerScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const processingRef = useRef(false); // Strict lock to prevent race conditions

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    // 1. Immediate Guard: Prevent multiple triggers for the same scan
    if (processingRef.current || scanned) return;
    
    processingRef.current = true;
    setScanned(true);
    
    try {
      // 2. Optimized Lookup: WatermelonDB index usage
      const products = await database.collections.get('products').query(
        Q.where('sku', data)
      ).fetch();

      if (products.length > 0) {
        const product = products[0];
        navigation.navigate('AdjustStock', { product });
      } else {
        Alert.alert(
          'Product Not Found', 
          `No product found with SKU: ${data}. Please add it to the inventory first.`,
          [{ text: 'OK', onPress: () => {
            setScanned(false);
            processingRef.current = false;
          }}]
        );
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Error', 'Failed to lookup product in database');
      setScanned(false);
      processingRef.current = false;
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.centerText}>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.centerText}>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Only render scanner when screen is focused to save resources */}
      {isFocused && (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      
      <View style={styles.overlay}>
        <View style={styles.scannerFrame} />
        <Text style={styles.instructionText}>Align barcode within the frame</Text>
      </View>

      {scanned && (
        <TouchableOpacity style={styles.scanAgainBtn} onPress={() => {
          setScanned(false);
          processingRef.current = false;
        }}>
          <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.cancelBtn} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  centerText: {
    color: '#fff',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '500',
  },
  scanAgainBtn: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default BarcodeScannerScreen;
