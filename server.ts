import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/db.ts';
import type { User } from './src/server/db.ts';
import {
  getGeminiClient,
  hasApiKey,
  SYSTEM_PROMPT,
  generateChatTitle,
  streamWithFallback,
  formatFriendlyErrorMessage,
} from './src/server/gemini.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Constraint: Port 3000 & iFrame: Dev server must run on port 3000
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-pro-super-secret-key-2026';

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Disable caching on all API responses to ensure fresh state
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// --- Authentication Middleware ---
export interface AuthRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.cookies?.auth_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // Check guest ID passed from client
  const guestHeaderId = (req.headers['x-guest-id'] as string) || '';

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = db.getUserById(decoded.userId);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // Token invalid or expired, gracefully fall back to guest
    }
  }

  // If a guest header ID is provided, retrieve or register the guest
  const targetGuestId = guestHeaderId || (token && token.startsWith('guest_') ? token : null);
  if (targetGuestId) {
    let guestUser = db.getUserById(targetGuestId);
    if (!guestUser) {
      guestUser = {
        id: targetGuestId,
        name: 'Guest Explorer',
        email: `${targetGuestId}@aichatpro.local`,
        passwordHash: '',
        authProvider: 'local',
        profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=${targetGuestId}`,
        createdAt: new Date().toISOString(),
      };
      db.createUser(guestUser);
    }
    req.user = guestUser;
    return next();
  }

  // Automatic guest session if completely unauthenticated
  const autoGuestId = 'user_guest_' + Math.random().toString(36).substring(2, 9);
  const autoGuest: User = {
    id: autoGuestId,
    name: 'Guest Explorer',
    email: `${autoGuestId}@aichatpro.local`,
    passwordHash: '',
    authProvider: 'local',
    profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=${autoGuestId}`,
    createdAt: new Date().toISOString(),
  };
  db.createUser(autoGuest);
  req.user = autoGuest;
  next();
};

function issueAuthToken(res: Response, user: User) {
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

// Ensure at least one default demo user exists for seamless experience if needed
const existingDemo = db.getUserByEmail('demo@aichatpro.com');
if (!existingDemo) {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('demo123456', salt);
  db.createUser({
    id: 'user_demo_101',
    name: 'Demo Explorer',
    email: 'demo@aichatpro.com',
    passwordHash,
    authProvider: 'local',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  });
}

// --- Auth Routes ---
app.post('/api/auth/register', (req: Request, res: Response): void => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: 'user_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    authProvider: 'local',
    createdAt: new Date().toISOString(),
  };

  db.createUser(newUser);
  const token = issueAuthToken(res, newUser);

  res.json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      profileImage: newUser.profileImage,
      authProvider: newUser.authProvider,
      createdAt: newUser.createdAt,
    },
    token,
  });
});

app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(400).json({ error: 'Invalid email or password.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = issueAuthToken(res, user);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    },
    token,
  });
});

app.post('/api/auth/google', (req: Request, res: Response): void => {
  // Seamless Google login / simulation with current user context
  const targetEmail = req.body.email || 'srk016361@gmail.com';
  let user = db.getUserByEmail(targetEmail);

  if (!user) {
    user = {
      id: 'user_goog_' + Math.random().toString(36).substring(2, 9),
      name: req.body.name || 'Google User',
      email: targetEmail.toLowerCase(),
      passwordHash: '',
      authProvider: 'google',
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    };
    db.createUser(user);
  }

  const token = issueAuthToken(res, user);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    },
    token,
  });
});

app.post('/api/auth/guest', (req: Request, res: Response): void => {
  const guestNumber = Math.floor(1000 + Math.random() * 9000);
  const guestUser: User = {
    id: 'user_guest_' + Math.random().toString(36).substring(2, 9),
    name: `Guest User #${guestNumber}`,
    email: `guest_${guestNumber}@aichatpro.local`,
    passwordHash: '',
    authProvider: 'local',
    profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=guest_${guestNumber}`,
    createdAt: new Date().toISOString(),
  };

  db.createUser(guestUser);
  const token = issueAuthToken(res, guestUser);
  res.json({
    user: {
      id: guestUser.id,
      name: guestUser.name,
      email: guestUser.email,
      profileImage: guestUser.profileImage,
      authProvider: guestUser.authProvider,
      createdAt: guestUser.createdAt,
    },
    token,
  });
});

app.get('/api/auth/me', (req: AuthRequest, res: Response): void => {
  let token = req.cookies?.auth_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    res.json({ user: null, hasGeminiKey: hasApiKey() });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.getUserById(decoded.userId);
    if (!user) {
      res.json({ user: null, hasGeminiKey: hasApiKey() });
      return;
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
      hasGeminiKey: hasApiKey(),
    });
  } catch (err) {
    res.json({ user: null, hasGeminiKey: hasApiKey() });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response): void => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Please enter your email.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    // Return friendly generic response for security
    res.json({ success: true, message: 'If an account matches that email, reset instructions have been generated.' });
    return;
  }
  // Return demo reset token
  res.json({
    success: true,
    message: 'Reset instructions sent. For demonstration, use code 888999 to reset your password.',
    resetCode: '888999',
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response): void => {
  const { email, newPassword, resetCode } = req.body;
  if (!email || !newPassword || !resetCode) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }
  if (resetCode !== '888999' && resetCode !== '123456') {
    res.status(400).json({ error: 'Invalid verification code.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);
  db.updateUser(user.id, { passwordHash });

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

app.patch('/api/auth/profile', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const { name, profileImage } = req.body;
  const updates: Partial<User> = {};
  if (name && typeof name === 'string') updates.name = name.trim();
  if (profileImage && typeof profileImage === 'string') updates.profileImage = profileImage.trim();

  const updated = db.updateUser(user.id, updates);
  res.json({ user: updated });
});

app.delete('/api/auth/account', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  db.deleteUser(user.id);
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Account and all data deleted permanently.' });
});

// --- Conversation Endpoints ---
app.get('/api/conversations', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const conversations = db.getConversations(userId);
  res.json({ conversations });
});

app.post('/api/conversations', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const title = req.body.title || 'New Chat';
  const conv = db.createConversation(userId, title);
  res.json({ conversation: conv });
});

app.get('/api/conversations/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const convId = req.params.id;
  const conversation = db.getConversation(convId, userId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const messages = db.getMessages(convId, userId);
  res.json({ conversation, messages });
});

app.patch('/api/conversations/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const convId = req.params.id;
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'Title is required.' });
    return;
  }
  const updated = db.updateConversation(convId, userId, { title: title.trim() });
  if (!updated) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ conversation: updated });
});

app.delete('/api/conversations/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const convId = req.params.id;
  const success = db.deleteConversation(convId, userId);
  if (!success) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ success: true });
});

app.delete('/api/conversations', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  db.clearUserConversations(userId);
  res.json({ success: true, message: 'All conversations cleared.' });
});

// --- AI Chat Streaming Endpoint ---
app.post('/api/chat/stream', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  let { conversationId, message, regenerateMessageId } = req.body;

  if (!message && !regenerateMessageId) {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let conversation = conversationId ? db.getConversation(conversationId, user.id) : undefined;
  let isBrandNewConv = false;

  if (!conversation) {
    conversation = db.createConversation(user.id, 'New Chat');
    conversationId = conversation.id;
    isBrandNewConv = true;
    sendEvent({ type: 'conv_created', conversation });
  }

  // If regenerating or editing, handle message truncation
  if (regenerateMessageId) {
    db.truncateMessagesFrom(conversation.id, user.id, regenerateMessageId);
  } else if (message) {
    // Add user message to DB
    db.addMessage(conversation.id, user.id, 'user', message);
  }

  // Check API Key
  if (!hasApiKey()) {
    const errorMsg = 'Gemini API key is not configured. Please add `GEMINI_API_KEY` in the AI Studio Secrets panel to enable real-time AI responses.';
    sendEvent({ type: 'chunk', text: `⚠️ **API Key Notice**: ${errorMsg}` });
    const assistantMsg = db.addMessage(conversation.id, user.id, 'assistant', `⚠️ **API Key Notice**: ${errorMsg}`);
    sendEvent({ type: 'done', conversationId: conversation.id, message: assistantMsg });
    res.end();
    return;
  }

  try {
    const ai = getGeminiClient();
    const existingMessages = db.getMessages(conversation.id, user.id);

    // Build contents array for Gemini
    // We map existing messages into Gemini contents format
    // role: 'user' | 'model'
    const contents: any[] = [];
    for (const msg of existingMessages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Ensure we have at least one user content
    if (contents.length === 0 && message) {
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    const { fullText } = await streamWithFallback(contents, (text) => {
      sendEvent({ type: 'chunk', text });
    });

    // Save complete assistant message to DB
    const savedAssistantMsg = db.addMessage(conversation.id, user.id, 'assistant', fullText || '(No response generated)');

    // Auto-generate title if this is the first turn
    const allMsgs = db.getMessages(conversation.id, user.id);
    if ((conversation.title === 'New Chat' || isBrandNewConv) && allMsgs.length <= 3) {
      const firstUserMsg = allMsgs.find((m) => m.role === 'user');
      if (firstUserMsg) {
        generateChatTitle(firstUserMsg.content).then((newTitle) => {
          db.updateConversation(conversation.id, user.id, { title: newTitle });
          sendEvent({ type: 'title_update', conversationId: conversation.id, title: newTitle });
        }).catch((err) => {
          console.error('Title generation background error:', err);
        });
      }
    }

    sendEvent({
      type: 'done',
      conversationId: conversation.id,
      message: savedAssistantMsg,
    });
    res.end();
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    const friendlyMessage = formatFriendlyErrorMessage(error);
    sendEvent({
      type: 'error',
      error: friendlyMessage,
    });
    res.end();
  }
});

// --- Edit Message & Regenerate Endpoint ---
app.post('/api/chat/edit', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { conversationId, messageId, newContent } = req.body;

  if (!conversationId || !messageId || !newContent) {
    res.status(400).json({ error: 'conversationId, messageId, and newContent are required.' });
    return;
  }

  // Update message
  db.updateMessage(messageId, user.id, newContent);

  // Find subsequent messages and remove them
  const msgs = db.getMessages(conversationId, user.id);
  const targetIndex = msgs.findIndex((m) => m.id === messageId);
  if (targetIndex !== -1 && targetIndex < msgs.length - 1) {
    const nextMsg = msgs[targetIndex + 1];
    db.truncateMessagesFrom(conversationId, user.id, nextMsg.id);
  }

  res.json({ success: true, conversationId });
});

// Ensure any unhandled /api/* request ALWAYS returns JSON, never HTML from Vite
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Global error handler for API requests
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled server error:', err);
  if (req.path.startsWith('/api')) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
    return;
  }
  next(err);
});

// Setup Vite dev server or static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Chat Pro server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
