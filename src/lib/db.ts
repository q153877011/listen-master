import { PrismaClient } from '@prisma/client';

// 全局 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 数据库访问接口
export interface DatabaseAccess {
  getUserByVerificationToken: (token: string) => Promise<any>;
  updateUserVerification: (userId: string) => Promise<void>;
  getUserByEmail: (email: string) => Promise<any>;
  createUser: (userData: any) => Promise<any>;
  updateUser: (userId: string, userData: any) => Promise<void>;
  updateUserVerificationToken: (userId: string, token: string, expiresAt: string) => Promise<void>;
  getEnvironmentVariables: () => Promise<{ AUTH_EMAIL_FROM: string; AUTH_RESEND_KEY: string }>;
}

// Prisma MySQL 数据库访问实现
export class PrismaDatabaseAccess implements DatabaseAccess {
  async getUserByVerificationToken(token: string) {
    const user = await prisma.user.findFirst({
      where: { verification_token: token },
      select: {
        id: true,
        email: true,
        verification_token: true,
        verification_expires: true,
        emailVerified: true,
      }
    });
    
    // 转换为与 Cloudflare D1 兼容的格式
    if (user) {
      return {
        id: user.id,
        email: user.email,
        verification_token: user.verification_token,
        verification_token_expires: user.verification_expires?.toISOString(),
        email_verified: user.emailVerified ? 1 : 0,
      };
    }
    return null;
  }

  async updateUserVerification(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
        verification_token: null,
        verification_expires: null,
      }
    });
  }

  async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // 转换为与 Cloudflare D1 兼容的格式
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        email_verified: user.emailVerified ? 1 : 0,
        verification_token: user.verification_token,
        verification_token_expires: user.verification_expires?.toISOString(),
        emailVerified: user.emailVerified?.toISOString(),
        image: user.image,
        created_at: user.created_at?.toISOString(),
        updated_at: user.updated_at?.toISOString(),
      };
    }
    return null;
  }

  async createUser(userData: any) {
    return await prisma.user.create({
      data: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        verification_token: userData.verification_token,
        verification_expires: userData.verification_expires ? new Date(userData.verification_expires) : null,
      }
    });
  }

  async updateUser(userId: string, userData: any) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        verification_token: userData.verification_token,
        verification_expires: userData.verification_expires ? new Date(userData.verification_expires) : null,
      }
    });
  }

  async updateUserVerificationToken(userId: string, token: string, expiresAt: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        verification_token: token,
        verification_expires: new Date(expiresAt),
      }
    });
  }

  async getEnvironmentVariables() {
    return {
      AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM || '',
      AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY || '',
    };
  }
}

// 获取数据库访问实例
export async function getDatabaseAccess(): Promise<DatabaseAccess> {
  return new PrismaDatabaseAccess();
} 