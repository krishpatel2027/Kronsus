import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { offlineService } from './offlineService';
import { Q } from '@nozbe/watermelondb';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://192.168.31.27:8000/api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export async function storeTokens({ access, refresh }) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    keychainService: 'com.company.inventory.jwt'
  });
}

export async function getAccessToken() {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function removeTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await removeTokens();
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });
        const { access, refresh: newRefresh } = res.data;
        await storeTokens({ access, refresh: newRefresh });
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        await removeTokens();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export async function login(username, password) {
  const { data } = await api.post('/login/', { username, password });
  const { access, refresh } = data;
  await storeTokens({ access, refresh });
  return data;
}

export async function register({ username, email, password, company_name }) {
  const { data } = await api.post('/register/', {
    username,
    email,
    password,
    company_name,
  });
  const { access, refresh } = data;
  await storeTokens({ access, refresh });
  return data;
}

export async function fetchProducts(params = {}) {
  if (offlineService.isOnline) {
    try {
      const { data } = await api.get('/products/', { params });
      const products = data.results ?? data;

      await offlineService.batchUpsertProducts(products);

      const localProducts = await offlineService.getLocalProducts();
      return localProducts;
    } catch (error) {
      console.error('Failed to fetch products from API, using local data:', error);
    }
  }

  const localProducts = await offlineService.getLocalProducts();
  return localProducts;
}

export async function updateStock(productId, payload) {
  if (offlineService.isOnline) {
    try {
      const { data } = await api.post(`/products/${productId}/stock/`, payload);

      const product = await offlineService.getProductById(productId);
      if (product) {
        await offlineService.updateProductStock(product, data.stock || 0);
      }

      await offlineService.createStockTransaction({
        company_id: product.companyId,
        product_id: productId,
        transaction_type: payload.transaction_type,
        quantity: payload.quantity,
        notes: payload.notes || '',
      });

      return data;
    } catch (error) {
      console.error('Failed to update stock via API, storing locally:', error);
    }
  }

  const product = await offlineService.getProductById(productId);
  if (!product) {
    throw new Error('Product not found in local database');
  }

  const transaction = await offlineService.createStockTransaction({
    company_id: product.companyId,
    product_id: productId,
    transaction_type: payload.transaction_type,
    quantity: payload.quantity,
    notes: payload.notes || '',
  });

  const currentStock = await offlineService.getProductStock(productId);
  const newStock = payload.transaction_type === 'IN'
    ? currentStock + payload.quantity
    : currentStock - payload.quantity;

  await offlineService.updateProductStock(product, newStock, false);

  return {
    success: true,
    message: 'Transaction saved locally. Will sync when online.',
    transaction: transaction._raw,
    stock: newStock,
  };
}

export async function syncPendingData() {
  if (!offlineService.isOnline) {
    throw new Error('No internet connection');
  }

  await offlineService.syncProducts();
  await offlineService.syncPendingTransactions();

  return { success: true };
}

export default api;
