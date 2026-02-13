"use client";

import { useState, useRef, useEffect } from "react";

// ---------- Types ----------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatPanelProps {
  topicName: string;
  categoryName: string;
  repoFullName: string;
  level: string;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { key: "quiz", label: "Quiz me", icon: "quiz", credits: 2 },
  { key: "eli5", label: "ELI5", icon: "lightbulb", credits: 1 },
  { key: "example", label: "Example", icon: "code", credits: 1 },
  { key: "challenge", label: "Challenge", icon: "fitness_center", credits: 3 },
] as const;

// ---------- Component ----------

export default function ChatPanel({
  topicName,
  categoryName,
  repoFullName,
  level,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI tutor. I can help you understand **${topicName}**. Ask me anything, or use the quick actions below.`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage(text: string, action?: string) {
    if (loading) return;
    if (!text.trim() && !action) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: action
        ? QUICK_ACTIONS.find((a) => a.key === action)?.label ?? text
        : text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || `Help me with ${topicName}`,
          topicName,
          categoryName,
          repoFullName,
          level,
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message ?? "Sorry, something went wrong. Please try again.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const data = await res.json();
      if (data.remaining !== undefined) {
        setCredits(data.remaining);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function formatTime(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <aside
      className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0"
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="font-bold text-sm">AI Tutor</span>
        </div>
        <div className="flex items-center gap-2">
          {credits !== null && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <span className="material-icons text-[14px] text-amber-500">bolt</span>
              <span className="text-[11px] font-bold">{credits}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="Close AI tutor"
          >
            <span className="material-icons text-slate-400 text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 ${
              msg.role === "user" ? "items-end ml-auto" : ""
            } max-w-[90%]`}
          >
            <div
              className={`p-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-none shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-slate-400 px-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col gap-1 max-w-[90%]">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              onClick={() => sendMessage("", action.key)}
              disabled={loading}
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-bold text-primary hover:border-primary transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-icons text-[12px]">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            placeholder="Ask anything..."
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="material-icons text-sm">send</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
