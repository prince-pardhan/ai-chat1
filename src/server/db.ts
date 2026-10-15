import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'app_db.json');

class Database {
  private schema: DatabaseSchema = {
    users: [],
    conversations: [],
    messages: [],
  };

  private usersById = new Map<string, User>();
  private usersByEmail = new Map<string, User>();
  private conversationsById = new Map<string, Conversation>();
  private conversationsByUserId = new Map<string, Conversation[]>();
  private messagesByConversationId = new Map<string, Message[]>();
  private messagesById = new Map<string, Message>();

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.schema = JSON.parse(raw);
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Failed to load database file, initializing empty schema:', err);
      this.schema = { users: [], conversations: [], messages: [] };
    }

    this.rebuildIndexes();
  }

  private rebuildIndexes() {
    this.usersById.clear();
    this.usersByEmail.clear();
    this.conversationsById.clear();
    this.conversationsByUserId.clear();
    this.messagesByConversationId.clear();
    this.messagesById.clear();

    for (const user of this.schema.users) {
      this.usersById.set(user.id, user);
      this.usersByEmail.set(user.email.toLowerCase(), user);
    }

    for (const conv of this.schema.conversations) {
      this.conversationsById.set(conv.id, conv);
      const list = this.conversationsByUserId.get(conv.userId) || [];
      list.push(conv);
      this.conversationsByUserId.set(conv.userId, list);
    }

    // Sort user conversations by updatedAt descending
    for (const [, list] of this.conversationsByUserId) {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    for (const msg of this.schema.messages) {
      this.messagesById.set(msg.id, msg);
      const list = this.messagesByConversationId.get(msg.conversationId) || [];
      list.push(msg);
      this.messagesByConversationId.set(msg.conversationId, list);
    }

    // Sort messages by createdAt ascending
    for (const [, list] of this.messagesByConversationId) {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.schema, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    return this.usersById.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.usersByEmail.get(email.toLowerCase());
  }

  createUser(user: User): User {
    this.schema.users.push(user);
    this.persist();
    this.rebuildIndexes();
    return user;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): User | null {
    const user = this.usersById.get(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.persist();
    this.rebuildIndexes();
    return user;
  }

  deleteUser(id: string): boolean {
    const user = this.usersById.get(id);
    if (!user) return false;

    // Cascade delete conversations and messages
    const userConvs = this.conversationsByUserId.get(id) || [];
    const convIds = new Set(userConvs.map((c) => c.id));

    this.schema.users = this.schema.users.filter((u) => u.id !== id);
    this.schema.conversations = this.schema.conversations.filter((c) => c.userId !== id);
    this.schema.messages = this.schema.messages.filter((m) => !convIds.has(m.conversationId));

    this.persist();
    this.rebuildIndexes();
    return true;
  }

  // --- Conversations ---
  getConversations(userId: string): Conversation[] {
    return this.conversationsByUserId.get(userId) || [];
  }

  getConversation(conversationId: string, userId: string): Conversation | undefined {
    const conv = this.conversationsById.get(conversationId);
    if (!conv || conv.userId !== userId) return undefined;
    return conv;
  }

  createConversation(userId: string, title = 'New Chat'): Conversation {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: 'conv_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.schema.conversations.push(conv);
    this.persist();
    this.rebuildIndexes();
    return conv;
  }

  updateConversation(conversationId: string, userId: string, updates: Partial<Pick<Conversation, 'title' | 'updatedAt'>>): Conversation | null {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return null;
    if (updates.title !== undefined) conv.title = updates.title;
    conv.updatedAt = updates.updatedAt || new Date().toISOString();
    this.persist();
    this.rebuildIndexes();
    return conv;
  }

  deleteConversation(conversationId: string, userId: string): boolean {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return false;

    this.schema.conversations = this.schema.conversations.filter((c) => c.id !== conversationId);
    this.schema.messages = this.schema.messages.filter((m) => m.conversationId !== conversationId);

    this.persist();
    this.rebuildIndexes();
    return true;
  }

  clearUserConversations(userId: string): void {
    const userConvs = this.conversationsByUserId.get(userId) || [];
    const convIds = new Set(userConvs.map((c) => c.id));

    this.schema.conversations = this.schema.conversations.filter((c) => c.userId !== userId);
    this.schema.messages = this.schema.messages.filter((m) => !convIds.has(m.conversationId));

    this.persist();
    this.rebuildIndexes();
  }

  // --- Messages ---
  getMessages(conversationId: string, userId: string): Message[] {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return [];
    return this.messagesByConversationId.get(conversationId) || [];
  }

  addMessage(conversationId: string, userId: string, role: 'user' | 'assistant' | 'system', content: string): Message | null {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return null;

    const now = new Date().toISOString();
    const message: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      conversationId,
      role,
      content,
      createdAt: now,
    };

    this.schema.messages.push(message);
    conv.updatedAt = now;

    this.persist();
    this.rebuildIndexes();
    return message;
  }

  updateMessage(messageId: string, userId: string, newContent: string): Message | null {
    const msg = this.messagesById.get(messageId);
    if (!msg) return null;
    const conv = this.getConversation(msg.conversationId, userId);
    if (!conv) return null;

    msg.content = newContent;
    conv.updatedAt = new Date().toISOString();
    this.persist();
    this.rebuildIndexes();
    return msg;
  }

  truncateMessagesFrom(conversationId: string, userId: string, messageId: string): boolean {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return false;

    const msgs = this.messagesByConversationId.get(conversationId) || [];
    const targetIdx = msgs.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return false;

    // Keep messages before targetIdx
    const idsToRemove = new Set(msgs.slice(targetIdx).map((m) => m.id));
    this.schema.messages = this.schema.messages.filter((m) => !idsToRemove.has(m.id));
    conv.updatedAt = new Date().toISOString();

    this.persist();
    this.rebuildIndexes();
    return true;
  }
}

export const db = new Database();
