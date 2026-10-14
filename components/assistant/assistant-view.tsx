"use client";

import { Bot, FlaskConical, MessageSquarePlus, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { mockAssistantReply } from "@/lib/assistant/mock-reply";
import { suggestedPrompts } from "@/lib/sample-data/misc";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssistantView() {
  const state = useAppState();
  const { addChatMessage, newConversation } = useAppActions();
  const { conversations } = state;
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === selectedId) ?? conversations[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [active?.messages.length, pendingId]);

  function send(text: string) {
    const content = text.trim();
    if (!content || !active || pendingId) return;
    const conversationId = active.id;
    addChatMessage(conversationId, "user", content);
    setDraft("");
    setPendingId(conversationId);
    // Simulated latency so the prototype feels like a real chat.
    setTimeout(() => {
      addChatMessage(conversationId, "assistant", mockAssistantReply(content, state));
      setPendingId(null);
    }, 700);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function startNewChat() {
    setSelectedId(newConversation());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
          <p className="mt-1 text-sm text-muted">Plan your day, review habits, and find things to do.</p>
        </div>
        <div
          role="note"
          className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
        >
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
          Prototype — not connected to a real AI model. Replies are generated from sample data.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Conversation list */}
        <nav aria-label="Conversations" className="min-w-0 rounded-2xl border border-line bg-panel p-3">
          <Button variant="secondary" size="sm" className="mb-2 w-full" onClick={startNewChat}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            New chat
          </Button>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {conversations.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-current={c.id === active?.id ? "true" : undefined}
                  className={cn(
                    "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    c.id === active?.id ? "bg-accent-soft text-fg" : "text-muted hover:bg-hover hover:text-fg",
                  )}
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Chat panel */}
        <section aria-label={active ? `Conversation: ${active.title}` : "Conversation"} className="flex h-[calc(100dvh-19rem)] min-h-[28rem] flex-col rounded-2xl border border-line bg-panel lg:h-[calc(100dvh-14rem)]">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            {active && active.messages.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">Start a conversation</p>
                  <p className="mt-1 text-sm text-subtle">Pick a suggestion below or type your own question.</p>
                </div>
              </div>
            )}
            {active?.messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {pendingId === active?.id && (
              <div className="flex items-center gap-2 text-sm text-subtle">
                <AssistantAvatar />
                <span className="sr-only">Assistant is typing</span>
                <span className="inline-flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-subtle" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-subtle [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-subtle [animation-delay:240ms]" />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-3 sm:p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Suggested prompts">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={!!pendingId}
                  className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Message the assistant
              </label>
              <input
                id="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about your tasks, habits, or events…"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raised px-4 text-sm text-fg placeholder:text-subtle hover:border-line-strong focus-visible:border-accent"
              />
              <Button type="submit" variant="primary" size="icon" className="h-11 w-11 rounded-xl" disabled={!draft.trim() || !!pendingId} aria-label="Send message">
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong" aria-hidden="true">
      <Bot className="h-4 w-4" />
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "justify-end")}>
      {!isUser && <AssistantAvatar />}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
          isUser ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md border border-line bg-raised text-fg",
        )}
      >
        <span className="sr-only">{isUser ? "You: " : "Assistant: "}</span>
        {message.content}
      </div>
    </div>
  );
}
