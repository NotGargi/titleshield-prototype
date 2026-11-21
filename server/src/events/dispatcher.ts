import crypto from 'node:crypto';
import { AuthDomainEvent, AuthEventType } from './types';
import { sanitizePayload } from './sanitizer';
import { authEventBus } from './bus';
import { saveAuthEvent } from '../db/authEventsRepository';

/**
 * Domain Event Dispatcher for Landeed 2.0 Sovereign Authentication.
 * Coordinates synchronous persistence to SQLite audit store with in-process event publication.
 */
export class AuthEventDispatcher {
  private static instance: AuthEventDispatcher;

  public static getInstance(): AuthEventDispatcher {
    if (!AuthEventDispatcher.instance) {
      AuthEventDispatcher.instance = new AuthEventDispatcher();
    }
    return AuthEventDispatcher.instance;
  }

  /**
   * Synchronously dispatches an authentication lifecycle event:
   * 1. Assigns unique UUID event ID and ISO timestamp if omitted.
   * 2. Sanitizes payload to guarantee zero credential leakage.
   * 3. Synchronously writes event to SQLite auth_events table for ACID durability.
   * 4. Emits event on in-process AuthEventBus for reactive consumers.
   */
  public dispatch<T extends AuthDomainEvent>(
    eventData: Omit<T, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string }
  ): T {
    const eventId = eventData.eventId || crypto.randomUUID();
    const timestamp = eventData.timestamp || new Date().toISOString();
    const sanitizedPayload = sanitizePayload(eventData.payload || {});

    const fullEvent = {
      ...eventData,
      eventId,
      timestamp,
      payload: sanitizedPayload,
      metadata: eventData.metadata || {},
    } as T;

    // 1. Synchronously persist to SQLite audit event store
    try {
      saveAuthEvent(fullEvent);
    } catch (persistErr) {
      console.error(`[AuthEventDispatcher] Failed to persist audit event ${fullEvent.eventType}:`, persistErr);
      throw persistErr; // Ensure ACID failure propagates
    }

    // 2. Publish to in-process subscribers
    try {
      authEventBus.emitAuthEvent(fullEvent);
    } catch (subscriberErr) {
      console.warn(`[AuthEventDispatcher] Subscriber threw error for event ${fullEvent.eventType}:`, subscriberErr);
    }

    return fullEvent;
  }

  /**
   * Async dispatch wrapper for API compatibility.
   */
  public async dispatchAsync<T extends AuthDomainEvent>(
    eventData: Omit<T, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string }
  ): Promise<T> {
    return this.dispatch<T>(eventData);
  }
}

export const authEventDispatcher = AuthEventDispatcher.getInstance();
