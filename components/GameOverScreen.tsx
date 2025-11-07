import React from 'react';
import { TrophyIcon } from './icons';

interface GameOverScreenProps {
  score: number;
  onPlayAgain: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onPlayAgain }) => {
  return (
    <div className="text-center animate-fade-in">
      <div className="flex justify-center items-center mb-6">
        <TrophyIcon className="w-24 h-24 text-yellow-500 dark:text-yellow-400" />
      </div>
      <h2 className="text-5xl font-bold mb-4">จบเกม!</h2>
      <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8">
        คะแนนสุดท้ายของคุณ: <span className="text-yellow-500 dark:text-yellow-400 font-bold">{score}</span>
      </p>
      <button
        onClick={onPlayAgain}
        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-purple-500/30"
      >
        เล่นอีกครั้ง
      </button>
    </div>
  );
};

export default GameOverScreen;