import React from 'react';
import { GameIcon } from './icons';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="text-center animate-fade-in">
      <div className="flex justify-center items-center mb-6">
        <GameIcon className="w-24 h-24 text-cyan-500 dark:text-cyan-400" />
      </div>
      <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-500">
        พิธีกรทายปัญหาเจมิไน
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
        ท้าทายพิธีกร AI ด้วยคำถามที่สร้างขึ้นแบบเรียลไทม์ คุณจึงไม่เคยเล่นเกมซ้ำสอง
      </p>
      <button
        onClick={onStart}
        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-full text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-cyan-500/30"
      >
        เริ่มเกม
      </button>
    </div>
  );
};

export default WelcomeScreen;