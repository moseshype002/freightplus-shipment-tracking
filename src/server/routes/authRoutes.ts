import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';
import {
  generateToken,
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from '../auth.js';
import { MongoAuth } from '../db/mongoAuth.js';
import { UserModel } from '../db/models.js';

const router = Router();

// ============================================================================
// Helpers
// ============================================================================

function toPublicUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    phone: user.phone,
  };
}

function hashVerificationCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.trim())
    .digest('hex');
}

function isCodeExpired(expiry: Date | undefined): boolean {
  return !expiry || new Date(expiry).getTime() <= Date.now();
}
// ============================================================================
// 1. CUSTOMER AUTHENTICATION
// ============================================================================

// POST /api/auth/login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required.',
      });
      return;
    }

    const user = await MongoAuth.findUserByEmail(email);

    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials. Please verify your email and password.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');

    if (!isMatch) {
      res.status(401).json({
        error: 'Invalid credentials. Please verify your email and password.',
      });
      return;
    }

    if (user.role === 'client' && user.emailVerified === false) {
  res.status(403).json({
    error: 'Please verify your email address before signing in.',
    requiresVerification: true,
  });
  return;
}
    const publicUser = toPublicUser(user);
    const token = generateToken(publicUser);

    res.json({
      user: publicUser,
      token,
      message: `Welcome back, ${user.name}`,
    });
  } catch (error) {
    console.error('[MongoDB Auth] Customer login failed:', error);

    res.status(500).json({
      error: 'Internal server error during authentication.',
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { name, email, password, company, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        error: 'Name, email, and password are required.',
      });
      return;
    }

    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        error: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Create the customer account as unverified.
    const newCustomer = await MongoAuth.createCustomer({
      name,
      email: cleanEmail,
      password,
      company,
      phone,
    });

    // Generate and email the six-digit verification code.
    const verificationCode = await sendVerificationEmail(cleanEmail);

    // Store only the hashed code in MongoDB.
    await UserModel.updateOne(
      { id: newCustomer.id, role: 'client' },
      {
        $set: {
          emailVerified: false,
          emailVerificationCodeHash:
            hashVerificationCode(verificationCode),
          emailVerificationExpiresAt:
            new Date(Date.now() + 15 * 60 * 1000),
          emailVerificationAttempts: 0,
        },
      }
    );

    // Do not issue a login token before verification.
    res.status(201).json({
      message: 'Registration successful. Please check your email for your verification code.',
      requiresVerification: true,
      email: cleanEmail,
    });
  } catch (error: any) {
    console.error('[MongoDB Auth] Customer registration failed:', error);

    if (error?.code === 11000) {
      res.status(400).json({
        error: 'An account with this email address already exists.',
      });
      return;
    }

    res.status(400).json({
      error: error?.message || 'Failed to create customer account.',
    });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code || !/^\d{6}$/.test(String(code))) {
      res.status(400).json({
        error: 'A valid email address and six-digit verification code are required.',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await UserModel.findOne({
      email: cleanEmail,
      role: 'client',
    }).select(
      '+passwordHash +emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts'
    );

    if (!user) {
      res.status(400).json({
        error: 'Invalid verification request.',
      });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({
        error: 'This email address has already been verified. Please sign in.',
      });
      return;
    }

    if ((user.emailVerificationAttempts || 0) >= 5) {
      res.status(429).json({
        error: 'Too many incorrect attempts. Please request a new verification code.',
      });
      return;
    }

    if (isCodeExpired(user.emailVerificationExpiresAt)) {
      res.status(400).json({
        error: 'Your verification code has expired. Please request a new one.',
      });
      return;
    }

    const submittedHash = hashVerificationCode(String(code));

    if (submittedHash !== user.emailVerificationCodeHash) {
      user.emailVerificationAttempts =
        (user.emailVerificationAttempts || 0) + 1;

      await user.save();

      res.status(400).json({
        error: 'Incorrect verification code.',
      });
      return;
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.emailVerificationAttempts = 0;

    await user.save();

    const publicUser = toPublicUser(user);
    const token = generateToken(publicUser);

    res.json({
      user: publicUser,
      token,
      message: 'Email verified successfully. Welcome to Freight Plus!',
    });
  } catch (error) {
    console.error('[MongoDB Auth] Email verification failed:', error);

    res.status(500).json({
      error: 'Unable to verify your email address. Please try again.',
    });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Email address is required.',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await UserModel.findOne({
      email: cleanEmail,
      role: 'client',
    });

    if (!user) {
      res.status(404).json({
        error: 'No customer account was found for this email address.',
      });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({
        error: 'This email address is already verified. Please sign in.',
      });
      return;
    }

    const verificationCode = await sendVerificationEmail(cleanEmail);

    await UserModel.updateOne(
      { id: user.id, role: 'client' },
      {
        $set: {
          emailVerificationCodeHash:
            hashVerificationCode(verificationCode),
          emailVerificationExpiresAt:
            new Date(Date.now() + 15 * 60 * 1000),
          emailVerificationAttempts: 0,
        },
      }
    );

    res.json({
      message: 'A new verification code has been sent to your email.',
    });
  } catch (error) {
    console.error('[MongoDB Auth] Resending verification code failed:', error);

    res.status(500).json({
      error: 'Unable to resend the verification code. Please try again.',
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Email address is required.',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await UserModel.findOne({
      email: cleanEmail,
      role: 'client',
      emailVerified: true,
    });

    // Use the same response whether or not the account exists.
    if (user) {
      const resetCode = await sendPasswordResetEmail(cleanEmail);

      await UserModel.updateOne(
        { id: user.id, role: 'client' },
        {
          $set: {
            passwordResetCodeHash: hashVerificationCode(resetCode),
            passwordResetExpiresAt:
              new Date(Date.now() + 15 * 60 * 1000),
            passwordResetAttempts: 0,
          },
        }
      );
    }

    res.json({
      message: 'If a verified customer account exists for that email, a password-reset code has been sent.',
    });
  } catch (error) {
    console.error('[MongoDB Auth] Password reset request failed:', error);

    res.status(500).json({
      error: 'Unable to process your password-reset request.',
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (
      !email ||
      !code ||
      !/^\d{6}$/.test(String(code)) ||
      typeof newPassword !== 'string'
    ) {
      res.status(400).json({
        error: 'Email, six-digit reset code, and new password are required.',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: 'Your new password must be at least 8 characters long.',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await UserModel.findOne({
      email: cleanEmail,
      role: 'client',
      emailVerified: true,
    }).select(
      '+passwordHash +passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts'
    );

    if (!user || !user.passwordResetCodeHash) {
      res.status(400).json({
        error: 'Invalid or expired password-reset request.',
      });
      return;
    }

    if ((user.passwordResetAttempts || 0) >= 5) {
      res.status(429).json({
        error: 'Too many incorrect attempts. Please request a new reset code.',
      });
      return;
    }

    if (isCodeExpired(user.passwordResetExpiresAt)) {
      res.status(400).json({
        error: 'Your reset code has expired. Please request another one.',
      });
      return;
    }

    const submittedHash = hashVerificationCode(String(code));

    if (submittedHash !== user.passwordResetCodeHash) {
      user.passwordResetAttempts =
        (user.passwordResetAttempts || 0) + 1;

      await user.save();

      res.status(400).json({
        error: 'Incorrect password-reset code.',
      });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordResetAttempts = 0;

    await user.save();

    res.json({
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('[MongoDB Auth] Password reset failed:', error);

    res.status(500).json({
      error: 'Unable to reset your password. Please try again.',
    });
  }
});

// GET /api/auth/me
router.get(
  '/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Not authenticated.',
        });
        return;
      }

      const user = await MongoAuth.findUserById(req.user.id);

      if (!user) {
        res.status(404).json({
          error: 'User profile not found.',
        });
        return;
      }

      res.json({
        user: toPublicUser(user),
      });
    } catch (error) {
      console.error('[MongoDB Auth] Profile lookup failed:', error);

      res.status(500).json({
        error: 'Failed to retrieve user profile.',
      });
    }
  }
);

// ============================================================================
// 2. ADMINISTRATOR AUTHENTICATION
// ============================================================================

// GET /api/auth/admin/status
router.get('/admin/status', async (_req, res): Promise<void> => {
  try {
    const status = await MongoAuth.getAdminSetupStatus();

    res.json({
      isInitialized: status.isInitialized,
    });
  } catch (error) {
    console.error('[MongoDB Auth] Admin status lookup failed:', error);

    res.status(500).json({
      error: 'Failed to retrieve administrator setup status.',
    });
  }
});

// POST /api/auth/admin/setup
router.post('/admin/setup', async (req, res): Promise<void> => {
  try {
    const { name, email, password, setupSecret } = req.body;

    if (!setupSecret) {
      res.status(403).json({
        error: 'Administrator Setup Secret required.',
      });
      return;
    }

    const admin = await MongoAuth.setupInitialAdmin({
      name,
      email,
      password,
      setupSecret,
    });

    const token = generateToken(admin);

    res.status(201).json({
      user: admin,
      token,
      message:
        'Administrator account provisioned successfully. Setup endpoint is now permanently locked.',
    });
  } catch (error: any) {
    console.error('[MongoDB Auth] Admin setup failed:', error);

    if (error?.code === 11000) {
      res.status(400).json({
        error: 'An account with this email address already exists.',
      });
      return;
    }

    res.status(400).json({
      error:
        error?.message || 'Failed to initialize administrator account.',
    });
  }
});


// POST /api/auth/admin/login
router.post('/admin/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Administrator email and password are required.',
      });
      return;
    }

    const user = await MongoAuth.findUserByEmail(email);

    if (!user) {
      res.status(401).json({
        error: 'Invalid administrator credentials.',
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        error: 'Access denied: Administrator clearance required.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');

    if (!isMatch) {
      res.status(401).json({
        error: 'Invalid administrator credentials.',
      });
      return;
    }

    const publicAdmin = toPublicUser(user);
    const token = generateToken(publicAdmin);

    res.json({
      user: publicAdmin,
      token,
      message: 'Security clearance verified. Welcome to Freight Plus Command.',
    });
  } catch (error) {
    console.error('[MongoDB Auth] Admin login failed:', error);

    res.status(500).json({
      error: 'Internal server error during administrator login.',
    });
  }
});

// POST /api/auth/admin/change-password
router.post(
  '/admin/change-password',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          error: 'Current password and new password are required.',
        });
        return;
      }

      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 8
      ) {
        res.status(400).json({
          error: 'New password must be at least 8 characters long.',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required.',
        });
        return;
      }

      const user = await UserModel.findOne({
        id: req.user.id,
        role: 'admin',
      })
        .select('+passwordHash')
        .exec();

      if (!user) {
        res.status(404).json({
          error: 'Administrator not found.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isMatch) {
        res.status(401).json({
          error: 'Current password verification failed.',
        });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();

      res.json({
        message: 'Administrator password updated securely.',
      });
    } catch (error) {
      console.error('[MongoDB Auth] Admin password update failed:', error);

      res.status(500).json({
        error: 'Failed to update administrator password.',
      });
    }
  }
);

export default router;



