"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { sendChatMessage, ChatMessage, ChatSuggestedEvent } from "@/lib/chatbot-api";
import styles from "./ChatbotWidget.module.css";

interface DisplayMessage extends ChatMessage {
  suggestedEvents?: ChatSuggestedEvent[];
}

const GREETING: DisplayMessage = {
  role: "assistant",
  text: "Xin chào! Mình là trợ lý ảo của EventBox 👋 Bạn muốn tìm sự kiện gì hôm nay, hay có câu hỏi gì mình có thể giúp?",
};

function formatPrice(priceFrom: number, isFree: boolean) {
  if (isFree || priceFrom === 0) return "Miễn phí";
  return `Từ ${priceFrom.toLocaleString("vi-VN")}đ`;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: DisplayMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const history: ChatMessage[] = nextMessages.map(({ role, text }) => ({ role, text }));
      const result = await sendChatMessage(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.reply, suggestedEvents: result.suggestedEvents },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại sau ít phút nhé.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Trợ lý EventBox">
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Sparkles size={16} />
              Trợ lý EventBox
            </div>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles.messages} ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.bubbleRow} ${
                  m.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAssistant
                }`}
              >
                <div>
                  <div
                    className={`${styles.bubble} ${
                      m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
                    }`}
                  >
                    {m.text}
                  </div>
                  {!!m.suggestedEvents?.length && (
                    <div className={styles.suggestions}>
                      {m.suggestedEvents.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/su-kien/${ev.id}`}
                          className={styles.suggestionCard}
                        >
                          <div className={styles.suggestionTitle}>{ev.title}</div>
                          <div className={styles.suggestionMeta}>
                            {ev.category} · {ev.date} · {formatPrice(ev.priceFrom, ev.isFree)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <div className={styles.typing}>Trợ lý đang trả lời…</div>}
          </div>

          <div className={styles.inputBar}>
            <input
              className={styles.input}
              placeholder="Nhập câu hỏi hoặc yêu cầu gợi ý sự kiện…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={sending || !input.trim()}
              aria-label="Gửi"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        className={styles.launcher}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý" : "Mở trợ lý EventBox"}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
