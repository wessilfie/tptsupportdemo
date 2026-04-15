export type ChatPhase =
  | 'idle'
  | 'chatting'
  | 'awaiting-feedback'
  | 'contact-form'
  | 'rating'
  | 'ended';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
}

export interface ContactInfo {
  name: string;
  email: string;
}

export interface TranscriptBlob {
  sessionId: string;
  timestamp: string;
  ipAddress: string;
  messages: ChatMessage[];
  contactInfo?: ContactInfo;
  urlsMentioned: string[];
  rating?: number;
}
