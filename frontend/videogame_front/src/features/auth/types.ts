export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
  trainer_sprite?: string;
}
