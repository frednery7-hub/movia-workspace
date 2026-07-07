/**
 * sessionEvents — canal de comunicação entre a camada de API e o app.
 *
 * O interceptor de 401 não tem acesso ao sistema de navegação do Expo Router,
 * então emite um evento global que o componente raiz (_layout.tsx) escuta
 * e usa para redirecionar o usuário para uma nova sessão automaticamente.
 */
type Listener = () => void;

const listeners: Set<Listener> = new Set();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  listeners.forEach((fn) => fn());
}
