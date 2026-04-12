/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocationProvider, useLocation } from '@/contexts/LocationContext';
import { Navbar } from '@/components/Navbar';
import { InstructionList } from '@/components/InstructionList';
import { AdminDashboard } from '@/components/AdminDashboard';
import { GlobalAdminDashboard } from '@/components/GlobalAdminDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ShieldAlert, MapPin, Loader2, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth, signOut } from '@/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster } from 'sonner';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InstructionView } from '@/components/InstructionView';

function AppContent() {
  const { user, userData, loading: authLoading, isGlobalAdmin } = useAuth();
  const { currentCompanies, loading: locLoading, error: locError, location } = useLocation();
  
  // Fallback for logged in users without a valid role/profile
  const [showProfileError, setShowProfileError] = useState(false);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (user && !user.isAnonymous && !userData && !authLoading) {
      timer = setTimeout(() => setShowProfileError(true), 1500);
    } else {
      setShowProfileError(false);
    }
    return () => clearTimeout(timer);
  }, [user, userData, authLoading]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando segurança...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/instruction/:id" element={<InstructionView />} />
      <Route path="/" element={
        <div className="min-h-screen bg-slate-50/50">
          <Navbar />
          
          <main className="max-w-7xl mx-auto px-4 py-8">
            {showProfileError ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
                <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold">Perfil não encontrado</h2>
                <p className="text-muted-foreground mt-2">
                  Sua conta foi autenticada, mas não encontramos seu perfil de acesso. 
                  Aguarde a ativação pelo Administrador Global.
                </p>
                <Button onClick={() => signOut(auth)} className="mt-6 w-full">Sair</Button>
              </div>
            ) : isGlobalAdmin ? (
              <GlobalAdminDashboard />
            ) : user && !user.isAnonymous && userData?.role === 'company' ? (
              userData.companyId ? (
                <AdminDashboard companyId={userData.companyId} />
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 h-4" />
                  <AlertTitle>Erro de Configuração</AlertTitle>
                  <AlertDescription>
                    Sua conta de empresa não está vinculada a nenhuma unidade. Entre em contato com o Administrador Global.
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <header className="text-center space-y-4 mb-12">
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    SISTEMA LOTO ATIVO
                  </motion.div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900">
                    Segurança em <span className="text-primary">Primeiro Lugar</span>
                  </h1>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Consulte instruções de bloqueio de energia perigosa em tempo real baseadas na sua localização industrial.
                  </p>
                </header>

                {locLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                    </div>
                    <p className="text-muted-foreground font-medium animate-pulse">Buscando unidades próximas...</p>
                  </div>
                ) : locError ? (
                  <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
                    <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{locError}</p>
                  </div>
                ) : currentCompanies.length > 0 ? (
                  <InstructionList />
                ) : (
                  <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Building2 className="w-10 h-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Nenhuma Empresa Detectada</h2>
                        <p className="text-muted-foreground">
                          Você não está dentro do raio de acesso de nenhuma empresa cadastrada no sistema LOTO Safe.
                        </p>
                        {location && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Suas coordenadas atuais:</p>
                            <p className="font-mono text-sm">LAT: {location.lat.toFixed(6)}</p>
                            <p className="font-mono text-sm">LNG: {location.lng.toFixed(6)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </main>

          <footer className="border-t py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 opacity-50">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold tracking-tighter">LOTO Safe</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2026 LOTO Safe Industrial. Feito com ❤ por <a href="https://www.linkedin.com/in/rodrigolca/">@RodrigoLCA</a>
              </p>
            </div>
          </footer>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <AppContent />
            <Toaster 
              position="top-right" 
              richColors 
              toastOptions={{
                className: 'py-4 px-6',
              }}
            />
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

