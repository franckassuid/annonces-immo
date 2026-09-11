import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId:         'annonces-immo-49668',
  appId:             '1:265594293272:web:d15a8424381dcd060c076d',
  storageBucket:     'annonces-immo-49668.firebasestorage.app',
  apiKey:            'AIzaSyCRvWgJZ8CCikVM9dmiQhX8BOC5z-cnUTE',
  authDomain:        'annonces-immo-49668.firebaseapp.com',
  messagingSenderId: '265594293272',
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
