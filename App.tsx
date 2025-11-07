import React, { useState, useCallback, useEffect } from 'react';
import { GameState } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import TriviaGame from './components/TriviaGame';
import GameOverScreen from './components/GameOverScreen';
import DarkModeToggle from './components/DarkModeToggle';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
  const [personality, setPersonality] = useState<string>('เป็นกลางและให้ข้อมูล');
  const [score, setScore] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleStartGame = useCallback(() => {
    setScore(0);
    setGameState(GameState.IN_GAME);
  }, []);
  
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState(GameState.GAME_OVER);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setScore(0);
    setGameState(GameState.IN_GAME);
  }, []);

  const renderGameState = () => {
    switch (gameState) {
      case GameState.WELCOME:
        return <WelcomeScreen onStart={handleStartGame} />;
      case GameState.IN_GAME:
        return <TriviaGame personality={personality} onGameOver={handleGameOver} />;
      case GameState.GAME_OVER:
        return <GameOverScreen score={score} onPlayAgain={handlePlayAgain} />;
      default:
        return <WelcomeScreen onStart={handleStartGame} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto relative">
        <div className="absolute top-0 right-0 z-10">
            <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        </div>
        {renderGameState()}
      </div>
    </div>
  );
};

export default App;