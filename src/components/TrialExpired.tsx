import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Lock, CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { db, doc, updateDoc, serverTimestamp } from '@/firebase';
import { toast } from 'sonner';

interface TrialExpiredProps {
  company: any;
  onReset: () => void;
}

export const TrialExpired = ({ company, onReset }: TrialExpiredProps) => {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, 'companies', company.id), {
        trialExpiresAt: newExpiry,
        status: 'active',
        isTrialExtended: true, // Flag to show modal
        updatedAt: serverTimestamp()
      });
      toast.success('Período de demonstração resetado com sucesso!');
      onReset();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao resetar período de demonstração');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-amber-100">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Período de Demonstração Expirou</CardTitle>
            <CardDescription>
              O tempo de teste gratuito da sua conta chegou ao fim.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-100 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Acesso ao dashboard bloqueado</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Visualização de instruções desativada</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full gap-2 h-12" 
              disabled={company.canResetTrial} 
              variant={company.canResetTrial ? "outline" : "default"}
            >
              <CreditCard className="w-4 h-4" />
              Ver Planos Disponíveis
            </Button>
            
            {company.canResetTrial && (
              <Button 
                className="w-full gap-2 h-12 bg-amber-500 hover:bg-amber-600 text-white" 
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Resetar Período de Demonstração
              </Button>
            )}
          </div>

          {!company.canResetTrial && (
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
              Entre em contato com o administrador global para estender seu teste.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
