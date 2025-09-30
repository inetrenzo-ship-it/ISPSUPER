import jwt from 'jsonwebtoken';
export const signToken = (payload: object) => {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '7d' });
};
