import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { HeroSection } from '@/components/report/HeroSection';
import { RadarChart } from '@/components/report/RadarChart';
import { OverviewSummary } from '@/components/report/OverviewSummary';
import { DimensionCarousel } from '@/components/report/DimensionCarousel';
import { AiAgentCard, AiSuggestionCards } from '@/components/report/AiSuggestionCards';
import { ChatBox } from '@/components/chat/ChatBox';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { BackgroundBlobs } from '@/components/ui/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  aiSuggestions,
  aiSuggestedQuestions,
  generateOverallPortrait,
} from '@/lib/dimensionData';
import { MessageSquarePlus, ChevronDown, RotateCcw, Printer, Copy } from 'lucide-react';
import type { DimensionCode } from '@/types';

export function ReportPage() {
  const {
    results,
    openTextInfo,
    activeDimensionIndex,
    setActiveDimensionIndex,
    chatMessages,
    isChatOpen,
    setIsChatOpen,
    chatLoading,
    sendAiMessage,
    restartAssessment,
  } = useAppContext();

  const [openTextExpanded, setOpenTextExpanded] = useState(true);

  // Scroll reveal hack: trigger after render
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    // Trigger hero animation immediately
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => observer.disconnect();
  }, []);

  const handleCopyData = () => {
    if (!results) return;
    const data = {
      测评时间: new Date().toLocaleString('zh-CN'),
      整体画像: generateOverallPortrait(results),
      各维度分数: {
        开放性: { 总分: results.O.total, 均分: results.O.avg, 等级: results.O.level },
        尽责性: { 总分: results.C.total, 均分: results.C.avg, 等级: results.C.level },
        外向性: { 总分: results.E.total, 均分: results.E.avg, 等级: results.E.level },
        宜人性: { 总分: results.A.total, 均分: results.A.avg, 等级: results.A.level },
        神经质: { 总分: results.N.total, 均分: results.N.avg, 等级: results.N.level },
      },
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      alert('画像数据已复制，可以粘贴到画像答疑 Agent 中继续提问。');
    }).catch(() => {
      alert('复制失败，请手动复制。');
    });
  };

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">没有测评数据，请先完成测评。</p>
      </div>
    );
  }

  const summary = generateOverallPortrait(results);

  return (
    <div className="bg-brand-bg">
      <BackgroundBlobs />

      {/* ===== Hero ===== */}
      <HeroSection results={results} summary={summary} onRestart={restartAssessment} />

      {/* ===== 人格总览 ===== */}
      <section id="overview" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="人格总览" title="看见自己的形状" className="mb-12" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Radar */}
            <div className="reveal reveal-delay-1 lg:col-span-7">
              <Card className="card-float">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-700">五维雷达图</h3>
                  <span className="text-xs text-gray-400">分数范围 5-20</span>
                </div>
                <RadarChart results={results} activeDimensionIndex={activeDimensionIndex} />
              </Card>
            </div>

            {/* Right: Summary */}
            <div className="reveal reveal-delay-2 lg:col-span-5 space-y-6">
              <OverviewSummary results={results} summary={summary} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 人格维度轮播 ===== */}
      <section id="dimensions" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            tag="人格维度"
            title="五个面向，一个你"
            subtitle="左右切换，深入了解每一个维度"
            className="text-center mb-12"
          />

          <div className="reveal reveal-delay-1">
            <DimensionCarousel
              results={results}
              activeIndex={activeDimensionIndex}
              onIndexChange={setActiveDimensionIndex}
            />
          </div>
        </div>
      </section>

      {/* ===== AI 人格分析师 ===== */}
      <section id="ai-agent-section" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AiAgentCard
            onStartChat={() => setIsChatOpen(true)}
            onSuggestedQuestion={(q) => {
              setIsChatOpen(true);
              sendAiMessage(q);
            }}
            suggestedQuestions={aiSuggestedQuestions}
          />
        </div>
      </section>

      {/* ===== AI 建议 ===== */}
      <section id="suggestions" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            tag="AI 给你的建议"
            title="为你量身定制的成长指南"
            subtitle="基于你的测评结果，这里有三条温柔提醒"
            className="text-center mb-12"
          />

          <AiSuggestionCards suggestions={aiSuggestions} />
        </div>
      </section>

      {/* ===== 开放题说明 ===== */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <details
            className="reveal glass rounded-2xl overflow-hidden"
            open={openTextExpanded}
          >
            <summary
              className="flex items-center justify-between p-6 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setOpenTextExpanded(!openTextExpanded);
              }}
            >
              <div className="flex items-center gap-3">
                <MessageSquarePlus className="w-5 h-5 text-brand-primary" />
                <span className="font-medium">开放题说明</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${
                  openTextExpanded ? 'rotate-180' : ''
                }`}
              />
            </summary>
            <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
              <p>{openTextInfo.note}</p>
            </div>
          </details>
        </div>
      </section>

      {/* ===== 底部操作栏 ===== */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={restartAssessment}
          >
            重新测评
          </Button>
          <Button
            variant="secondary"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            打印报告
          </Button>
          <Button
            variant="primary"
            icon={<Copy className="w-4 h-4" />}
            onClick={handleCopyData}
          >
            复制数据
          </Button>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <div className="h-8" />
      <footer className="py-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-gray-400 leading-relaxed">
            测评结果只是你当前状态的一个参考，不是永久标签，也不是专业诊断。如果你对结果感到困惑或焦虑，建议与信任的朋友聊聊，或联系学校心理咨询中心。
          </p>
        </div>
      </footer>

      <div className="h-32" />

      {/* ===== AI 聊天模态 ===== */}
      <ChatBox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSend={sendAiMessage}
        isLoading={chatLoading}
        suggestedQuestions={aiSuggestedQuestions}
        onQuickAction={(q) => sendAiMessage(q)}
      />
    </div>
  );
}
