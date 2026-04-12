import React, { useState, useEffect } from 'react';
import { calculateDistance } from '@/lib/utils';
import { db, collection, getDocs } from '@/firebase';
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
  const [currentCompanies, setCurrentCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      setLoading(false);
      return;
    }

    const checkLocation = async (latitude: number, longitude: number) => {
      try {
        const companiesSnap = await getDocs(collection(db, 'companies'));
        const companies = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        
        console.log(`Current Location: ${latitude}, ${longitude}`);
        console.log(`Checking ${companies.length} companies...`);

        const found = companies.filter(c => {
          const dist = calculateDistance(latitude, longitude, c.location.lat, c.location.lng);
          console.log(`Distance to ${c.name}: ${dist.toFixed(2)}m (Radius: ${c.location.radius}m)`);
          return dist <= c.location.radius;
        });
        
        setCurrentCompanies(found);
        setError(null);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Erro ao buscar dados das empresas.');
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        checkLocation(latitude, longitude);
      },
      (err) => {
        console.error('Initial geolocation error:', err);
        setError('Não foi possível obter sua localização inicial. Verifique as permissões do navegador.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        checkLocation(latitude, longitude);
      },
      (err) => {
        console.error('WatchPosition error:', err);
        // Don't set global error if we already have a location, just log it
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
