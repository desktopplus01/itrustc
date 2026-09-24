import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Your session is no longer valid. Please sign in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireApproved = (req, res, next) => {
  if (req.user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact support.' });
  }
  if (req.user.status !== 'APPROVED') {
    return res.status(403).json({ error: 'Your account is still waiting for admin approval. You will receive an email as soon as it is reviewed.' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'This area is only available to administrators.' });
  }
  next();
};
