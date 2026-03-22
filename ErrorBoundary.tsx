import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button, Card } from './UI';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      
      try {
        if (this.state.error?.message.startsWith('{')) {
          const errInfo = JSON.parse(this.state.error.message);
          if (errInfo.error?.includes('permission-denied') || errInfo.error?.includes('Missing or insufficient permissions')) {
            errorMessage = "You don't have permission to perform this action. Please check your account or contact support.";
          }
        }
      } catch (e) {
        // Fallback to default message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-slate-200">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Oops! Something went wrong</h2>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <Button 
              onClick={() => window.location.reload()}
              className="w-full py-4 font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
