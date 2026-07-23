import { clientApi } from "@/lib/client-api";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatSuggestedEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  priceFrom: number;
  isFree: boolean;
}

export interface ChatReply {
  reply: string;
  suggestedEvents: ChatSuggestedEvent[];
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatReply> {
  const res = await clientApi.post<{ success: boolean; data: ChatReply }>(
    "/chatbot/message",
    { message, history }
  );
  return res.data;
}
