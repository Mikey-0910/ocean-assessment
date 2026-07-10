import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AnswersMap, AssessmentResults, ChatMessage, OpenTextInfo, DimensionCode } from '@/types';
import { questions, computeResults } from '@/lib/assessmentData';
import { dimensionData, generateOverallPortrait } from '@/lib/dimensionData';

const API_BASE_URL = '';

interface AppContextType {
  currentQuestion: number;
  answers: AnswersMap;
  results: AssessmentResults | null;
  openTextInfo: OpenTextInfo;
  activeDimensionIndex: number;
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  chatLoading: boolean;
  backendAvailable: boolean | null;
  currentProfile: Record<string, { total: number; avg: number; level: string }> | null;

  setCurrentQuestion: (n: number) => void;
  setAnswer: (questionId: number, answer: AnswersMap[number]) => void;
  startAssessment: () => void;
  finishAssessment: () => void;
  restartAssessment: () => void;
  setActiveDimensionIndex: (n: number) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setIsChatOpen: (open: boolean) => void;
  setChatLoading: (loading: boolean) => void;
  checkBackend: () => Promise<boolean>;
  sendAiMessage: (text: string) => Promise<void>;
  assessmentPhase: 'welcome' | 'assessment' | 'report';
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [assessmentPhase, setAssessmentPhase] = useState<'welcome' | 'assessment' | 'report'>('welcome');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [openTextInfo, setOpenTextInfo] = useState<OpenTextInfo>({ count: 0, dimensions: [], note: '' });
  const [activeDimensionIndex, setActiveDimensionIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Record<string, { total: number; avg: number; level: string }> | null>(null);

  const setAnswer = useCallback((questionId: number, answer: AnswersMap[number]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const startAssessment = useCallback(() => {
    setAssessmentPhase('assessment');
    setCurrentQuestion(0);
    setAnswers({});
  }, []);

  const finishAssessment = useCallback(() => {
    const computed = computeResults(answers);
    setResults(computed);
    setAssessmentPhase('report');
    setActiveDimensionIndex(0);

    // Build profile for chat
    const profile: Record<string, { total: number; avg: number; level: string }> = {};
    (['O', 'C', 'E', 'A', 'N'] as DimensionCode[]).forEach((d) => {
      profile[d] = {
        total: computed[d].total,
        avg: computed[d].avg,
        level: computed[d].level,
      };
    });
    setCurrentProfile(profile);

    // Open text info
    const openTextDims = new Set<DimensionCode>();
    let count = 0;
    questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans && ans.choice === 'E') {
        count++;
        openTextDims.add(q.dimension);
      }
    });

    if (count > 0) {
      const dimsText = Array.from(openTextDims)
        .map((d) => dimensionData[d].name)
        .join('、');
      setOpenTextInfo({
        count,
        dimensions: Array.from(openTextDims),
        note: `本次测评中，你有 ${count} 道题使用了开放说明，主要分布在${dimsText}维度。这些补充说明已按评分标准纳入对应维度总分。若后端不可用，系统会自动降级为本地规则评分，结果仅供参考。`,
      });
    } else {
      setOpenTextInfo({
        count: 0,
        dimensions: [],
        note: '本次测评中，你没有使用开放说明，全部使用选项作答。',
      });
    }

    // Welcome chat message
    setChatMessages([
      {
        role: 'assistant',
        content: '你好呀 👋 我已经读完你的测评报告了。你可以问我关于职业方向、学习风格、人际关系，或者对某个维度分数感到好奇——我会结合你的画像，给你一些参考建议。',
      },
    ]);
  }, [answers]);

  const restartAssessment = useCallback(() => {
    setAssessmentPhase('welcome');
    setCurrentQuestion(0);
    setAnswers({});
    setResults(null);
    setCurrentProfile(null);
    setChatMessages([]);
    setIsChatOpen(false);
    setActiveDimensionIndex(0);
  }, []);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        const available = data.api_key_configured === true;
        setBackendAvailable(available);
        return available;
      }
    } catch {
      // backend unreachable
    }
    setBackendAvailable(false);
    return false;
  }, []);

  const sendAiMessage = useCallback(
    async (text: string) => {
      if (!currentProfile) return;
      addChatMessage({ role: 'user', content: text });
      setChatLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...chatMessages, { role: 'user', content: text }],
            profile: currentProfile,
          }),
        });

        const data = await response.json();

        if (data.error) {
          addChatMessage({
            role: 'assistant',
            content: `抱歉，AI 暂时无法回复：${data.error}。你可以稍后重试。`,
          });
        } else {
          addChatMessage({ role: 'assistant', content: data.reply });
        }
      } catch {
        addChatMessage({
          role: 'assistant',
          content: '抱歉，网络连接失败。请确认后端服务是否已启动。',
        });
      }

      setChatLoading(false);
    },
    [chatMessages, currentProfile, addChatMessage]
  );

  return (
    <AppContext.Provider
      value={{
        currentQuestion,
        answers,
        results,
        openTextInfo,
        activeDimensionIndex,
        chatMessages,
        isChatOpen,
        chatLoading,
        backendAvailable,
        currentProfile,
        setCurrentQuestion,
        setAnswer,
        startAssessment,
        finishAssessment,
        restartAssessment,
        setActiveDimensionIndex,
        setChatMessages,
        addChatMessage,
        setIsChatOpen,
        setChatLoading,
        checkBackend,
        sendAiMessage,
        assessmentPhase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
