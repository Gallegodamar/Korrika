
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Question, DailyProgress, UserAnswer } from './types';
import { RAW_DATA } from './questionsData';

const STORAGE_KEY = 'korrika_quiz_progress_v5';
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
  const [countdown, setCountdown] = useState(3);

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProgress(JSON.parse(saved));
    }
  }, []);

  // Determine the next playable day
  const nextAvailableDay = useMemo(() => {
    for (let i = 0; i < DAYS_COUNT; i++) {
      const day = progress[i];
      if (day?.completed) continue;
      
      if (i === 0) return i;
      
      const prevDay = progress[i - 1];
      if (!prevDay?.completed) return -1; // Locked: previous not finished

      const lastDate = new Date(prevDay.date).toDateString();
      const todayDate = new Date().toDateString();
      if (lastDate === todayDate) return -2; // Locked: wait for tomorrow
      
      return i;
    }
    return -3; // All finished
  }, [progress]);

  // Questions for the current selected day
  const dailyQuestions = useMemo(() => {
    const idx = gameState === GameState.HOME ? 0 : dayIndex;
    const questions: Question[] = [];
    RAW_DATA.forEach(category => {
      const q1 = category.preguntas[idx * 2];
      const q2 = category.preguntas[idx * 2 + 1];
      if (q1) questions.push({ ...q1, categoryName: category.capitulo });
      if (q2) questions.push({ ...q2, categoryName: category.capitulo });
    });
    return questions;
  }, [dayIndex, gameState]);

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

  // Quiz Timer logic
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

  // Start Countdown logic
  useEffect(() => {
    if (gameState !== GameState.COUNTDOWN) return;

    if (countdown > 0) {
      const timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setGameState(GameState.QUIZ);
    }
  }, [gameState, countdown]);

  const handleStartGame = () => {
    if (nextAvailableDay >= 0) {
      setDayIndex(nextAvailableDay);
      setCurrentQuestionIdx(0);
      setAnswers([]);
      setTimer(SECONDS_PER_QUESTION);
      setCountdown(3);
      setGameState(GameState.COUNTDOWN);
    }
  };

  const getResultFeedback = (score: number) => {
    if (score === 12) return { text: "Zuzenean lekukoa hartzera! Baina ez harrotu!", emoji: "👑" };
    if (score >= 10) return { text: "Kasik bikain! Baina gogoratu: euskara ez da egun batean egiten.", emoji: "🏃‍♂️" };
    if (score >= 7) return { text: "Ez dago gaizki, baina lekukoa erortzeko zorian daukazu!", emoji: "🤝" };
    if (score >= 4) return { text: "Erdi bidean zaude, AEK zer den badakizu behintzat?", emoji: "🧐" };
    if (score >= 1) return { text: "Bare bat Korrikan zu baino azkarragoa da! Mugitu!", emoji: "🐌" };
    return { text: "Zure euskara Korrikaren lehenengo mezua bezala dago: Galdua!", emoji: "😱" };
  };

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return RAW_DATA;
    return RAW_DATA.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory]);

  // Determine if the current view should be non-scrollable
  const isGameView = gameState === GameState.HOME || gameState === GameState.COUNTDOWN || gameState === GameState.QUIZ;

  return (
    <div className={`fixed inset-0 flex flex-col bg-gray-50 text-gray-800 ${isGameView ? 'overflow-hidden' : 'overflow-auto'}`}>
      {/* Shortened Header for space efficiency */}
      <header className="w-full korrika-bg-gradient p-4 text-white shadow-md flex flex-col items-center relative overflow-hidden flex-shrink-0">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-2">
          <span>🏃‍♀️</span> KORRIKA
        </h1>
        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{DAYS_COUNT} EGUNEKO ERRONKA</p>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col overflow-hidden relative">
        {gameState === GameState.HOME && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {nextAvailableDay >= 0 ? (
              <div className="flex flex-col items-center space-y-6">
                <div className="text-center">
                  <p className="text-pink-500 font-black uppercase text-xs tracking-widest mb-1">Eguna: {nextAvailableDay + 1}</p>
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Prest zaude?</p>
                </div>
                <button 
                  onClick={handleStartGame}
                  className="korrika-bg-gradient text-white w-48 h-48 rounded-full font-black text-4xl uppercase italic shadow-2xl hover:scale-105 transition-all active:scale-95 border-4 border-white/30 flex items-center justify-center relative overflow-hidden"
                >
                  <span className="relative z-10">JOKATU</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center gap-3 max-w-xs">
                <div className="text-5xl">{nextAvailableDay === -2 ? '⏳' : nextAvailableDay === -3 ? '🏁' : '🔒'}</div>
                <h2 className="text-xl font-black uppercase italic text-gray-800">
                  {nextAvailableDay === -2 ? 'Itxaron!' : nextAvailableDay === -3 ? 'Bukaera!' : 'Blokeatuta'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {nextAvailableDay === -2 ? 'Gaurko erronka egina. Itzuli bihar!' : 
                   nextAvailableDay === -3 ? 'Zorionak! Erronka osatu duzu.' : 
                   'Blokeatuta dago.'}
                </p>
              </div>
            )}
            
            <button 
              onClick={() => setGameState(GameState.SUPERVISOR)}
              className="text-[10px] font-black uppercase text-pink-300 hover:text-pink-500 transition-colors"
            >
              🔍 Irakasle Gunea
            </button>
          </div>
        )}

        {gameState === GameState.COUNTDOWN && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
            <div className="text-[10rem] font-black korrika-pink leading-none drop-shadow-2xl animate-bounce">
              {countdown === 0 ? '🏁' : countdown}
            </div>
          </div>
        )}

        {gameState === GameState.QUIZ && currentQuestion && (
          <div className="flex-1 flex flex-col py-4 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="flex justify-between items-center flex-shrink-0">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase text-pink-500 tracking-tighter truncate block w-40">
                  {currentQuestion.categoryName}
                </span>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: QUESTIONS_PER_DAY }).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i === currentQuestionIdx ? 'korrika-bg-pink shadow-md' : i < currentQuestionIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              
              <div className="relative flex items-center justify-center w-12 h-12 ml-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                  <circle
                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - timer / SECONDS_PER_QUESTION)}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${timer < 5 ? 'text-red-500' : 'text-pink-500'}`}
                  />
                </svg>
                <span className={`relative text-xs font-black ${timer < 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                  {timer}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col min-h-0">
              <div className="mb-4">
                <span className="bg-pink-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {currentQuestionIdx + 1} / {QUESTIONS_PER_DAY}
                </span>
                <h3 className="text-lg font-bold text-gray-800 leading-tight mt-2 italic line-clamp-3">
                  "{currentQuestion.pregunta}"
                </h3>
              </div>

              <div className="flex-1 grid grid-rows-4 gap-2 min-h-0">
                {Object.entries(currentQuestion.opciones).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleNextQuestion(key)}
                    className="w-full text-left px-4 rounded-xl border-2 border-gray-100 hover:border-pink-300 hover:bg-pink-50 transition-all flex items-center gap-3 overflow-hidden active:scale-95"
                  >
                    <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center font-black uppercase text-gray-400 text-xs">
                      {key}
                    </span>
                    <span className="font-bold text-gray-700 text-sm line-clamp-2">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(gameState === GameState.RESULTS || gameState === GameState.SUPERVISOR) && (
          <div className="flex-1 overflow-auto py-6">
            {gameState === GameState.RESULTS && (
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 text-center relative overflow-hidden">
                  <div className="text-7xl mb-4">{getResultFeedback(progress[dayIndex]?.score || 0).emoji}</div>
                  <h2 className="text-2xl font-black uppercase italic mb-1">Emaitza</h2>
                  <p className="text-5xl font-black korrika-pink mb-4">
                    {progress[dayIndex]?.score} <span className="text-xl text-gray-200">/ 12</span>
                  </p>
                  <div className="bg-gray-50 p-4 rounded-2xl mb-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-800 font-bold italic text-sm">"{getResultFeedback(progress[dayIndex]?.score || 0).text}"</p>
                  </div>
                  <button 
                    onClick={() => setGameState(GameState.HOME)}
                    className="korrika-bg-gradient text-white px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 mx-auto"
                  >
                    <span>🏠 Hasierara</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase italic px-2 text-gray-400">🧐 Berrikuspena</h3>
                  {progress[dayIndex]?.answers.map((answer, i) => (
                    <div key={i} className={`p-4 rounded-2xl border-2 bg-white ${answer.isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                      <p className="font-bold text-gray-800 text-xs mb-2 leading-tight">{answer.question.pregunta}</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className={`p-2 rounded-lg border ${answer.isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <span className="font-black uppercase opacity-40 block mb-1">Zurea</span>
                          <span className="font-bold truncate block">{answer.selectedOption ? answer.question.opciones[answer.selectedOption] : '⌛ Berandu'}</span>
                        </div>
                        {!answer.isCorrect && (
                          <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                            <span className="font-black uppercase opacity-40 block mb-1">Zuzena</span>
                            <span className="font-bold truncate block text-green-700">{answer.question.opciones[answer.question.respuesta_correcta]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameState === GameState.SUPERVISOR && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase italic korrika-pink">📚 Galde-Sorta</h2>
                  <button onClick={() => setGameState(GameState.HOME)} className="bg-gray-800 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase">Itzuli 🏠</button>
                </div>
                <div className="flex flex-wrap gap-1 p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <button onClick={() => setSupervisorCategory('GUZTIAK')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${supervisorCategory === 'GUZTIAK' ? 'korrika-bg-pink text-white' : 'bg-gray-100 text-gray-400'}`}>Guztiak</button>
                  {RAW_DATA.map(cat => (
                    <button key={cat.capitulo} onClick={() => setSupervisorCategory(cat.capitulo)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${supervisorCategory === cat.capitulo ? 'korrika-bg-pink text-white' : 'bg-gray-100 text-gray-400'}`}>{cat.capitulo}</button>
                  ))}
                </div>
                {filteredSupervisorData.map(category => (
                  <div key={category.capitulo} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <div className="korrika-bg-gradient p-3 text-white font-black uppercase text-[10px] flex justify-between">
                      <span>📁 {category.capitulo}</span>
                      <span className="opacity-70">{category.preguntas.length} Galdera</span>
                    </div>
                    {category.preguntas.map((q, idx) => (
                      <div key={q.id} className="p-4 border-b border-gray-50 last:border-0">
                        <p className="font-bold text-gray-800 text-xs mb-3">#{idx+1} {q.pregunta}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(q.opciones).map(([k, v]) => (
                            <div key={k} className={`p-2 rounded-lg text-[10px] ${k === q.respuesta_correcta ? 'bg-green-100 font-bold text-green-800' : 'bg-gray-50 text-gray-400'}`}>
                              <span className="uppercase mr-1 opacity-50">{k})</span> {v}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-3 text-center opacity-30 text-[8px] font-black uppercase tracking-[0.3em] flex-shrink-0">
        🏃‍♀️ AEK - KORRIKA &copy; 2024 🏁
      </footer>
    </div>
  );
};

export default App;
