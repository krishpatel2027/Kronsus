import { createReactNativeAdapter } from '@nozbe/react-native-adapter';

export const app = createReactNativeAdapter({
  schema: {
    version: 1,
    migration: async (db, oldVersion, newVersion) => {
    },
  },
  dbName: 'inventory_db',
});
