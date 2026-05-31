let _app = null;
let _db = null;
let _storage = null;

function getConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function requireFirebase() {
  try {
    // Lazy-require firebase packages so they are only loaded when actually needed.
    // eslint-disable-next-line global-require
    const firebaseApp = require("firebase/app");
    // eslint-disable-next-line global-require
    const firestore = require("firebase/firestore");
    // eslint-disable-next-line global-require
    const storageMod = require("firebase/storage");
    return { firebaseApp, firestore, storageMod };
  } catch (e) {
    throw new Error("Failed to load firebase modules: " + String(e));
  }
}

export function getFirebaseApp() {
  if (_app) return _app;
  const { firebaseApp } = requireFirebase();
  const { initializeApp, getApps, getApp } = firebaseApp;
  const cfg = getConfig();
  _app = getApps().length ? getApp() : initializeApp(cfg);
  return _app;
}

export function getDb() {
  if (_db) return _db;
  const app = getFirebaseApp();
  const { firestore } = requireFirebase();
  const { getFirestore } = firestore;
  _db = getFirestore(app);
  return _db;
}

export function getStorage() {
  if (_storage) return _storage;
  const app = getFirebaseApp();
  const { storageMod } = requireFirebase();
  const { getStorage: _getStorage } = storageMod;
  _storage = _getStorage(app);
  return _storage;
}

// Backward compat exports for existing code
export const db = new Proxy({}, {
  get() {
    return getDb();
  },
});

export const storage = new Proxy({}, {
  get() {
    return getStorage();
  },
});

export default getFirebaseApp;
