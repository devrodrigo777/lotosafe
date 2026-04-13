import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth, signOut, signInWithEmailAndPassword, db, doc, updateDoc, serverTimestamp, setDoc, createUserWithEmailAndPassword } from '@/firebase';
import { LogIn, LogOut, ShieldCheck, MapPin, ShieldAlert, User as UserIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const Navbar = () => {
  const { user, userData, isGlobalAdmin, isAnonymous } = useAuth();
  const { currentCompany } = useLocation();
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const email = username.includes('@') ? username : `${username}@loto.safe`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // If the user is the global admin and doesn't exist, try to create it
      if (username === 'globaladmin' && password === '1234ABcd' && 
          (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found')) {
        try {
          const email = 'globaladmin@loto.safe';
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Initialize global admin in Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            role: 'globaladmin',
            active: true,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
          return; // Success!
        } catch (createError: any) {
          console.error('Bootstrap error:', createError);
          if (createError.code === 'auth/email-already-in-use') {
            setLoginError('O usuário "globaladmin" já existe, mas a senha fornecida está incorreta.');
          } else {
            setLoginError(`Erro na configuração inicial: ${createError.message}`);
          }
          return;
        }
      }

      if (error.code === 'auth/operation-not-allowed') {
        setLoginError('O método de login "E-mail/Senha" está desativado no Firebase.');
      } else if (error.code === 'auth/invalid-credential') {
        setLoginError('Usuário ou senha incorretos. Verifique se o Caps Lock está ativado.');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('Usuário não encontrado.');
      } else {
        setLoginError(error.message || 'Erro ao realizar login.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // AuthContext will automatically sign in anonymously again
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-xl tracking-tight">EasyLOTOTO</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Industrial Security</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentCompany && !isGlobalAdmin && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 animate-pulse">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{currentCompany.name}</span>
            </div>
          )}

          {user && !isAnonymous ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none flex items-center gap-1 justify-end">
                  {isGlobalAdmin ? <ShieldAlert className="w-3 h-3 text-primary" /> : <UserIcon className="w-3 h-3" />}
                  {userData?.role === 'globaladmin' ? 'Global Admin' : 'Empresa'}
                </p>
                <p className="text-xs text-muted-foreground">{user.email?.split('@')[0]}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isAnonymous && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <UserIcon className="w-3 h-3" />
                  Visitante
                </div>
              )}
              <Dialog>
                <DialogTrigger render={<Button className="gap-2 rounded-full px-6" />}>
                  <LogIn className="w-4 h-4" />
                  Login Empresa
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Acesso Restrito</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Usuário</Label>
                      <Input id="username" name="username" required placeholder="Digite seu usuário" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" name="password" type="password" required placeholder="••••••••" />
                    </div>
                    {loginError && (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive font-medium">{loginError}</p>
                        {loginError.includes('auth/operation-not-allowed') && (
                          <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded border border-dashed leading-tight">
                            <strong>Dica:</strong> O método "Email/Senha" precisa ser ativado no console do Firebase (Authentication &gt; Sign-in method).
                          </div>
                        )}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loginLoading}>
                      {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Entrar no Sistema
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
