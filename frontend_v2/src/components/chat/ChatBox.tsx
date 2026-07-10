import React, { useState, useEffect, type ReactNode } from 'react';
import type { ChatMessage, SuggestedQuestion } from '@/types';
import { Send, X, Sparkles, Bot } from 'lucide-react';
import { Briefcase, BookOpen, Users, Heart, type LucideIcon } from 'lucide-react';

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
  suggestedQuestions: SuggestedQuestion[];
  onQuickAction: (question: string) => void;
}

export function ChatBox({
  isOpen,
  onClose,
  messages,
  onSend,
  isLoading,
  suggestedQuestions,
  onQuickAction,
}: ChatBoxProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput('');
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        inputEl?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-md z-100 flex items-center justify-center
          transition-opacity duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-label="AI 人格分析师对话"
      >
        {/* Modal */}
        <div
          className={`
            w-[520px] max-w-[calc(100vw-32px)] h-[700px] max-h-[calc(100vh-64px)]
            rounded-3xl flex flex-col overflow-hidden
            glass-strong shadow-lift
            transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isOpen ? 'scale-100 translate-y-0' : 'scale-[0.94] translate-y-6'}
            max-sm:w-full max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full p-[3px] bg-gradient-to-r from-brand-primary via-brand-auxiliary to-brand-warm">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-primary to-brand-auxiliary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-800">AI 人格分析师</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">在线 · 已加载你的专属人格画像</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-auxiliary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] text-sm leading-relaxed ${
                      isUser
                        ? 'bg-white border border-gray-200 shadow-sm text-gray-700 rounded-[18px_18px_4px_18px] px-4 py-3'
                        : 'bg-[#F0F4FF] text-gray-700 rounded-[18px_18px_18px_4px] px-4 py-3'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-auxiliary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#F0F4FF] rounded-[18px_18px_18px_4px] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Empty state: quick questions */}
            {messages.length <= 1 && !isLoading && (
              <div className="pl-11">
                <p className="text-xs text-gray-400 mb-2">你可以试试这样问：</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <QuickQuestionButton
                      key={i}
                      icon={q.icon}
                      text={q.text}
                      onClick={() => onQuickAction(q.text)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 bg-white/50">
            <div className="flex items-center gap-2">
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm
                  focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(74,136,216,0.12)]
                  transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center
                  hover:bg-brand-primary-dark transition-colors flex-shrink-0 disabled:opacity-50
                  hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


const quickIcons: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  'book-open': BookOpen,
  users: Users,
  heart: Heart,
};

function QuickQuestionButton({
  icon,
  text,
  onClick,
}: {
  icon: string;
  text: string;
  onClick: () => void;
}) {
  const Icon = quickIcons[icon] || Heart;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/70 border border-brand-primary/15
        text-[13px] text-gray-600 hover:text-brand-primary hover:bg-brand-primary/[0.06] hover:border-brand-primary/35
        hover:-translate-y-px transition-all text-left"
    >
      <Icon className="w-4 h-4 flex-shrink-0 text-brand-primary" />
      <span>{text}</span>
    </button>
  );
}
