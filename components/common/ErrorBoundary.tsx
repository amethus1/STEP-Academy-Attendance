import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
            return (
                <div className="p-8 text-center bg-white dark:bg-slate-900 h-screen flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded text-left overflow-auto text-sm max-w-2xl w-full text-slate-800 dark:text-slate-200">
                        <p className="font-mono whitespace-pre-wrap">{this.state.error?.toString()}</p>
                        <p className="mt-4 text-slate-500">Check the console for more details.</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark"
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
