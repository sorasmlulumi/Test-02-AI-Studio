import { GoogleGenAI, Modality, Type, LiveSession, Blob } from "@google/genai";
import { TriviaQuestion } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const questionGenerationModel = 'gemini-2.5-flash';
const ttsModel = 'gemini-2.5-flash-preview-tts';
const liveApiModel = 'gemini-2.5-flash-native-audio-preview-09-2025';
const evaluationModel = 'gemini-2.5-flash';

// FIX: Per documentation, use a loop-based encoder to avoid stack overflow with `String.fromCharCode.apply`.
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateTriviaQuestions(): Promise<TriviaQuestion[]> {
  try {
    const prompt = `สร้างคำถามทายปัญหาที่ไม่ซ้ำกันและท้าทาย 5 ข้อเกี่ยวกับข่าวสารล่าสุดของโลกหรือข้อเท็จจริงที่น่าสนใจในภาษาไทย
    ส่งคืนการตอบกลับเป็นอาร์เรย์ JSON ที่ถูกต้องของอ็อบเจกต์
    แต่ละอ็อบเจกต์ต้องมีคีย์ต่อไปนี้: "category", "question", "options" (อาร์เรย์ของสตริง 4 ค่า), และ "correctAnswer" (สตริงที่ตรงกับหนึ่งในตัวเลือกทุกประการ)
    อย่าใส่ข้อความอื่นหรือการจัดรูปแบบมาร์กดาวน์ในการตอบกลับของคุณ`;

    const response = await ai.models.generateContent({
      model: questionGenerationModel,
      contents: prompt,
      config: {
        // FIX: `responseMimeType` and `responseSchema` are not allowed when using the `googleSearch` tool.
        tools: [{ googleSearch: {} }],
      },
    });
    
    const text = response.text.trim();
    // A quick check to handle potential ```json markdown wrapper
    const sanitizedText = text.replace(/^```json\n?/, '').replace(/```\n?$/, '');
    return JSON.parse(sanitizedText) as TriviaQuestion[];

  } catch (error) {
    console.error("Error generating trivia questions:", error);
    // Fallback to mock data in case of API failure
    return [
      {
        category: "วิทยาศาสตร์",
        question: "ความเร็วของแสงในสุญญากาศโดยประมาณคือเท่าใด",
        options: ["300,000 กม./วินาที", "150,000 กม./วินาที", "500,000 กม./วินาที", "1,000,000 กม./วินาที"],
        correctAnswer: "300,000 กม./วินาที",
      },
    ];
  }
}

export async function textToSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: ttsModel,
    contents: [{ parts: [{ text: `พูดด้วยความกระตือรือร้น: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data received from TTS API.");
  }
  return base64Audio;
}

export async function transcribeUserAnswer(mediaStream: MediaStream): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let currentInputTranscription = "";
    
    // FIX: Add `as any` to support `webkitAudioContext` in older browsers without a TypeScript error.
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = inputAudioContext.createMediaStreamSource(mediaStream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    const sessionPromise: Promise<LiveSession> = ai.live.connect({
      model: liveApiModel,
      callbacks: {
        onopen: () => {
            console.log("Live session opened.");
        },
        onmessage: (message) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            if(text) currentInputTranscription += text;
          }
          // FIX: Do not clear transcription on turn complete, as it may clear data before the session is closed.
           if (message.serverContent?.turnComplete) {
              const fullTranscription = currentInputTranscription;
              // currentInputTranscription = '';
              // Even though turn is complete, we resolve outside to get the final transcription
           }
        },
        onerror: (e) => {
          console.error("Live session error:", e);
          scriptProcessor.disconnect();
          source.disconnect();
          inputAudioContext.close();
          reject(new Error("Live API Error"));
        },
        onclose: () => {
          console.log("Live session closed.");
          scriptProcessor.disconnect();
          source.disconnect();
          inputAudioContext.close();
          resolve(currentInputTranscription.trim());
        },
      },
      config: {
        inputAudioTranscription: {},
        // FIX: The `responseModalities` config with `Modality.AUDIO` is mandatory for Live API sessions.
        responseModalities: [Modality.AUDIO],
      },
    });

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
          int16[i] = inputData[i] * 32768;
        }
        // FIX: Use a safer, loop-based encoder instead of `String.fromCharCode.apply` to prevent stack overflows.
        const base64 = encode(new Uint8Array(int16.buffer));
        
        sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
        });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

    // This promise contains the session object
    const session = await sessionPromise;

    // Attach a global stop function to be called from the component
    (window as any).stopTranscription = () => {
        session.close();
    };
  });
}

export async function evaluateAnswer(
    personality: string,
    question: TriviaQuestion,
    userAnswer: string
): Promise<{ isCorrect: boolean; feedback: string }> {
    const prompt = `คุณคือพิธีกรทายปัญหาที่มีบุคลิกแบบ ${personality}
คำถามคือ: "${question.question}"
คำตอบที่ถูกต้องคือ: "${question.correctAnswer}"
คำตอบที่ผู้ใช้พูดคือ: "${userAnswer}"

จากคำตอบของผู้ใช้ ให้พิจารณาก่อนว่าถูกต้องหรือไม่ คำตอบของผู้ใช้อาจแตกต่างเล็กน้อยแต่มีความหมายเหมือนกัน
จากนั้น ในบรรทัดใหม่ ให้เขียนว่า "CORRECT" หรือ "INCORRECT"
สุดท้าย ในบรรทัดถัดไป ให้ตอบกลับผู้ใช้สั้นๆ เป็นภาษาไทยตามบุคลิกของคุณโดยอิงจากคำตอบของพวกเขา`;

    const response = await ai.models.generateContent({
        model: evaluationModel,
        contents: prompt
    });

    const responseText = response.text;
    const lines = responseText.split('\n').filter(line => line.trim() !== '');
    
    const result = lines[0]?.trim().toUpperCase();
    const isCorrect = result === 'CORRECT';
    const feedback = lines.slice(1).join('\n');

    return { isCorrect, feedback };
}