
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Question, DailyProgress, UserAnswer } from './types';
import { RAW_DATA } from './questionsData';

const STORAGE_KEY = 'korrika_quiz_progress_v4';
const DAYS_COUNT = 11;
const QUESTIONS_PER_DAY = 12;
const SECONDS_PER_QUESTION = 15;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [dayIndex, setDayIndex] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [timer, setTimer] = useState(SECONDS_PER_QUESTION);
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [supervisorCategory, setSupervisorCategory] = useState<string>('GUZTIAK');

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProgress(JSON.parse(saved));
    }
  }, []);

  // Questions for the current selected day
  const dailyQuestions = useMemo(() => {
    const questions: Question[] = [];
    RAW_DATA.forEach(category => {
      const q1 = category.preguntas[dayIndex * 2];
      const q2 = category.preguntas[dayIndex * 2 + 1];
      if (q1) questions.push({ ...q1, categoryName: category.capitulo });
      if (q2) questions.push({ ...q2, categoryName: category.capitulo });
    });
    return questions;
  }, [dayIndex]);

  const currentQuestion = dailyQuestions[currentQuestionIdx];

  const handleNextQuestion = useCallback((selectedOption: string | null) => {
    if (!currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.respuesta_correcta;
    const newAnswer: UserAnswer = {
      question: currentQuestion,
      selectedOption,
      isCorrect
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestionIdx < QUESTIONS_PER_DAY - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setTimer(SECONDS_PER_QUESTION);
    } else {
      const score = newAnswers.filter(a => a.isCorrect).length;
      const newDailyProgress: DailyProgress = {
        dayIndex,
        score,
        completed: true,
        date: new Date().toISOString(),
        answers: newAnswers
      };

      const updatedProgress = [...progress];
      updatedProgress[dayIndex] = newDailyProgress;
      setProgress(updatedProgress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
      
      setGameState(GameState.RESULTS);
    }
  }, [currentQuestion, currentQuestionIdx, answers, dayIndex, progress]);

  // Timer logic
  useEffect(() => {
    if (gameState !== GameState.QUIZ) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          handleNextQuestion(null);
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, handleNextQuestion]);

  const startDay = (idx: number) => {
    setDayIndex(idx);
    setCurrentQuestionIdx(0);
    setAnswers([]);
    setTimer(SECONDS_PER_QUESTION);
    setGameState(GameState.QUIZ);
  };

  const getDayStatus = (idx: number) => {
    const day = progress[idx];
    if (day?.completed) return 'COMPLETED';
    if (idx === 0) return 'AVAILABLE';
    const prevDay = progress[idx - 1];
    if (!prevDay?.completed) return 'LOCKED';
    const lastDate = new Date(prevDay.date).toDateString();
    const todayDate = new Date().toDateString();
    if (lastDate === todayDate) return 'WAIT_FOR_TOMORROW';
    return 'AVAILABLE';
  };

  const getResultFeedback = (score: number) => {
    if (score === 12) return { text: "Zuzenean lekukoa hartzera! Baina ez harrotu, bihar gehiago izango dugu eta!", emoji: "👑" };
    if (score >= 10) return { text: "Kasik bikain! Baina gogoratu: euskaldun zaharrak ez dira egun batean egin, lagun.", emoji: "🏃‍♂️" };
    if (score >= 7) return { text: "Ez dago gaizki, baina lekukoa erortzeko zorian daukazu. Pixka bat gehiago estutu!", emoji: "🤝" };
    if (score >= 4) return { text: "Erdi bidean zaude, baina oraindik 'AEK' zer den galdetzen ari zara? Iker ezazu!", emoji: "🧐" };
    if (score >= 1) return { text: "Oso motela... bare bat Korrikan zu baino azkarragoa da! Mugitu mingaina!", emoji: "🐌" };
    return { text: "Zure euskara Korrikaren lehenengo mezua bezala dago: Galdua! Berriz saiatu bihar.", emoji: "😱" };
  };

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return RAW_DATA;
    return RAW_DATA.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 text-gray-800 pb-12">
      <header className="w-full korrika-bg-gradient p-6 text-white shadow-lg mb-8 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl rotate-12">🏃‍♀️</div>
        <div className="absolute bottom-0 left-0 p-4 opacity-20 text-6xl -rotate-12">🏁</div>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
          <span className="text-5xl">🏃‍♀️</span> KORRIKA
        </h1>
        <p className="text-sm font-bold opacity-90 mt-1 uppercase tracking-widest">{DAYS_COUNT} EGUNEKO ERRONKA 🎯</p>
      </header>

      <main className="w-full max-w-2xl px-4">
        {gameState === GameState.HOME && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center relative">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-black mb-4 korrika-pink italic uppercase">Ongi etorri!</h2>
              <p className="text-gray-600 leading-relaxed">
                KORRIKAren historia eta bitxikeriak hobeto ezagutzeko jokoa. 📚
                Egunero 12 galdera erantzun beharko dituzu ⏱️. 
                Gogoratu: eguneko erronka bakarra egin dezakezu! 📅
              </p>
              
              <button 
                onClick={() => setGameState(GameState.SUPERVISOR)}
                className="mt-6 text-pink-500 font-bold text-sm hover:underline flex items-center justify-center gap-2 mx-auto bg-pink-50 px-4 py-2 rounded-xl transition-colors hover:bg-pink-100 border border-pink-100"
              >
                🔍 Irakasle Gunea (Berrikusi)
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {Array.from({ length: DAYS_COUNT }).map((_, i) => {
                const status = getDayStatus(i);
                const isCompleted = status === 'COMPLETED';
                const isLocked = status === 'LOCKED' || status === 'WAIT_FOR_TOMORROW';
                
                return (
                  <button
                    key={i}
                    disabled={isLocked}
                    onClick={() => startDay(i)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative group p-2
                      ${isCompleted ? 'bg-green-100 text-green-700 border-2 border-green-200' : 
                        isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : 
                        'bg-white text-gray-700 border-2 border-pink-100 hover:border-pink-300 shadow-sm hover:-translate-y-1'}
                    `}
                  >
                    <span className="text-[10px] font-black uppercase opacity-60">Eguna</span>
                    <span className="text-3xl font-black">{i + 1}</span>
                    <div className="mt-1 text-xl">
                      {isCompleted ? '✅' : status === 'WAIT_FOR_TOMORROW' ? '⏳' : isLocked ? '🔒' : '🔓'}
                    </div>
                    {status === 'WAIT_FOR_TOMORROW' && (
                      <span className="absolute -bottom-2 bg-yellow-400 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap uppercase">
                        Bihar arte!
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {gameState === GameState.QUIZ && currentQuestion && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-xs font-black uppercase text-pink-500 tracking-widest flex items-center gap-1">
                  <i className="fa-solid fa-tag text-[10px]"></i> {currentQuestion.categoryName}
                </span>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: QUESTIONS_PER_DAY }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 w-4 rounded-full transition-all duration-300 ${i === currentQuestionIdx ? 'korrika-bg-pink w-8' : i < currentQuestionIdx ? 'bg-green-400' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="relative flex items-center justify-center w-20 h-20 ml-4">
                <div className="absolute inset-0 bg-white rounded-full shadow-inner border-4 border-gray-100"></div>
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                  <circle
                    cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - timer / SECONDS_PER_QUESTION)}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${timer < 5 ? 'text-red-500' : 'text-pink-500'}`}
                  />
                </svg>
                <div className="relative flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black leading-none ${timer < 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                    {timer}
                  </span>
                  <span className="text-[8px] font-black uppercase opacity-40">Seg</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative">
              <div className="absolute -top-4 left-8 bg-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
                Galdera {currentQuestionIdx + 1} / {QUESTIONS_PER_DAY}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 leading-snug mb-8 mt-4 italic">
                {currentQuestion.pregunta}
              </h3>

              <div className="grid gap-3">
                {Object.entries(currentQuestion.opciones).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleNextQuestion(key)}
                    className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-pink-300 hover:bg-pink-50 transition-all group flex items-center gap-4"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-pink-200 flex items-center justify-center font-black uppercase text-gray-500 group-hover:text-pink-700 transition-colors">
                      {key}
                    </span>
                    <span className="font-semibold text-gray-700">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.RESULTS && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center relative overflow-hidden">
              <div className="text-8xl mb-6 transform transition-transform duration-700 hover:scale-110">
                {getResultFeedback(progress[dayIndex]?.score || 0).emoji}
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-2">Emaitza</h2>
              <p className="text-6xl font-black korrika-pink mb-4">
                {progress[dayIndex]?.score} <span className="text-2xl text-gray-300">/ 12</span>
              </p>
              <div className="bg-pink-50 p-6 rounded-2xl mb-8 border border-pink-100 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-200 text-pink-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Feedback</span>
                <p className="text-gray-700 font-bold italic text-lg leading-relaxed">
                  "{getResultFeedback(progress[dayIndex]?.score || 0).text}"
                </p>
              </div>
              
              <button 
                onClick={() => setGameState(GameState.HOME)}
                className="korrika-bg-gradient text-white px-10 py-4 rounded-full font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
              >
                <span>🏠 Hasierara Itzuli</span>
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black uppercase italic px-2 flex items-center gap-2">
                <span>🧐 Erantzunen azterketa</span>
              </h3>
              {progress[dayIndex]?.answers.map((answer, i) => (
                <div key={i} className={`p-6 rounded-2xl border-2 bg-white transition-all hover:shadow-md ${answer.isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xl`}>
                      {answer.isCorrect ? '✅' : '❌'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 mb-2">{answer.question.pregunta}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className={`p-3 rounded-xl border ${answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <span className="font-black uppercase opacity-40 block text-[10px] mb-1">Zure erantzuna</span>
                          <span className="font-bold">{answer.selectedOption ? answer.question.opciones[answer.selectedOption] : '⌛ Denbora agortuta'}</span>
                        </div>
                        {!answer.isCorrect && (
                          <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                            <span className="font-black uppercase opacity-40 block text-[10px] mb-1">Erantzun zuzena</span>
                            <span className="font-bold">{answer.question.opciones[answer.question.respuesta_correcta]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.SUPERVISOR && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase italic korrika-pink">📚 Galdera Guztiak</h2>
                <button 
                  onClick={() => setGameState(GameState.HOME)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-300 transition-colors"
                >
                  Itzuli 🏠
                </button>
              </div>

              {/* CATEGORY SUBMENU */}
              <div className="flex flex-wrap gap-2 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <button 
                  onClick={() => setSupervisorCategory('GUZTIAK')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${supervisorCategory === 'GUZTIAK' ? 'korrika-bg-pink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Guztiak
                </button>
                {RAW_DATA.map((cat) => (
                  <button 
                    key={cat.capitulo}
                    onClick={() => setSupervisorCategory(cat.capitulo)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${supervisorCategory === cat.capitulo ? 'korrika-bg-pink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {cat.capitulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredSupervisorData.map((category, catIdx) => (
                <div key={category.capitulo} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="korrika-bg-gradient p-4 text-white font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="text-2xl">📁</span> {category.capitulo}
                    <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-[10px]">{category.preguntas.length} Galdera</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {category.preguntas.map((q, qIdx) => (
                      <div key={q.id} className="p-6 transition-colors hover:bg-gray-50/50">
                        <p className="font-bold text-gray-800 mb-3 flex gap-2">
                          <span className="text-pink-500 font-black">{qIdx + 1}.</span> {q.pregunta}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(q.opciones).map(([k, v]) => (
                            <div key={k} className={`p-3 rounded-xl text-sm flex items-center gap-3 transition-all ${k === q.respuesta_correcta ? 'bg-green-100 border border-green-200 font-bold text-green-800' : 'bg-gray-50 text-gray-500 border border-transparent opacity-80'}`}>
                              <span className={`uppercase font-black text-[10px] w-6 h-6 flex items-center justify-center rounded-lg shadow-sm ${k === q.respuesta_correcta ? 'bg-green-500 text-white' : 'bg-white text-gray-400'}`}>
                                {k}
                              </span>
                              <span className="flex-1">{v}</span>
                              {k === q.respuesta_correcta && <span className="text-green-600">✅</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-10 text-center opacity-40 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
        <span>🏃‍♀️</span> AEK - KORRIKA &copy; 2024 <span>🏁</span>
      </footer>
    </div>
  );
};

export default App;
