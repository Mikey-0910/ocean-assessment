import { useState, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { questions, optionTexts, optionScores, scoreOpenTextLocal } from '@/lib/assessmentData';
import { OptionButton, OpenTextArea, QuestionCard } from '@/components/assessment/AssessmentComponents';
import {
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

export function AssessmentPage() {
  const {
    currentQuestion,
    setCurrentQuestion,
    answers,
    setAnswer,
    finishAssessment,
    backendAvailable,
    checkBackend,
  } = useAppContext();

  const q = questions[currentQuestion];
  const ans = answers[q.id];
  const texts = optionTexts[q.id];

  const handleSelectOption = useCallback(
    (label: string) => {
      if (label !== 'E') {
        setAnswer(q.id, {
          choice: label as 'A' | 'B' | 'C' | 'D' | 'E',
          openText: '',
          score: optionScores[label],
          scoring: false,
          reason: '',
        });
      } else {
        setAnswer(q.id, {
          choice: 'E',
          openText: ans?.openText || '',
          score: 0,
          scoring: false,
          reason: '',
        });
      }
    },
    [q.id, ans, setAnswer]
  );

  const handleOpenTextChange = useCallback(
    (text: string) => {
      setAnswer(q.id, {
        choice: 'E',
        openText: text,
        score: 0,
        scoring: false,
        reason: '',
      });
    },
    [q.id, setAnswer]
  );

  const handleConfirmOpenText = useCallback(async () => {
    if (!ans || ans.openText.trim().length < 3) {
      alert('请先输入补充说明（至少 3 个字）');
      return;
    }

    // Mark scoring
    setAnswer(q.id, { ...ans, scoring: true, errorMsg: '' });

    // Try backend
    let avail = backendAvailable;
    if (avail === null) {
      avail = await checkBackend();
    }

    if (avail === false) {
      // Use local
      const score = scoreOpenTextLocal(ans.openText);
      setAnswer(q.id, {
        ...ans,
        scoring: false,
        score,
        reason: '本地规则评分（后端不可用）',
        isFallback: true,
      });
      return;
    }

    // Call backend scoring
    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: q.id,
          dimension: q.dimension,
          question_text: q.text,
          options: {
            A: texts[0],
            B: texts[1],
            C: texts[2],
            D: texts[3],
          },
          open_text: ans.openText,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setAnswer(q.id, {
          ...ans,
          scoring: false,
          score: scoreOpenTextLocal(ans.openText),
          reason: `后端评分失败：${data.error}`,
          isFallback: true,
          errorMsg: `后端错误：${data.error}，已降级为本地规则`,
        });
      } else {
        setAnswer(q.id, {
          ...ans,
          scoring: false,
          score: data.score,
          reason: data.reason || 'LLM 评分',
          isFallback: data.fallback || false,
          errorMsg: '',
        });
      }
    } catch {
      setAnswer(q.id, {
        ...ans,
        scoring: false,
        score: scoreOpenTextLocal(ans.openText),
        reason: '后端连接失败，已降级为本地规则评分',
        isFallback: true,
        errorMsg: '无法连接后端，已降级为本地规则评分',
      });
    }
  }, [ans, q, setAnswer, backendAvailable, checkBackend, texts]);

  const canGoNext = (() => {
    if (!ans) return false;
    if (ans.choice === 'E') {
      if (!ans.openText || ans.openText.trim() === '') return false;
      if (ans.scoring) return false;
      if (ans.score === 0) return false;
    }
    return true;
  })();

  const isLast = currentQuestion === questions.length - 1;

  const handleNext = () => {
    if (isLast) {
      finishAssessment();
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="max-w-3xl w-full mx-auto">
        {/* Title */}
        <h1 className="text-center text-3xl md:text-4xl font-bold text-white mb-2">
          OCEAN 人格情境测评
        </h1>
        <p className="text-center text-white/80 text-sm mb-8">
          请根据你的真实反应选择
        </p>

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
          <QuestionCard
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            scenario={q.scenario}
            text={q.text}
          >
            {/* Options */}
            <div className="flex flex-col gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((label, idx) => (
                <OptionButton
                  key={label}
                  label={label}
                  text={texts[idx]}
                  selected={ans?.choice === label}
                  onClick={() => handleSelectOption(label)}
                />
              ))}

              <OptionButton
                label="E"
                text="以上都不符合，我想自己说明"
                selected={ans?.choice === 'E'}
                onClick={() => handleSelectOption('E')}
              />
            </div>

            {/* Open text area */}
            {ans?.choice === 'E' && (
              <OpenTextArea
                value={ans.openText}
                prompt={q.prompt}
                scoring={ans.scoring}
                score={ans.score}
                isFallback={ans.isFallback}
                reason={ans.reason}
                errorMsg={ans.errorMsg}
                onChange={handleOpenTextChange}
                onConfirm={handleConfirmOpenText}
              />
            )}
          </QuestionCard>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrev}
              disabled={currentQuestion === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-lg
                font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              上一题
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-primary-dark
                text-white rounded-lg font-medium hover:-translate-y-px hover:shadow-lg
                transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLast ? '查看报告' : '下一题'}
              {!isLast && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
