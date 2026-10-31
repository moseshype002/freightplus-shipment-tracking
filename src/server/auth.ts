import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../types/shipment.js';
import { Database, DbUser } from './db/fileDb.js';

// Configuration: Replace JWT_SECRET with your secure secret in production via .env
const JWT_SECRET = process.env.JWT_SECRET || 'freightplus-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Authentication Middleware: Verifies Bearer JWT
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Session token has expired or is invalid. Please sign in again.' });
  }
}

// Optional Auth: populates req.user if token is present, but doesn't block if missing
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // Ignore token failure for public routes
    }
  }
  next();
}

// Role-Based Access Control: Admin only
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Administrator clearance required for this operation.' });
    return;
  }
  next();
}

// Re-export Database as UserStore interface for clean compatibility
export const UserStore = {
  findByEmail(email: string): DbUser | undefined {
    return Database.findUserByEmail(email);
  },

  findById(id: string): DbUser | undefined {
    return Database.findUserById(id);
  },

  createCustomer(data: { name: string; email: string; password: string; company?: string; phone?: string }): User {
    return Database.createCustomer(data);
  },
};
