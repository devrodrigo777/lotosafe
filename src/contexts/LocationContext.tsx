import React, { useState, useEffect } from 'react';
import { calculateDistance } from '@/lib/utils';
import { db, collection, onSnapshot } from '@/firebase';
import { Company } from '@/types';
import { AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LocationContextType {
  location: { lat: number; lng: number } | null;
  currentCompanies: Company[];
  error: string | null;
  loading: boolean;
}

const LocationContext = React.createContext<LocationContextType>({
  location: null,
  currentCompanies: [],
  error: null,
  loading: true,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [currentCompanies, setCurrentCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all companies once and listen for changes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'companies'), (snap) => {
      const companies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setAllCompanies(companies);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching companies:', err);
      setError('Erro ao buscar dados das empresas.');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Update current companies whenever location or allCompanies changes
  useEffect(() => {
    if (!location || allCompanies.length === 0) {
      setCurrentCompanies([]);
      return;
    }

    const found = allCompanies.filter(c => {
      const dist = calculateDistance(location.lat, location.lng, c.location.lat, c.location.lng);
      
      // Check trial expiration
      const trialExpiry = c.trialExpiresAt?.toDate ? c.trialExpiresAt.toDate() : new Date(c.trialExpiresAt || 0);
      const isTrialActive = trialExpiry > new Date();
      
      return dist <= c.location.radius && isTrialActive;
    });
    
    setCurrentCompanies(found);
  }, [location, allCompanies]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    // Initial check
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error('Initial geolocation error:', err);
        setError('Não foi possível obter sua localização inicial. Verifique as permissões do navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error('WatchPosition error:', err);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <LocationContext.Provider value={{ location, currentCompanies, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => React.useContext(LocationContext);
