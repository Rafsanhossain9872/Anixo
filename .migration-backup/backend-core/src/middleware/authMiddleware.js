import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import process from 'node:process';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (req.user) {
        // Use updateOne to avoid full document save and versioning conflicts
        await User.updateOne({ _id: req.user._id }, { $set: { lastActive: Date.now() } });
      }

      next();
    } catch (error) {
      console.error("[AuthMiddleware] Token failure:", error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
