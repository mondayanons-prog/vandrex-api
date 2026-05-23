import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import valkey from '../database/valkey.js'; // The persistent client we configured earlier

export const verificationLimiter = rateLimit({
  // Use Valkey instead of Node's internal local RAM memory
  store: new RedisStore({
    sendCommand: (...args) => valkey.sendCommand(args),
    prefix: 'rl:verify:', // Organises your rate limit keys inside Valkey
  }),

  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Max 5 attempts per IP address
  
  message: {
    status: 429,
    error: 'Too many verification attempts. Please try again after 15 minutes.'
  },
  
  standardHeaders: true, 
  legacyHeaders: false,
});
