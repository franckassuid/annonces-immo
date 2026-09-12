import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getPhoto } from '../utils';

export function useAnnonces() {
  const [annonces, setAnnonces] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'annonces'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => {
          const data = { id: d.id, ...d.data() };
          const photo = data.photo || getPhoto(d.id);
          if (photo) data.photo = photo;
          return data;
        });
        setAnnonces(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { annonces, loading, error };
}
