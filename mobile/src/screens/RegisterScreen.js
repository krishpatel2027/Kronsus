import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../store/AuthContext';
import { register } from '../services/api';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const { signUp } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Invalid Input', 'Password must be at least 6 characters long.');
      return;
    }
    if (!username || !companyName) {
      Alert.alert('Invalid Input', 'All fields are required.');
      return;
    }

    try {
      const payload = { username, email, password, company_name: companyName };
      const data = await register(payload);
      // Response contains JWT tokens
      await signUp(data.access, data.refresh);
    } catch (e) {
      console.error(e);
      Alert.alert('Registration failed', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Company name" value={companyName} onChangeText={setCompanyName} />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { height: 48, borderColor: '#ccc', borderWidth: 1, borderRadius: 4, marginBottom: 12, paddingHorizontal: 10 },
  button: { backgroundColor: '#0066cc', paddingVertical: 12, borderRadius: 4, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 10 },
});

export default RegisterScreen;
