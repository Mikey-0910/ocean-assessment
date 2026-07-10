interface OptionButtonProps {
  label: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}

export function OptionButton({ label, text, selected, onClick }: OptionButtonProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${
          selected
            ? 'border-brand-primary bg-[#e6eeff]'
            : 'border-gray-200 bg-white hover:border-brand-primary hover:bg-[#f0f4ff]'
        }
      `}
    >
      <span className="font-bold text-brand-primary min-w-[24px]">{label}</span>
      <span className="flex-1 leading-relaxed text-gray-700">{text}</span>
    </div>
  );
}

interface OpenTextAreaProps {
  value: string;
  prompt: string;
  scoring: boolean;
  score: number;
  isFallback?: boolean;
  reason: string;
  errorMsg?: string;
  onChange: (text: string) => void;
  onConfirm: () => void;
}

export function OpenTextArea({
  value,
  prompt,
  scoring,
  score,
  isFallback,
  reason,
  errorMsg,
  onChange,
  onConfirm,
}: OpenTextAreaProps) {
  const canConfirm = value.trim().length >= 3 && score === 0 && !scoring;
  const hasResult = score > 0 && value.trim().length >= 3;

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={prompt}
        className="w-full min-h-[100px] p-3 border-2 border-gray-200 rounded-xl text-[15px]
          resize-y font-sans focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(74,136,216,0.12)]
          transition-all"
      />

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{errorMsg}</div>
      )}

      {scoring && (
        <div className="p-3 bg-blue-50 text-brand-primary text-sm rounded-lg">
          AI 正在评分，请稍候……
        </div>
      )}

      {canConfirm && (
        <button
          onClick={onConfirm}
          className="btn-primary px-7 py-3 rounded-lg text-white font-medium
            bg-gradient-to-r from-brand-primary to-brand-primary-dark
            hover:-translate-y-px hover:shadow-lg transition-all"
        >
          确定本题，让 AI 评分
        </button>
      )}

      {hasResult && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
          {isFallback ? '本地规则评分' : 'AI 评分完成'}：{score.toFixed(1)} 分。{reason}
        </div>
      )}
    </div>
  );
}

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  scenario: string;
  text: string;
  children: React.ReactNode;
}

export function QuestionCard({
  questionNumber,
  totalQuestions,
  scenario,
  text,
  children,
}: QuestionCardProps) {
  const progress = ((questionNumber) / totalQuestions) * 100;

  return (
    <div className="card">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>第 {questionNumber} / {totalQuestions} 题</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-brand-primary to-brand-auxiliary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="inline-block bg-brand-primary text-white px-3 py-1 rounded-full text-xs mb-3">
        第 {questionNumber} 题
      </div>
      <p className="text-lg leading-relaxed mb-5 text-gray-800">
        【{scenario}】{text}
      </p>

      {children}
    </div>
  );
}

interface RedLineWarningProps {
  children: React.ReactNode;
}

export function RedLineWarning({ children }: RedLineWarningProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 px-4 py-3 rounded-r-lg my-4 text-red-700 text-sm">
      {children}
    </div>
  );
}
