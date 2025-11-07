import React from 'react';

interface PersonalitySelectorProps {
  onSelect: (personality: string) => void;
}

const personalities = [
  { name: 'นักแสดงตลกเสียดสี', emoji: '😏', color: 'bg-red-500 hover:bg-red-600' },
  { name: 'ศาสตราจารย์ผู้รอบรู้', emoji: '🧑‍🏫', color: 'bg-blue-500 hover:bg-blue-600' },
  { name: 'เชียร์ลีดเดอร์ผู้กระตือรือร้น', emoji: '📣', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { name: 'นักสืบสายแข็ง', emoji: '🕵️', color: 'bg-gray-600 hover:bg-gray-700' },
];

const PersonalityCard: React.FC<{ name: string; emoji: string; color: string; onClick: () => void; }> = ({ name, emoji, color, onClick }) => (
    <button onClick={onClick} className={`p-6 rounded-2xl text-white text-center transition-all duration-300 ease-in-out transform hover:-translate-y-2 ${color} w-full`}>
        <div className="text-5xl mb-3">{emoji}</div>
        <div className="text-xl font-semibold">{name}</div>
    </button>
);


const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({ onSelect }) => {
  return (
    <div className="text-center animate-fade-in">
      <h2 className="text-4xl font-bold mb-2">เลือกพิธีกรของคุณ</h2>
      <p className="text-gray-400 mb-8">สิ่งนี้จะกำหนดโทนของเกมทั้งหมด</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personalities.map((p) => (
          <PersonalityCard 
            key={p.name}
            name={p.name}
            emoji={p.emoji}
            color={p.color}
            onClick={() => onSelect(p.name)}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonalitySelector;