"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ChatbotWidget from "./ChatbotWidget";

// Role-specific work areas that should never show the recommendation chatbot.
const HIDDEN_PREFIXES = ["/dashboard", "/organizer", "/staff"];

export default function ChatbotGate() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  // Only Guest (no user) and Participant get the assistant; Organizer/Staff/Admin don't.
  if (user && user.role !== "PARTICIPANT") return null;

  return <ChatbotWidget />;
}
