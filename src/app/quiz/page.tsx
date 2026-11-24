'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import {
  HelpCircle,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export interface QuizQuestionItem {
  id: string;
  order?: number;
  question: string;
  questionTelugu?: string;
  options: string[];
  optionsTelugu?: string[];
  correctAnswer?: string | string[] | number;
  explanation?: string;
  bibleReference?: string;
  marks?: number;
}

export interface LiveBibleQuiz {
  id: string;
  title: string;
  topic?: string;
  description: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimitMinutes?: number;
  totalMarks?: number;
  status?: string;
  questions: QuizQuestionItem[];
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<LiveBibleQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active quiz session
  const [activeQuiz, setActiveQuiz] = useState<LiveBibleQuiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Stored attempt records (local storage only, in compliance with security mandate)
  const [attemptHistory, setAttemptHistory] = useState<Array<{
    quizId: string;
    quizTitle: string;
    score: number;
    total: number;
    percentage: number;
    date: string;
  }>>([]);

  // Fetch live published quizzes from canonical path: Rhema Church/rhema/bibleQuizzes
  useEffect(() => {
    async function loadQuizzes() {
      try {
        setLoading(true);
        setError(null);

        const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');
        const snap = await getDocs(colRef);

        const loaded: LiveBibleQuiz[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          // Filter published or active quizzes
          if (data.status === 'published' || !data.status || data.status === 'active') {
            const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
            const parsedQuestions: QuizQuestionItem[] = rawQuestions.map((q: any, idx: number) => ({
              id: q.id || `q-${idx}`,
              order: q.order || idx + 1,
              question: q.question || q.text || '',
              questionTelugu: q.questionTelugu,
              options: Array.isArray(q.options) ? q.options : [],
              optionsTelugu: q.optionsTelugu,
              correctAnswer: q.correctAnswer ?? q.correctIndex ?? 0,
              explanation: q.explanation || '',
              bibleReference: q.bibleReference || q.reference || '',
              marks: q.marks || 1,
            }));

            loaded.push({
              id: docSnap.id,
              title: data.title || data.topic || 'Scripture Quiz',
              topic: data.topic,
              description: data.description || 'Test your biblical understanding and knowledge.',
              category: data.category || 'General Scripture',
              difficulty: data.difficulty || 'medium',
              timeLimitMinutes: data.timeLimitMinutes || 5,
              totalMarks: data.totalMarks || parsedQuestions.length,
              status: data.status,
              questions: parsedQuestions,
            });
          }
        });

        setQuizzes(loaded);
      } catch (err: unknown) {
        console.warn('Failed to fetch quizzes from Firestore:', err);
        setError('Unable to load live quizzes from church database. Please verify your connection.');
      } finally {
        setLoading(false);
      }
    }

    loadQuizzes();

    // Load local attempts
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('@rhema_quiz_attempts');
        if (stored) {
          setAttemptHistory(JSON.parse(stored));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Timer logic for active quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeQuiz && !isSubmitted && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuiz, isSubmitted, timerSeconds]);

  const startQuiz = (quiz: LiveBibleQuiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setTimerSeconds((quiz.timeLimitMinutes || 5) * 60);
  };

  const handleSelectOption = (optionValue: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: optionValue,
    }));
  };

  const handleAutoSubmit = () => {
    submitQuizAnswers();
  };

  const submitQuizAnswers = () => {
    if (!activeQuiz) return;

    let computedScore = 0;
    activeQuiz.questions.forEach((q, idx) => {
      const selected = selectedAnswers[idx];
      let correct = false;

      if (typeof q.correctAnswer === 'number') {
        const correctText = q.options[q.correctAnswer];
        if (selected === correctText || selected === String(q.correctAnswer)) {
          correct = true;
        }
      } else if (typeof q.correctAnswer === 'string') {
        if (selected?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          correct = true;
        }
      } else if (Array.isArray(q.correctAnswer)) {
        if (q.correctAnswer.includes(selected)) {
          correct = true;
        }
      }

      if (correct) {
        computedScore += (q.marks || 1);
      }
    });

    setScore(computedScore);
    setIsSubmitted(true);

    // Save attempt to localStorage in accordance with security mandate:
    // "Store attempts locally for now. Do not write quiz attempts to production Firestore
    // until secure server-side score validation and ownership enforcement are available."
    const totalPossible = activeQuiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const percentage = Math.round((computedScore / (totalPossible || 1)) * 100);

    const newRecord = {
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      score: computedScore,
      total: totalPossible,
      percentage,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updatedHistory = [newRecord, ...attemptHistory.slice(0, 9)];
    setAttemptHistory(updatedHistory);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('@rhema_quiz_attempts', JSON.stringify(updatedHistory));
      }
    } catch {
      // ignore
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <HelpCircle size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white">Daily Bible Quiz</h1>
                <p className="text-xs text-slate-400">
                  Grow in God&apos;s Word through interactive chapter and doctrinal quizzes
                </p>
              </div>
            </div>
          </div>

          {activeQuiz && (
            <button
              onClick={() => setActiveQuiz(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 self-start sm:self-auto"
            >
              <RotateCcw size={14} /> Back to All Quizzes
            </button>
          )}
        </div>

        {/* Security architecture banner */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              Live Scripture Quizzes &bull; Local Score Validation Mode
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Quizzes are loaded live from the Rhema Church collection. For security integrity, scoring is evaluated on your device and recorded locally until trusted server-side attempt validation is deployed.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-200">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Quiz Player */}
        {activeQuiz ? (
          <div className="space-y-6">
            {/* Quiz Info & Progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {activeQuiz.category || 'Scripture Quiz'}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{activeQuiz.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{activeQuiz.description}</p>
                </div>

                {!isSubmitted && (
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 flex items-center gap-2 font-mono text-amber-400 text-sm">
                      <Clock size={16} />
                      <span>{formatTimer(timerSeconds)}</span>
                    </div>
                  </div>
                )}
              </div>

              {!isSubmitted ? (
                /* Question View */
                <div className="space-y-6">
                  {activeQuiz.questions.length > 0 ? (
                    (() => {
                      const q = activeQuiz.questions[currentQuestionIdx];
                      const selected = selectedAnswers[currentQuestionIdx];

                      return (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>
                              Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                            </span>
                            {q.bibleReference && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <BookOpen size={12} /> {q.bibleReference}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                            {q.question}
                          </h3>

                          {/* Options */}
                          <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, optIdx) => {
                              const isOptionSelected = selected === opt;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSelectOption(opt)}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between text-sm ${
                                    isOptionSelected
                                      ? 'bg-amber-500/20 border-amber-500 text-white font-medium shadow-md'
                                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                                      isOptionSelected
                                        ? 'border-amber-400 bg-amber-400 text-slate-950 font-bold text-xs'
                                        : 'border-slate-700'
                                    }`}
                                  >
                                    {isOptionSelected && '✓'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <button
                              type="button"
                              disabled={currentQuestionIdx === 0}
                              onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                            >
                              Previous Question
                            </button>

                            {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                              >
                                <span>Next</span>
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={submitQuizAnswers}
                                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
                              >
                                <Award size={16} />
                                <span>Complete &amp; Submit Quiz</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No questions configured for this quiz yet.
                    </div>
                  )}
                </div>
              ) : (
                /* Results View */
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <Trophy size={36} />
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Quiz Completed
                    </span>
                    <h3 className="text-2xl font-black text-white mt-2">
                      Score: {score} / {activeQuiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {Math.round((score / (activeQuiz.questions.length || 1)) * 100)}% Correct &bull; Well done steward of the Word!
                    </p>
                  </div>

                  {/* Question Review */}
                  <div className="text-left space-y-4 max-w-xl mx-auto pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Review Answers &amp; Scriptural Explanations
                    </h4>

                    {activeQuiz.questions.map((q, idx) => {
                      const userAns = selectedAnswers[idx];
                      let isCorrect = false;

                      if (typeof q.correctAnswer === 'number') {
                        isCorrect = userAns === q.options[q.correctAnswer] || userAns === String(q.correctAnswer);
                      } else if (typeof q.correctAnswer === 'string') {
                        isCorrect = userAns?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                      }

                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-white">
                              {idx + 1}. {q.question}
                            </span>
                            {isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold shrink-0">
                                <CheckCircle2 size={14} /> Correct
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1 font-bold shrink-0">
                                <XCircle size={14} /> Missed
                              </span>
                            )}
                          </div>

                          <div className="text-slate-400 text-[11px] space-y-0.5">
                            <div>Your answer: <span className={isCorrect ? 'text-emerald-300' : 'text-red-300 font-semibold'}>{userAns || 'None selected'}</span></div>
                            {q.explanation && (
                              <p className="text-amber-200/80 pt-1 italic border-t border-slate-800/60 mt-1">
                                &ldquo;{q.explanation}&rdquo; {q.bibleReference ? `(${q.bibleReference})` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startQuiz(activeQuiz)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={14} /> Retake Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQuiz(null)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Explore More Quizzes</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Quiz Directory & Attempts */
          <div className="space-y-8">
            {/* Live Published Quizzes */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles size={16} /> Available Church Quizzes
              </h2>

              {loading ? (
                <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
                  <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-400">Loading scripture quizzes from church database...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                  <BookOpen size={32} className="text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-300">No Published Quizzes</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No active quizzes are published in the church collection at this time. Please check back soon!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {quiz.category || 'Scripture'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock size={12} /> {quiz.timeLimitMinutes || 5}m
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {quiz.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {quiz.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-mono">
                          {quiz.questions.length} Question{quiz.questions.length === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => startQuiz(quiz)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
                        >
                          <span>Start Quiz</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Local Attempt History */}
            {attemptHistory.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Award size={14} /> Recent Practice Attempts (Local Storage)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {attemptHistory.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white truncate max-w-[180px]">{att.quizTitle}</div>
                        <div className="text-[11px] text-slate-500">{att.date}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-400 font-mono text-sm">
                          {att.percentage}%
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {att.score}/{att.total} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
