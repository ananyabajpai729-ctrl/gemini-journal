export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface ChatSessionState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}
