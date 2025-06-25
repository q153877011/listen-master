export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified?: Date | null;
  created_at?: string;
  updated_at?: string;
} 