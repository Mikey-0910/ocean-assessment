import type { AiSuggestion, SuggestedQuestion } from '@/types';
import {
  BookOpen,
  Sprout,
  Users,
  Sparkles,
  MessageCircleHeart,
  ArrowRight,
  Briefcase,
  Heart,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  sprout: Sprout,
  users: Users,
};

interface AiSuggestionCardsProps {
  suggestions: AiSuggestion[];
}

export function AiSuggestionCards({ suggestions }: AiSuggestionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {suggestions.map((item, i) => {
        const Icon = iconMap[item.icon] || BookOpen;
        return (
          <div
            key={i}
            className={`reveal reveal-delay-${Math.min(i + 1, 4)} glass rounded-3xl p-7 card-float`}
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center mb-5`}
            >
              <Icon className={`w-6 h-6 text-${item.color}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
            <p className="text-gray-600 leading-relaxed text-sm">{item.content}</p>
          </div>
        );
      })}
    </div>
  );
}

const questionIconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  'book-open': BookOpen,
  users: Users,
  heart: Heart,
};

interface AiAgentCardProps {
  onStartChat: () => void;
  onSuggestedQuestion: (question: string) => void;
  suggestedQuestions: SuggestedQuestion[];
}

export function AiAgentCard({
  onStartChat,
  onSuggestedQuestion,
  suggestedQuestions,
}: AiAgentCardProps) {
  return (
    <div className="reveal relative overflow-hidden glass-strong rounded-3xl p-8 md:p-10
      hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(74,136,216,0.16)]
      transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]">
      {/* BG Glow */}
      <div className="absolute -top-20 -right-16 w-[280px] h-[280px] rounded-full
        bg-[radial-gradient(circle,rgba(74,136,216,0.12),transparent_70%)] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 text-center md:text-left">
          <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-r from-brand-primary via-brand-auxiliary to-brand-warm flex-shrink-0">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-primary to-brand-auxiliary flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">AI 人格分析师</h2>
              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">在线</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">已加载你的专属人格画像</p>
            <p className="text-gray-500 leading-relaxed mt-3 max-w-lg">
              还想更了解自己？AI 已经阅读了你的测评结果，随时准备与你一起探索。你可以问它职业方向、学习风格、人际关系，或任何关于你人格画像的问题。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center md:justify-start mb-10">
          <button
            onClick={onStartChat}
            className="inline-flex items-center gap-2.5 px-9 py-4 text-white text-[17px] font-semibold rounded-full
              bg-gradient-to-r from-brand-primary via-[#5B9EE8] to-brand-auxiliary bg-[length:200%_200%]
              shadow-[0_8px_32px_rgba(74,136,216,0.32)]
              animate-pulse-soft
              hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_16px_44px_rgba(74,136,216,0.44)]
              hover:bg-[position:100%_0]
              active:scale-[0.97]
              transition-all duration-300"
          >
            <MessageCircleHeart className="w-5 h-5" />
            立即开始对话
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Suggested Questions */}
        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-400 mb-4 text-center md:text-left">
            或者从一个话题开始：
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedQuestions.map((q, i) => {
              const QIcon = questionIconMap[q.icon] || Heart;
              return (
                <button
                  key={i}
                  onClick={() => onSuggestedQuestion(q.text)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/70 border border-brand-primary/15
                    text-[13px] text-gray-600 hover:text-brand-primary hover:bg-brand-primary/[0.06] hover:border-brand-primary/35
                    hover:-translate-y-px transition-all text-left"
                >
                  <QIcon className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                  <span>{q.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
