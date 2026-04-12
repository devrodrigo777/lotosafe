import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const state = (this as any).state;
    const props = (this as any).props;
    if (state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isPermissionError = false;

      try {
        const parsed = JSON.parse(state.error?.message || '{}');
        if (parsed.error && parsed.error.includes('permissions')) {
          isPermissionError = true;
          errorMessage = "Você não tem permissão para acessar este recurso ou realizar esta ação.";
        }
      } catch (e) {
        errorMessage = state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="max-w-md w-full border-destructive/50 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Ops! Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
              
              {isPermissionError && (
                <div className="text-xs bg-muted p-3 rounded-lg text-left border border-dashed">
                  <p className="font-bold mb-1">Causas comuns:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Sessão expirada (tente logar novamente)</li>
                    <li>Acesso restrito ao seu nível de usuário</li>
                    <li>Configuração de segurança pendente no servidor</li>
                  </ul>
                </div>
              )}

              <Button 
                onClick={() => window.location.reload()} 
                className="w-full gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar Aplicativo
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return props.children;
  }
}
