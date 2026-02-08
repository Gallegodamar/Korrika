
export interface Question {
  id: number;
  pregunta: string;
  opciones: {
    [key: string]: string;
  };
  respuesta_correcta: string;
  categoryName?: string;
}

export interface QuizData {
  capitulo: string;
  preguntas: Question[];
}

export interface UserAnswer {
  question: Question;
  selectedOption: string | null;
  isCorrect: boolean;
}

export interface Player {
  name: string;
  score: number;
  answers: UserAnswer[];
}

export interface DailyProgress {
  dayIndex: number;
  score: number;
  completed: boolean;
  date: string;
  answers: UserAnswer[];
  players?: Player[]; // Store competition results if any
}

export enum GameState {
  HOME = 'HOME',
  PLAYER_SETUP = 'PLAYER_SETUP',
  COUNTDOWN = 'COUNTDOWN',
  QUIZ = 'QUIZ',
  TURN_TRANSITION = 'TURN_TRANSITION',
  RANKING = 'RANKING',
  RESULTS = 'RESULTS', // Solo results
  SUPERVISOR = 'SUPERVISOR'
}

export type PlayMode = 'DAILY' | 'RANDOM';
