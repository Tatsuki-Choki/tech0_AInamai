export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
};

export type CapabilitySummary = {
  id: string;
  name: string;
  count: number;
  percentage: number;
};

export type Report = {
  id: string;
  student_id: string;
  content: string;
  phase?: {
    id: string;
    name: string;
  };
  selected_abilities: Array<{
    id: string;
    name: string;
  }>;
  ai_comment?: string;
  reported_at: string;
};

export type AuthResponse = {
  access_token: string;
  user: User;
};
