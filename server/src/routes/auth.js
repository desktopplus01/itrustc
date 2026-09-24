import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { sendOtpEmail } from '../services/email.js';
import { notifyNewSignup } from '../services/notifications.js';

const router = Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/request-otp — sends a 6-digit OTP to email
router.post('/request-otp', async (req, res) => {
  try {
    const { email, type = 'SIGNUP' } = z.object({
      email: z.string().email(),
      type: z.enum(['SIGNUP', 'RESET']).optional(),
    }).parse(req.body);

    // For SIGNUP, reject if email already registered
    if (type === 'SIGNUP') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // For RESET, only send codes to existing accounts (but respond the same
    // either way so the endpoint doesn't leak which emails exist).
    if (type === 'RESET') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        return res.json({ message: 'If an account exists, you will receive a verification code' });
      }
    }

    // Invalidate any previous unused OTPs for this email+type
    await prisma.otp.updateMany({
      where: { email, type, used: false },
      data: { used: true },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`[OTP] ${email} → ${code} (${type}) expires ${expiresAt.toLocaleTimeString()}`);

    await prisma.otp.create({
      data: { email, code, type, expiresAt },
    });

    await sendOtpEmail(email, code, type);

    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /api/auth/verify-otp — verifies the OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, type = 'SIGNUP' } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
      type: z.enum(['SIGNUP', 'RESET']).optional(),
    }).parse(req.body);

    const otp = await prisma.otp.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    res.json({ message: 'Email verified successfully', verified: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/auth/signup — creates account (requires prior email verification)
router.post('/signup', async (req, res) => {
  try {
    const data = z.object({
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      phone: z.string().optional(),
      otpVerified: z.literal(true, { errorMap: () => ({ message: 'Email verification required' }) }),
    }).parse(req.body);

    // Check no previously used verified OTP exists (must have been verified in last 30 min)
    const verifiedOtp = await prisma.otp.findFirst({
      where: {
        email: data.email,
        type: 'SIGNUP',
        used: true,
        createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        status: 'PENDING',
      },
      select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true },
    });

    res.status(201).json({
      message: 'Account created successfully. Please wait for admin approval.',
      user,
    });

    // Notify admins about new signup (non-blocking)
    notifyNewSignup(user).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Account pending approval', status: 'PENDING' });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Account has been rejected', status: 'REJECTED' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support.', status: 'SUSPENDED' });
    }

    // 2FA enabled — send OTP and return 2FA_REQUIRED.
    // Admins skip the OTP step entirely: they log straight in.
    if (user.twoFactorEnabled && user.role !== 'ADMIN') {
      // Invalidate previous LOGIN OTPs
      await prisma.otp.updateMany({
        where: { email, type: 'LOGIN', used: false },
        data: { used: true },
      });

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      console.log(`[OTP] ${email} → ${code} (LOGIN) expires ${expiresAt.toLocaleTimeString()}`);

      await prisma.otp.create({
        data: { email, code, type: 'LOGIN', expiresAt },
      });

      await sendOtpEmail(email, code, 'LOGIN');

      return res.json({
        twoFactorRequired: true,
        email,
        message: 'Verification code sent to your email',
      });
    }

    // No 2FA — issue token directly
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// POST /api/auth/verify-login — verify 2FA OTP and return token
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    }).parse(req.body);

    const otp = await prisma.otp.findFirst({
      where: {
        email,
        code,
        type: 'LOGIN',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Verify login error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ message: 'If an account exists, you will receive a password reset email.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    res.json({ message: 'If an account exists, you will receive a password reset email.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true, plan: true, twoFactorEnabled: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/reset-password { email, password } — requires a verified RESET OTP
// issued in the last 30 minutes (same pattern as signup).
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }).parse(req.body);

    const verifiedOtp = await prisma.otp.findFirst({
      where: {
        email,
        type: 'RESET',
        used: true,
        createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      return res.status(400).json({ error: 'Please verify the reset code first' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No account found for that email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    // Invalidate any other outstanding RESET codes
    await prisma.otp.updateMany({
      where: { email, type: 'RESET', used: false },
      data: { used: true },
    });

    res.json({ message: 'Password reset successfully — you can now log in' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
