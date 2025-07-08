export interface UserActivity {
  id: string;
  userId: string;
  audioId: string;
  isCorrect: boolean;
  userAnswer?: string | null;
  correctAnswer?: string | null;
  completedAt?: Date | null;
  timeSpent?: number | null;
  created_at: Date;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  audio?: {
    id: string;
    file_name: string;
    folder_name: string;
    miss_text?: string | null;
    original_text?: string | null;
  };
}

export interface CreateActivityRequest {
  audioId: string;
  isCorrect: boolean;
  userAnswer?: string;
  correctAnswer?: string;
  completedAt?: string;
  timeSpent?: number;
}

export interface ActivityResponse {
  success: boolean;
  message: string;
  activity?: UserActivity;
  activities?: UserActivity[];
  total?: number;
  limit?: number;
  offset?: number;
} 