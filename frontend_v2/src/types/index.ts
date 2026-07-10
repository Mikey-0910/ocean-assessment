export interface DimensionKey {
  O: 'O';
  C: 'C';
  E: 'E';
  A: 'A';
  N: 'N';
}

export type DimensionCode = keyof DimensionKey;

export type Level = '高' | '中' | '低';

export interface DimensionResult {
  total: number;
  avg: number;
  level: Level;
  evidence?: string[];
}

export interface AssessmentResults {
  O: DimensionResult;
  C: DimensionResult;
  E: DimensionResult;
  A: DimensionResult;
  N: DimensionResult;
}

export interface OpenTextInfo {
  count: number;
  dimensions: DimensionCode[];
  note: string;
}

export interface Question {
  id: number;
  dimension: DimensionCode;
  scenario: string;
  text: string;
  prompt: string;
}

export interface Answer {
  choice: 'A' | 'B' | 'C' | 'D' | 'E';
  openText: string;
  score: number;
  scoring: boolean;
  reason: string;
  isFallback?: boolean;
  errorMsg?: string;
}

export interface AnswersMap {
  [questionId: number]: Answer;
}

export interface LevelProfile {
  tagline: string;
  definition: string;
  campus: string[];
  gifts: string;
  shadows: string;
  tip: string;
}

export interface DimensionMeta {
  key: DimensionCode;
  name: string;
  nameEn: string;
  color: string;
  icon: string;
  levels: Record<Level, LevelProfile>;
}

export interface AppState {
  user: { name: string };
  reportDate: string;
  results: AssessmentResults;
  openText: OpenTextInfo;
  activeDimensionIndex: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSuggestion {
  icon: string;
  title: string;
  color: string;
  bg: string;
  content: string;
}

export interface SuggestedQuestion {
  icon: string;
  text: string;
}

export interface ArchetypeRule {
  test: (results: AssessmentResults) => boolean;
  name: string;
}

export interface OverallPortrait {
  [dim: string]: Record<Level, string>;
}
