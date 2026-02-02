
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
  selectedOption: string | null; // null if timeout
  isCorrect: boolean;
}

export interface DailyProgress {
  dayIndex: number; // 0 to 10
  score: number;
  completed: boolean;
  date: string; // ISO string of when it was completed
  answers: UserAnswer[];
}

export enum GameState {
  HOME = 'HOME',
  COUNTDOWN = 'COUNTDOWN',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS',
  SUPERVISOR = 'SUPERVISOR'
}
