import { Event } from '../event/event.model';
import { config } from '../../config';
import { isDbConnected } from '../../config/database';
import { AppError } from '../../common/utils/AppError';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatEventSummary {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  priceFrom: number;
  isFree: boolean;
}

export interface ChatResult {
  reply: string;
  suggestedEvents: ChatEventSummary[];
}

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export class ChatbotService {
  /** Pulls a bounded set of real, public event data so the model can only recommend
   * events that actually exist — it never invents titles/dates/prices. */
  private async fetchEventContext(): Promise<ChatEventSummary[]> {
    if (!isDbConnected) return [];
    try {
      const events = await Event.find({ status: 'published' })
        .sort({ date: 1 })
        .limit(40)
        .select('title category date location priceFrom isFree')
        .lean();

      return events.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        category: e.category,
        date: new Date(e.date).toISOString().slice(0, 10),
        location: e.location,
        priceFrom: e.priceFrom,
        isFree: !!e.isFree,
      }));
    } catch {
      // Database hiccup shouldn't take down the whole chat reply — answer without
      // event grounding rather than failing the request.
      return [];
    }
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResult> {
    if (!message || !message.trim()) {
      throw new AppError('Vui lòng nhập câu hỏi hoặc yêu cầu', 400);
    }
    if (!config.gemini.apiKey) {
      throw new AppError('Chatbot chưa được cấu hình (thiếu GEMINI_API_KEY)', 503);
    }

    const events = await this.fetchEventContext();

    const systemPrompt = `Bạn là trợ lý ảo của nền tảng đặt vé sự kiện "EventBox". Nhiệm vụ của bạn:
1. Trả lời câu hỏi của người dùng một cách thân thiện, ngắn gọn, bằng tiếng Việt.
2. Gợi ý sự kiện phù hợp CHỈ từ danh sách sự kiện thực tế bên dưới — không được bịa ra sự kiện không có trong danh sách.
3. Nếu không có sự kiện nào phù hợp, hãy nói rõ là chưa tìm thấy và gợi ý người dùng thử từ khóa khác.

Danh sách sự kiện đang published (id, title, category, date, location, priceFrom, isFree):
${JSON.stringify(events)}

Luôn trả lời bằng đúng một JSON object theo format sau, không kèm markdown hay giải thích thêm:
{"reply": "<câu trả lời bằng tiếng Việt>", "suggestedEventIds": ["<id sự kiện phù hợp nhất, tối đa 3>"]}`;

    const contents = [
      ...history.slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const res = await fetch(
      `${GEMINI_ENDPOINT(config.gemini.model)}?key=${config.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new AppError(`Chatbot đang tạm thời không khả dụng (${res.status}). ${errText}`.trim(), 502);
    }

    const data = (await res.json()) as any;
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      throw new AppError('Chatbot không trả về nội dung hợp lệ', 502);
    }

    let parsed: { reply?: string; suggestedEventIds?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: model didn't respect the JSON format — surface the raw text as-is.
      parsed = { reply: raw, suggestedEventIds: [] };
    }

    const byId = new Map(events.map((e) => [e.id, e]));
    const suggestedEvents = (parsed.suggestedEventIds || [])
      .map((id) => byId.get(id))
      .filter((e): e is ChatEventSummary => !!e)
      .slice(0, 3);

    return {
      reply: parsed.reply || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.',
      suggestedEvents,
    };
  }
}
