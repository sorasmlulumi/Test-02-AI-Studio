
export interface TriviaQuestion {
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export enum GameState {
  WELCOME,
  IN_GAME,
  GAME_OVER,
}

export enum GameStatus {
  LOADING_QUESTIONS,
  READING_QUESTION,
  WAITING_FOR_ANSWER,
  RECORDING_ANSWER,
  EVALUATING_ANSWER,
  SHOWING_RESULT,
}
