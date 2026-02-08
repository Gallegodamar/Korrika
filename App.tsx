
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Question, DailyProgress, UserAnswer, Player } from './types';
import { RAW_DATA } from './questionsData';

const STORAGE_KEY = 'korrika_quiz_progress_v6';
const DAYS_COUNT = 11;
const QUESTIONS_PER_DAY = 12;
const SECONDS_PER_QUESTION = 20;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [dayIndex, setDayIndex] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timer, setTimer] = useState(SECONDS_PER_QUESTION);
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [supervisorCategory, setSupervisorCategory] = useState<string>('GUZTIAK');
  const [countdown, setCountdown] = useState(3);

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [tempPlayerNames, setTempPlayerNames] = useState<string[]>(['Jokalari 1', 'Jokalari 2']);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setProgress(JSON.parse(saved));
  }, []);

  const nextAvailableDay = useMemo(() => {
    for (let i = 0; i < DAYS_COUNT; i++) {
      const day = progress[i];
      if (day?.completed) continue;
      if (i === 0) return i;
      const prevDay = progress[i - 1];
      if (!prevDay?.completed) return -1;
      const lastDate = new Date(prevDay.date).toDateString();
      const todayDate = new Date().toDateString();
      if (lastDate === todayDate) return -2;
      return i;
    }
    return -3;
  }, [progress]);

  const dailyQuestions = useMemo(() => {
    const idx = (gameState === GameState.HOME || gameState === GameState.PLAYER_SETUP) ? (nextAvailableDay >= 0 ? nextAvailableDay : 0) : dayIndex;
    const questions: Question[] = [];
    RAW_DATA.forEach(category => {
      const q1 = category.preguntas[idx * 2];
      const q2 = category.preguntas[idx * 2 + 1];
      if (q1) questions.push({ ...q1, categoryName: category.capitulo });
      if (q2) questions.push({ ...q2, categoryName: category.capitulo });
    });
    return questions;
  }, [dayIndex, gameState, nextAvailableDay]);

  const currentQuestion = dailyQuestions[currentQuestionIdx];

  const handleNextQuestion = useCallback((selectedOption: string | null) => {
    if (!currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.respuesta_correcta;
    const newAnswer: UserAnswer = { question: currentQuestion, selectedOption, isCorrect };

    setPlayers(prev => {
      const updated = [...prev];
      updated[currentPlayerIdx].answers.push(newAnswer);
      if (isCorrect) updated[currentPlayerIdx].score += 1;
      return updated;
    });

    if (currentQuestionIdx < QUESTIONS_PER_DAY - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setTimer(SECONDS_PER_QUESTION);
    } else {
      if (currentPlayerIdx < players.length - 1) {
        setGameState(GameState.TURN_TRANSITION);
      } else {
        finishDay();
      }
    }
  }, [currentQuestion, currentQuestionIdx, players, currentPlayerIdx, dayIndex]);

  const finishDay = () => {
    const isMulti = players.length > 1;
    const finalScore = isMulti ? Math.max(...players.map(p => p.score)) : players[0].score;
    
    const newDailyProgress: DailyProgress = {
      dayIndex,
      score: finalScore,
      completed: true,
      date: new Date().toISOString(),
      answers: players[0].answers, 
      players: isMulti ? players : undefined
    };

    const updatedProgress = [...progress];
    updatedProgress[dayIndex] = newDailyProgress;
    setProgress(updatedProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
    
    setGameState(isMulti ? GameState.RANKING : GameState.RESULTS);
  };

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

  useEffect(() => {
    if (gameState !== GameState.COUNTDOWN) return;
    if (countdown > 0) {
      const timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setGameState(GameState.QUIZ);
    }
  }, [gameState, countdown]);

  const initGame = (mode: 'SOLO' | 'COMP') => {
    if (nextAvailableDay < 0) return;
    setDayIndex(nextAvailableDay);
    if (mode === 'SOLO') {
      const p: Player = { name: 'Zuk', score: 0, answers: [] };
      setPlayers([p]);
      setCurrentPlayerIdx(0);
      setCurrentQuestionIdx(0);
      setTimer(SECONDS_PER_QUESTION);
      setCountdown(3);
      setGameState(GameState.COUNTDOWN);
    } else {
      setGameState(GameState.PLAYER_SETUP);
    }
  };

  const startCompetition = () => {
    const pList: Player[] = tempPlayerNames.map(name => ({ name: name.trim() || 'Izengabea', score: 0, answers: [] }));
    setPlayers(pList);
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setTimer(SECONDS_PER_QUESTION);
    setCountdown(3);
    setGameState(GameState.COUNTDOWN);
  };

  const nextTurn = () => {
    setCurrentPlayerIdx(prev => prev + 1);
    setCurrentQuestionIdx(0);
    setTimer(SECONDS_PER_QUESTION);
    setCountdown(3);
    setGameState(GameState.COUNTDOWN);
  };

  const getResultFeedback = (score: number) => {
    if (score === 12) return { text: "Zuzenean lekukoa hartzera! Baina ez harrotu, gaur bakarrik izan da!", emoji: "👑" };
    if (score >= 10) return { text: "Oso ondo, baina euskara ez da egun batean egiten. Bihar ikusiko dugu!", emoji: "🏃‍♂️" };
    if (score >= 7) return { text: "Ertaina. Lekukoa erortzeko zorian daukazu!", emoji: "🤝" };
    if (score >= 4) return { text: "Gutxienekoa... AEK zer den badakizu?", emoji: "🧐" };
    if (score >= 1) return { text: "Bare bat Korrikan zu baino azkarragoa da!", emoji: "🐌" };
    return { text: "Zure euskara galduta dago. Bihar saiatu berriz, mesedez.", emoji: "😱" };
  };

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return RAW_DATA;
    return RAW_DATA.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory]);

  const isGameView = [GameState.HOME, GameState.PLAYER_SETUP, GameState.COUNTDOWN, GameState.QUIZ, GameState.TURN_TRANSITION].includes(gameState);

  return (
    <div className={`fixed inset-0 flex flex-col bg-gray-50 text-gray-800 ${isGameView ? 'overflow-hidden' : 'overflow-auto'}`}>
      <header className="w-full korrika-bg-gradient p-4 text-white shadow-md flex flex-col items-center flex-shrink-0 z-10">
        <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
          <span>🏃‍♀️</span> KORRIKA
        </h1>
        <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{DAYS_COUNT} EGUNEKO ERRONKA</p>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col overflow-hidden relative">
        
        {gameState === GameState.HOME && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {nextAvailableDay >= 0 ? (
              <div className="flex flex-col items-center space-y-6 w-full">
                <div className="text-center">
                  <p className="text-pink-500 font-black uppercase text-[10px] tracking-widest mb-1">Eguna: {nextAvailableDay + 1}</p>
                  <h2 className="text-gray-400 text-[10px] font-bold uppercase mb-4">Nola jokatu nahi duzu?</h2>
                </div>
                <div className="flex flex-col gap-4 w-full px-8">
                  <button onClick={() => initGame('SOLO')} className="korrika-bg-gradient text-white py-4 rounded-2xl font-black text-xl uppercase italic shadow-lg hover:scale-105 transition-all active:scale-95 border-2 border-white/20">Bakarka</button>
                  <button onClick={() => initGame('COMP')} className="bg-gray-800 text-white py-4 rounded-2xl font-black text-xl uppercase italic shadow-lg hover:scale-105 transition-all active:scale-95 border-2 border-white/10">Txapelketa (2-4)</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center gap-3 max-w-xs">
                <div className="text-5xl">{nextAvailableDay === -2 ? '⏳' : nextAvailableDay === -3 ? '🏁' : '🔒'}</div>
                <h2 className="text-lg font-black uppercase italic text-gray-800">{nextAvailableDay === -2 ? 'Itxaron!' : nextAvailableDay === -3 ? 'Bukaera!' : 'Blokeatuta'}</h2>
                <p className="text-[10px] text-gray-500 font-medium">{nextAvailableDay === -2 ? 'Gaurko erronka egina. Itzuli bihar!' : nextAvailableDay === -3 ? 'Zorionak! Erronka osatu duzu.' : 'Blokeatuta dago.'}</p>
              </div>
            )}
            <button onClick={() => setGameState(GameState.SUPERVISOR)} className="text-[9px] font-black uppercase text-pink-300">🔍 Irakasle Gunea</button>
          </div>
        )}

        {gameState === GameState.PLAYER_SETUP && (
          <div className="flex-1 flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <h2 className="text-xl font-black uppercase italic korrika-pink">Jokalariak Gehitu</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Gehienez 4 lagun txandaka</p>
            </div>
            <div className="space-y-2 flex-1 overflow-auto">
              {tempPlayerNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={name} onChange={(e) => { const n = [...tempPlayerNames]; n[i] = e.target.value; setTempPlayerNames(n); }} className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-pink-300 outline-none" placeholder={`Jokalari ${i+1}...`} />
                  {tempPlayerNames.length > 2 && (
                    <button onClick={() => setTempPlayerNames(tempPlayerNames.filter((_, idx) => idx !== i))} className="bg-red-50 text-red-500 w-12 rounded-xl border border-red-100">✕</button>
                  )}
                </div>
              ))}
              {tempPlayerNames.length < 4 && (
                <button onClick={() => setTempPlayerNames([...tempPlayerNames, `Jokalari ${tempPlayerNames.length + 1}`])} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-xs uppercase">+ Gehitu lagun bat</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGameState(GameState.HOME)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-black text-xs uppercase">Utzi</button>
              <button onClick={startCompetition} className="flex-[2] korrika-bg-gradient text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Hasi Txapelketa</button>
            </div>
          </div>
        )}

        {gameState === GameState.COUNTDOWN && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
            <div className="text-pink-500 font-black uppercase tracking-widest text-sm mb-4">{players[currentPlayerIdx].name} prest?</div>
            <div className="text-[10rem] font-black korrika-pink leading-none drop-shadow-2xl animate-bounce">{countdown === 0 ? '🏁' : countdown}</div>
          </div>
        )}

        {gameState === GameState.QUIZ && currentQuestion && (
          <div className="flex-1 flex flex-col py-4 space-y-4 overflow-hidden">
            <div className="flex justify-between items-center flex-shrink-0">
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-[9px] font-black uppercase text-pink-500 truncate w-32">{players[currentPlayerIdx].name}</span>
                   <span className="text-[8px] font-bold text-gray-400 uppercase">{currentQuestion.categoryName}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: QUESTIONS_PER_DAY }).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i === currentQuestionIdx ? 'korrika-bg-pink' : i < currentQuestionIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <div className="relative flex items-center justify-center w-12 h-12 ml-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - timer / SECONDS_PER_QUESTION)} strokeLinecap="round" className={`transition-all duration-1000 ${timer < 5 ? 'text-red-500' : 'text-pink-500'}`} />
                </svg>
                <span className={`relative text-xs font-black ${timer < 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>{timer}</span>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col min-h-0">
              <div className="mb-4">
                <span className="bg-pink-500 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">{currentQuestionIdx + 1} / 12</span>
                <h3 className="text-base font-bold text-gray-800 leading-tight mt-2 italic line-clamp-3">"{currentQuestion.pregunta}"</h3>
              </div>
              <div className="flex-1 grid grid-rows-4 gap-2 min-h-0">
                {Object.entries(currentQuestion.opciones).map(([key, value]) => (
                  <button key={key} onClick={() => handleNextQuestion(key)} className="w-full text-left px-4 rounded-xl border-2 border-gray-100 hover:border-pink-300 transition-all flex items-center gap-3 overflow-hidden active:scale-95">
                    <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center font-black uppercase text-gray-400 text-xs">{key}</span>
                    <span className="font-bold text-gray-700 text-xs line-clamp-2">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.TURN_TRANSITION && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full">
              <div className="text-5xl mb-4">👟</div>
              <h2 className="text-2xl font-black uppercase italic korrika-pink">Txanda Aldaketa</h2>
              <p className="text-gray-500 font-bold mb-8">Ederra {players[currentPlayerIdx].name}! Orain lekukoa <span className="text-gray-800">{players[currentPlayerIdx + 1].name}</span>-rena da.</p>
              <button onClick={nextTurn} className="korrika-bg-gradient text-white w-full py-4 rounded-2xl font-black uppercase shadow-lg">Lekukoa Hartu</button>
            </div>
          </div>
        )}

        {(gameState === GameState.RANKING || gameState === GameState.RESULTS || gameState === GameState.SUPERVISOR) && (
          <div className="flex-1 overflow-auto py-6 space-y-8">
            
            {gameState === GameState.RANKING && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 px-1">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                  <h2 className="text-3xl font-black uppercase italic mb-8 korrika-pink tracking-tighter">🏆 Txapelketa Sailkapena</h2>
                  <div className="space-y-3">
                    {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                      <div key={i} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] ${i === 0 ? 'bg-yellow-50 border-yellow-200 shadow-yellow-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className="text-3xl font-black w-10 flex items-center justify-center">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-black uppercase text-sm block truncate text-gray-800">{p.name}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{getResultFeedback(p.score).text.slice(0, 15)}...</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black korrika-pink block leading-none">{p.score}</span>
                          <span className="text-[10px] text-gray-300 font-black uppercase">puntu</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => setGameState(GameState.HOME)} className="mt-10 korrika-bg-gradient text-white w-full py-4 rounded-2xl font-black uppercase text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">🏠 Hasierara</button>
                </div>

                {/* DETAILED COMPARISON TABLE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase italic px-4 flex items-center gap-2 text-gray-400 tracking-widest">
                    <span>📊 Galderaz Galdera Erantzunak</span>
                  </h3>
                  {dailyQuestions.map((q, qIdx) => (
                    <div key={q.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
                      <div>
                        <span className="text-[9px] font-black uppercase text-pink-400 tracking-widest block mb-1">Galdera {qIdx + 1}</span>
                        <p className="font-bold text-gray-800 text-xs leading-snug">"{q.pregunta}"</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center gap-3">
                        <span className="bg-green-500 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black">{q.respuesta_correcta.toUpperCase()}</span>
                        <span className="text-green-800 font-black italic text-[10px]">{q.opciones[q.respuesta_correcta]}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {players.map((p, pIdx) => {
                          const ans = p.answers[qIdx];
                          return (
                            <div key={pIdx} className={`p-3 rounded-xl border flex items-center gap-3 ${ans.isCorrect ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-100'}`}>
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${ans.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                {ans.isCorrect ? '✅' : '❌'}
                              </span>
                              <div className="flex-1 overflow-hidden">
                                <span className="text-[8px] font-black uppercase text-gray-400 block truncate">{p.name}</span>
                                <span className={`text-[10px] font-bold truncate block ${ans.isCorrect ? 'text-gray-600' : 'text-red-700'}`}>
                                  {ans.selectedOption ? q.opciones[ans.selectedOption] : '⌛ Berandu'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameState === GameState.RESULTS && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 px-1">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 text-center">
                  <div className="text-8xl mb-6">{getResultFeedback(players[0].score).emoji}</div>
                  <h2 className="text-2xl font-black uppercase italic mb-1 text-gray-800">Zure Emaitza</h2>
                  <p className="text-7xl font-black korrika-pink mb-4 leading-none">{players[0].score} <span className="text-2xl text-gray-200">/ 12</span></p>
                  <div className="bg-gray-50 p-6 rounded-2xl mb-8 border-2 border-dashed border-gray-200 text-xs font-bold italic text-gray-700 leading-relaxed">"{getResultFeedback(players[0].score).text}"</div>
                  <button onClick={() => setGameState(GameState.HOME)} className="korrika-bg-gradient text-white w-full py-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-all hover:scale-105">🏠 Hasierara</button>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase italic px-4 text-gray-400 tracking-widest">🧐 Berrikuspena</h3>
                  {players[0].answers.map((answer, i) => (
                    <div key={i} className={`p-5 rounded-[2rem] border-2 bg-white shadow-sm transition-all hover:shadow-md ${answer.isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                      <p className="font-bold text-gray-800 text-[11px] mb-3 leading-tight italic">"{answer.question.pregunta}"</p>
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className={`p-3 rounded-xl border flex flex-col ${answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <span className="font-black uppercase opacity-40 text-[8px] mb-1">Zurea</span>
                          <span className="font-black truncate block text-gray-700">{answer.selectedOption ? answer.question.opciones[answer.selectedOption] : '⌛ Berandu'}</span>
                        </div>
                        {!answer.isCorrect && (
                          <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex flex-col">
                            <span className="font-black uppercase opacity-40 text-[8px] mb-1">Zuzena</span>
                            <span className="font-black truncate block text-green-700">{answer.question.opciones[answer.question.respuesta_correcta]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameState === GameState.SUPERVISOR && (
              <div className="space-y-6 px-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black uppercase italic korrika-pink">📚 Galde-Sorta</h2>
                  <button onClick={() => setGameState(GameState.HOME)} className="bg-gray-800 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase shadow-lg">🏠 Itzuli</button>
                </div>
                <div className="flex flex-wrap gap-2 p-4 bg-white rounded-3xl shadow-sm border border-gray-100 sticky top-0 z-20 overflow-x-auto">
                  <button onClick={() => setSupervisorCategory('GUZTIAK')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${supervisorCategory === 'GUZTIAK' ? 'korrika-bg-pink text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>Guztiak</button>
                  {RAW_DATA.map(cat => (
                    <button key={cat.capitulo} onClick={() => setSupervisorCategory(cat.capitulo)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${supervisorCategory === cat.capitulo ? 'korrika-bg-pink text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>{cat.capitulo}</button>
                  ))}
                </div>
                <div className="space-y-6">
                  {filteredSupervisorData.map(category => (
                    <div key={category.capitulo} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100">
                      <div className="korrika-bg-gradient p-4 text-white font-black uppercase text-xs flex justify-between items-center">
                        <span>📁 {category.capitulo}</span>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[9px]">{category.preguntas.length} Galdera</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {category.preguntas.map((q, idx) => (
                          <div key={q.id} className="p-6 transition-colors hover:bg-gray-50/50">
                            <p className="font-bold text-gray-800 text-xs mb-4">#{idx+1} {q.pregunta}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(q.opciones).map(([k, v]) => (
                                <div key={k} className={`p-3 rounded-xl text-[10px] flex items-center gap-3 transition-all ${k === q.respuesta_correcta ? 'bg-green-100 font-black text-green-800 border border-green-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}>
                                  <span className={`w-6 h-6 flex items-center justify-center rounded-lg shadow-sm text-[9px] uppercase ${k === q.respuesta_correcta ? 'bg-green-500 text-white' : 'bg-white text-gray-300'}`}>{k}</span>
                                  <span className="flex-1 font-bold">{v}</span>
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
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-center opacity-30 text-[8px] font-black uppercase tracking-[0.3em] flex-shrink-0 bg-gray-50">
        🏃‍♀️ AEK - KORRIKA &copy; 2024 🏁
      </footer>
    </div>
  );
};

export default App;
