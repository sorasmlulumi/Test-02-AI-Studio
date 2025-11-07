import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TriviaQuestion, GameStatus } from '../types';
import * as geminiService from '../services/geminiService';
import { playAudio } from '../services/audioUtils';
import { MicIcon, StopIcon, LoadingIcon } from './icons';

interface TriviaGameProps {
  personality: string;
  onGameOver: (finalScore: number) => void;
}

const TriviaGame: React.FC<TriviaGameProps> = ({ personality, onGameOver }) => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.LOADING_QUESTIONS);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState({ isCorrect: false, text: '' });
  const [userAnswer, setUserAnswer] = useState('');
  
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const loadQuestions = useCallback(async () => {
    setStatus(GameStatus.LOADING_QUESTIONS);
    const fetchedQuestions = await geminiService.generateTriviaQuestions();
    setQuestions(fetchedQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setStatus(GameStatus.READING_QUESTION);
  }, []);

  const readQuestion = useCallback(async () => {
    if (questions.length > 0) {
      const q = questions[currentQuestionIndex];
      const textToRead = `${q.question} ตัวเลือกของคุณคือ: ${q.options.join(', ')}.`;
      try {
        const audio = await geminiService.textToSpeech(textToRead);
        await playAudio(audio);
      } catch (error) {
        console.error("Error in reading question audio:", error);
      } finally {
        setStatus(GameStatus.WAITING_FOR_ANSWER);
      }
    }
  }, [questions, currentQuestionIndex]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (status === GameStatus.READING_QUESTION) {
      readQuestion();
    }
  }, [status, readQuestion]);

  const handleStartRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setStatus(GameStatus.RECORDING_ANSWER);
        geminiService.transcribeUserAnswer(stream).then(transcript => {
            setUserAnswer(transcript);
            setStatus(GameStatus.EVALUATING_ANSWER);
        }).catch(err => {
            console.error("Transcription failed", err);
            setStatus(GameStatus.WAITING_FOR_ANSWER);
        });
    } catch (err) {
        console.error("Error getting microphone access:", err);
        alert("จำเป็นต้องเข้าถึงไมโครโฟนเพื่อเล่น กรุณาอนุญาตการเข้าถึงและรีเฟรช");
    }
  };

  const handleStopRecording = () => {
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if ((window as any).stopTranscription) {
      (window as any).stopTranscription();
    }
    // The promise in handleStartRecording will resolve, changing the status
  };
  
  const evaluateAnswer = useCallback(async () => {
    const q = questions[currentQuestionIndex];
    const result = await geminiService.evaluateAnswer(personality, q, userAnswer);
    setFeedback({ isCorrect: result.isCorrect, text: result.feedback });
    if (result.isCorrect) {
      setScore(prev => prev + 1);
    }
    try {
        const audio = await geminiService.textToSpeech(result.feedback);
        await playAudio(audio);
    } catch(err){
        console.error("Error playing feedback audio", err);
    } finally {
        setStatus(GameStatus.SHOWING_RESULT);
    }
  }, [currentQuestionIndex, questions, personality, userAnswer]);

  useEffect(() => {
    if (status === GameStatus.EVALUATING_ANSWER && userAnswer) {
      evaluateAnswer();
    }
  }, [status, userAnswer, evaluateAnswer]);
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStatus(GameStatus.READING_QUESTION);
      setFeedback({ isCorrect: false, text: '' });
      setUserAnswer('');
    } else {
      onGameOver(score);
    }
  };
  
  const handleOptionClick = (option: string) => {
    if (status !== GameStatus.WAITING_FOR_ANSWER) return;
    setUserAnswer(option);
    setStatus(GameStatus.EVALUATING_ANSWER);
  };
  
  const currentQuestion = questions[currentQuestionIndex];
  
  if (status === GameStatus.LOADING_QUESTIONS || !currentQuestion) {
      return <div className="text-center"><LoadingIcon className="w-12 h-12 animate-spin mx-auto" /><p className="mt-4 text-xl">กำลังสร้างคำถามทายปัญหาใหม่...</p></div>
  }

  const getOptionClassName = (option: string) => {
    const baseClasses = 'w-full p-4 rounded-lg text-lg transition-all duration-200 border-2 border-transparent text-left';
    
    if (status === GameStatus.SHOWING_RESULT) {
        if (option === currentQuestion.correctAnswer) {
            return `${baseClasses} bg-green-100 dark:bg-green-500/20 border-green-500`;
        }
        if (option === userAnswer && !feedback.isCorrect) {
            return `${baseClasses} bg-red-100 dark:bg-red-500/20 border-red-500`;
        }
        return `${baseClasses} bg-gray-100 dark:bg-gray-800 opacity-60`;
    }

    if (status === GameStatus.WAITING_FOR_ANSWER) {
      return `${baseClasses} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-cyan-500 dark:hover:border-cyan-400 cursor-pointer`;
    }
    
    // Disabled state
    return `${baseClasses} bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed`;
  };

  const renderContent = () => {
    if (status === GameStatus.SHOWING_RESULT) {
      return (
        <div className="text-center animate-fade-in">
          <h3 className={`text-4xl font-bold mb-4 ${feedback.isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {feedback.isCorrect ? 'ถูกต้อง!' : 'ผิด!'}
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{`คำตอบที่ถูกต้องคือ: ${currentQuestion.correctAnswer}`}</p>
          <p className="text-xl italic text-cyan-600 dark:text-cyan-300 mb-8">"{feedback.text}"</p>
          <button onClick={handleNextQuestion} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
            {currentQuestionIndex < questions.length - 1 ? 'คำถามถัดไป' : 'จบเกม'}
          </button>
        </div>
      );
    }
    
    return (
      <>
        <p className="text-cyan-600 dark:text-cyan-400 font-semibold">{currentQuestion.category}</p>
        <h2 className="text-3xl font-bold my-4 text-center">{currentQuestion.question}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
            {currentQuestion.options.map((opt, index) => (
                <button 
                  key={opt}
                  onClick={() => handleOptionClick(opt)}
                  disabled={status !== GameStatus.WAITING_FOR_ANSWER}
                  className={getOptionClassName(opt)}
                >
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 mr-3">{String.fromCharCode(65 + index)}.</span>
                  {opt}
                </button>
            ))}
        </div>
        <div className="flex flex-col items-center justify-center mt-8">
            <div className="flex items-center w-full mb-4">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400">หรือ</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            {status === GameStatus.WAITING_FOR_ANSWER && <button onClick={handleStartRecording} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"><MicIcon className="w-6 h-6" /> พูดคำตอบของคุณ</button>}
            {status === GameStatus.RECORDING_ANSWER && <button onClick={handleStopRecording} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full animate-pulse"><StopIcon className="w-6 h-6" /> หยุดบันทึกเสียง</button>}
            {status === GameStatus.READING_QUESTION && <div className="text-lg text-yellow-600 dark:text-yellow-400">ฟังพิธีกร...</div>}
            {status === GameStatus.EVALUATING_ANSWER && <div className="text-center"><LoadingIcon className="w-8 h-8 animate-spin mx-auto" /><p className="mt-2 text-lg">พิธีกรกำลังคิด...</p></div>}
        </div>
      </>
    );
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full animate-fade-in-up transition-colors duration-300">
      <div className="flex justify-between items-center text-xl mb-6">
        <div className="font-bold">คะแนน: <span className="text-green-500 dark:text-green-400">{score}</span></div>
        <div className="font-bold">คำถามที่: <span className="text-cyan-500 dark:text-cyan-400">{currentQuestionIndex + 1}</span> / {questions.length}</div>
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-8">
        <div className="h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}}></div>
      </div>
      {renderContent()}
    </div>
  );
};

export default TriviaGame;