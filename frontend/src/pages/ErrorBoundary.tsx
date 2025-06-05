import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Componente de clase React que actúa como un "Error Boundary" para capturar errores en sus componentes hijos.
 *
 * Cuando ocurre un error en cualquier componente hijo, este componente actualiza su estado interno para mostrar
 * una interfaz de usuario alternativa en lugar de la aplicación rota. Permite mostrar un mensaje personalizado
 * o un fallback proporcionado a través de las props.
 *
 * @template Props - Propiedades que recibe el componente, incluyendo opcionalmente un elemento `fallback` para mostrar en caso de error.
 * @template State - Estado interno del componente, que incluye información sobre si ocurrió un error, el error y detalles adicionales.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorComponent />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @remarks
 * Utiliza los métodos del ciclo de vida `getDerivedStateFromError` y `componentDidCatch` para manejar errores.
 * Es recomendable envolver componentes críticos con este ErrorBoundary para mejorar la resiliencia de la aplicación.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          <h1>Algo salió mal.</h1>
          <p>Por favor, intenta recargar la página.</p>
          {this.state.error && <pre>{this.state.error.toString()}</pre>}
          {this.state.errorInfo && <pre>{this.state.errorInfo.componentStack}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;