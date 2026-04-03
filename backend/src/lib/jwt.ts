import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from './prisma';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  const opts: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, opts);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const opts: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, opts);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
};

export const saveRefreshToken = async (
  userId: string,
  token: string
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });
};

export const deleteRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

export const findRefreshToken = async (token: string) => {
  return prisma.refreshToken.findUnique({ where: { token } });
};
