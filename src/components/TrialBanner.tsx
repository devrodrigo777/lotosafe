import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TrialBannerProps {
  expiresAt: any;
  licenseType?: string;
}

export const TrialBanner = ({ expiresAt, licenseType }: TrialBannerProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRADO');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m restantes`);
      } else {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} restantes`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-4 text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span>
          {licenseType === 'monthly' 
            ? 'Sua assinatura vai expirar em pouco tempo' 
            : 'Sua conta está em período de demonstração'}
        </span>
      </div>
      <div className="h-4 w-px bg-white/30 hidden sm:block" />
      <div className="flex items-center gap-2 bg-white/20 px-3 py-0.5 rounded-full">
        <Clock className="w-4 h-4" />
        <span className="font-mono">{timeLeft}</span>
      </div>
    </div>
  );
};
