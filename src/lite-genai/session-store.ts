/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { v4 as uuidv4 } from 'uuid';
import { SessionData, ChatMessage, Chat } from './types';
import { Logger } from './utils';

const logger = new Logger('SessionStore');

export class SessionStore {
  private sessions = new Map<string, SessionData>();
  private chats = new Map<string, ChatImpl>();

  createSession(sessionId?: string): string {
    const id = sessionId || uuidv4();
    const session: SessionData = {
      id,
      messages: [],
      state: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.sessions.set(id, session);
    logger.log(`Created session: ${id}`);
    return id;
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  // Simple get/set methods for flows compatibility
  get(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, data: any): void {
    this.sessions.set(sessionId, data);
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date() });
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    // Also clean up any associated chats
    const chatsToDelete = Array.from(this.chats.entries())
      .filter(([_, chat]) => chat.sessionId === sessionId)
      .map(([id]) => id);
    
    chatsToDelete.forEach(chatId => this.chats.delete(chatId));
    logger.log(`Deleted session: ${sessionId}`);
  }

  createChat(sessionId: string): Chat {
    const chatId = uuidv4();
    const chat = new ChatImpl(chatId, sessionId, this);
    this.chats.set(chatId, chat);
    logger.log(`Created chat: ${chatId} for session: ${sessionId}`);
    return chat;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date();
    }
  }

  getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  setState(sessionId: string, key: string, value: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = session.state || {};
      session.state[key] = value;
      session.updatedAt = new Date();
    }
  }

  getState(sessionId: string, key: string): any {
    const session = this.sessions.get(sessionId);
    return session?.state?.[key];
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.state = {};
      session.updatedAt = new Date();
      logger.log(`Cleared session: ${sessionId}`);
    }
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

class ChatImpl implements Chat {
  constructor(
    public id: string,
    public sessionId: string,
    private sessionStore: SessionStore
  ) {}

  async send(message: string): Promise<string> {
    // Add user message
    this.addMessage('user', message);
    
    // This is a placeholder - actual implementation will be in the flows
    // that use OpenAI client
    const response = "Response will be handled by flows using OpenAI client";
    
    // Add assistant response
    this.addMessage('assistant', response);
    
    return response;
  }

  getMessages(): ChatMessage[] {
    return this.sessionStore.getMessages(this.sessionId);
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date()
    };
    this.sessionStore.addMessage(this.sessionId, message);
  }
}

// Global instance
export const sessionStore = new SessionStore();