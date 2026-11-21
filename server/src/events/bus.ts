import { EventEmitter } from 'node:events';
import { AuthDomainEvent, AuthEventType } from './types';

/**
 * In-process typed event bus for authentication domain events.
 * Extends Node.js EventEmitter with strongly-typed signatures.
 */
export class AuthEventBus extends EventEmitter {
  private static instance: AuthEventBus;

  public constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): AuthEventBus {
    if (!AuthEventBus.instance) {
      AuthEventBus.instance = new AuthEventBus();
    }
    return AuthEventBus.instance;
  }

  /**
   * Typed event emission.
   * Emits both the specific eventType ('UserLoggedIn') and the generic 'auth_event' channel.
   */
  public emitAuthEvent(event: AuthDomainEvent): boolean {
    const specificEmitted = this.emit(event.eventType, event);
    const globalEmitted = this.emit('auth_event', event);
    return specificEmitted || globalEmitted;
  }

  /**
   * Typed listener registration for specific event type or all events ('*').
   */
  public subscribe<T extends AuthDomainEvent = AuthDomainEvent>(
    eventType: AuthEventType | '*',
    listener: (event: T) => void
  ): () => void {
    const channel = eventType === '*' ? 'auth_event' : eventType;
    this.on(channel, listener as (...args: any[]) => void);
    return () => {
      this.off(channel, listener as (...args: any[]) => void);
    };
  }
}

export const authEventBus = AuthEventBus.getInstance();
