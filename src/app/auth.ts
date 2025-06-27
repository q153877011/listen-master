import NextAuth from "next-auth";
import { NextAuthResult } from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";

// Database user interface for authentication
interface DatabaseUserForAuth {
  id: string;
  email: string;
  name: string;
  password: string;
  image?: string | null;
  role?: string;
  email_verified?: number;
}

// Type guard function to validate database user structure
function isDatabaseUserForAuth(obj: unknown): obj is DatabaseUserForAuth {
  if (!obj || typeof obj !== 'object') return false;
  
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    typeof user.password === 'string'
  );
}

const authResult = async (): Promise<NextAuthResult> => {
  const context = await getCloudflareContext({async: true});
  
  return NextAuth({
    providers: [
      Resend({
        apiKey: context.env.AUTH_RESEND_KEY,
        from: context.env.AUTH_EMAIL_FROM,
        async sendVerificationRequest({ identifier: email, url, provider }) {
          const emailPayload = {
            from: provider.from,
            to: email,
            subject: "登录您的账户",
            html: `
              <!DOCTYPE html>
              <html lang="zh-CN">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>登录您的账户</title>
                  <style>
                      body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          max-width: 600px;
                          margin: 0 auto;
                          padding: 20px;
                          background-color: #f9fafb;
                      }
                      .container {
                          background-color: white;
                          border-radius: 12px;
                          padding: 40px;
                          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                      }
                      .header {
                          text-align: center;
                          margin-bottom: 30px;
                      }
                      .logo {
                          width: 64px;
                          height: 64px;
                          margin: 0 auto 20px;
                          background-color: #3b82f6;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                      }
                      .logo svg {
                          width: 32px;
                          height: 32px;
                          color: white;
                      }
                      .title {
                          color: #1f2937;
                          font-size: 24px;
                          font-weight: 600;
                          margin: 0 0 10px;
                      }
                      .subtitle {
                          color: #6b7280;
                          font-size: 16px;
                          margin: 0;
                      }
                      .content {
                          margin: 30px 0;
                      }
                      .message {
                          color: #374151;
                          font-size: 16px;
                          line-height: 1.6;
                          margin-bottom: 30px;
                      }
                      .button-container {
                          text-align: center;
                          margin: 30px 0;
                      }
                      .login-button {
                          display: inline-block;
                          background-color: #3b82f6;
                          color: white;
                          padding: 14px 28px;
                          border-radius: 8px;
                          text-decoration: none;
                          font-weight: 600;
                          font-size: 16px;
                          transition: background-color 0.2s;
                      }
                      .login-button:hover {
                          background-color: #2563eb;
                      }
                      .footer {
                          margin-top: 40px;
                          padding-top: 20px;
                          border-top: 1px solid #e5e7eb;
                          text-align: center;
                          color: #6b7280;
                          font-size: 14px;
                      }
                      .security-notice {
                          background-color: #fef3c7;
                          border: 1px solid #f59e0b;
                          border-radius: 8px;
                          padding: 16px;
                          margin: 20px 0;
                      }
                      .security-notice h4 {
                          color: #92400e;
                          margin: 0 0 8px;
                          font-size: 14px;
                          font-weight: 600;
                      }
                      .security-notice p {
                          color: #92400e;
                          margin: 0;
                          font-size: 14px;
                      }
                      .link-text {
                          word-break: break-all;
                          color: #6b7280;
                          font-size: 12px;
                          margin-top: 20px;
                      }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <div class="header">
                          <div class="logo">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                              </svg>
                          </div>
                          <h1 class="title">登录您的账户</h1>
                          <p class="subtitle">点击下方按钮安全登录</p>
                      </div>
                      
                      <div class="content">
                          <p class="message">
                              您好！<br><br>
                              您请求了一个登录链接。点击下方按钮即可安全登录到您的账户，无需输入密码。
                          </p>
                          
                          <div class="button-container">
                              <a href="${url}" class="login-button">立即登录</a>
                          </div>
                          
                          <div class="security-notice">
                              <h4>🔒 安全提示</h4>
                              <p>此链接只能使用一次，并将在1小时后过期。如果您没有请求此登录链接，请忽略此邮件。</p>
                          </div>
                          
                          <p class="link-text">
                              如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
                              ${url}
                          </p>
                      </div>
                      
                      <div class="footer">
                          <p>此邮件由系统自动发送，请勿回复。</p>
                          <p>如有疑问，请联系我们的客服团队。</p>
                      </div>
                  </div>
              </body>
              </html>
            `
          };

          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${context.env.AUTH_RESEND_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(emailPayload),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error('Failed to send login email:', errorText);
              throw new Error(`Failed to send login email: ${emailResponse.status}`);
            }

            console.log('Login email sent successfully to:', email);
          } catch (error) {
            console.error('Error sending login email:', error);
            throw error;
          }
        }
      }),
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          try {
            const db = context.env.DB;
            
            // 查找用户
            const { results } = await db
              .prepare("SELECT * FROM users WHERE email = ?")
              .bind(credentials.email)
              .all();

            if (results.length === 0) {
              return null;
            }

            const userFromDb = results[0];

            // Validate user data structure
            if (!isDatabaseUserForAuth(userFromDb)) {
              console.error('Invalid user data structure from database');
              return null;
            }

            const user: DatabaseUserForAuth = userFromDb;

            // 验证密码
            const isPasswordValid = await bcrypt.compare(String(credentials.password), user.password);

            if (!isPasswordValid) {
              return null;
            }

            // 检查邮箱是否已验证
            if (user.email_verified !== 1) {
              throw new Error("EmailNotVerified");
            }

            // 返回用户信息（NextAuth 格式）
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image || null,
            };
          } catch (error) {
            if (error instanceof Error && error.message === "EmailNotVerified") {
              throw error;
            }
            console.error("Credentials auth error:", error);
            return null;
          }
        }
      })
    ],
    adapter: D1Adapter(context.env.DB),
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    jwt: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name: `next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true
        }
      }
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
        }
        return token;
      },
      async session({ session, token }) {
        if (token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
        }
        return session;
      },
      async signIn({ user, account, profile }) {
        // 允许所有已通过 authorize 验证的用户登录
        return true;
      }
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    debug: process.env.NODE_ENV === "development",
    trustHost: true
  });
};

export const { handlers, signIn, signOut, auth } = await authResult();