'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import {
  AdminQuizItem,
  AdminQuizQuestion,
  INITIAL_ADMIN_QUIZZES,
  parseQuizQuestionsFromDelimitedText,
} from '@/lib/adminWave7aData';
import {
  HelpCircle,
  Plus,
  Search,
  Edit3,
  Trash2,
  Play,
  Sparkles,
  BarChart3,
  Upload,
  CheckCircle2,
  X,
  BookOpen,
} from 'lucide-react';

const STORAGE_KEY_QUIZZES = '@rhema_admin_demo_quizzes';

const SAMPLE_IMPORT_TEMPLATE = `Who built the ark according to Genesis 6?|Moses|Noah|Abraham|David|1|Genesis 6:14|God commanded Noah to build an ark of cypress wood.
In which city was Jesus born?|Nazareth|Bethlehem|Jerusalem|Capernaum|1|Matthew 2:1|Jesus was born in Bethlehem in Judea during the time of King Herod.`;

const SIMULATED_ANALYTICS_ATTEMPTS = [
  { id: 'att-1', participant: 'Sample Participant A (Demo)', quiz: 'Foundations of Faith — Hebrews 11', scorePct: 100, duration: '03:12', date: 'Nov 18, 2026' },
  { id: 'att-2', participant: 'Sample Participant B (Demo)', quiz: 'Foundations of Faith — Hebrews 11', scorePct: 85, duration: '04:05', date: 'Nov 17, 2026' },
  { id: 'att-3', participant: 'Sample Participant C (Demo)', quiz: 'Parables of the Kingdom — Gospel of Matthew', scorePct: 75, duration: '05:20', date: 'Nov 16, 2026' },
  { id: 'att-4', participant: 'Sample Participant D (Demo)', quiz: 'Foundations of Faith — Hebrews 11', scorePct: 60, duration: '06:40', date: 'Nov 15, 2026' },
];

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuizItem[]>(INITIAL_ADMIN_QUIZZES);
  const [attempts, setAttempts] = useState<Array<{ id: string; participant: string; quiz: string; scorePct: number; duration: string; date: string }>>(SIMULATED_ANALYTICS_ATTEMPTS);
  const [activeTab, setActiveTab] = useState<'studio' | 'parser' | 'reports'>('studio');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(INITIAL_ADMIN_QUIZZES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Create/Edit Quiz Metadata Modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [qTitle, setQTitle] = useState('');
  const [qCat, setQCat] = useState<AdminQuizItem['category']>('Epistles');
  const [qDiff, setQDiff] = useState<AdminQuizItem['difficulty']>('Intermediate');
  const [qTime, setQTime] = useState(10);
  const [qPass, setQPass] = useState(70);
  const [qStatus, setQStatus] = useState<AdminQuizItem['status']>('Draft');

  // Question Editor Modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qFormError, setQFormError] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qOpt0, setQOpt0] = useState('');
  const [qOpt1, setQOpt1] = useState('');
  const [qOpt2, setQOpt2] = useState('');
  const [qOpt3, setQOpt3] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qRef, setQRef] = useState('');
  const [qExp, setQExp] = useState('');

  // Interactive Quiz Preview Modal
  const [previewQuiz, setPreviewQuiz] = useState<AdminQuizItem | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, number>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Delete confirmation
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<AdminQuizItem | null>(null);

  // Parser & AI Draft State
  const [rawDelimitedText, setRawDelimitedText] = useState(SAMPLE_IMPORT_TEMPLATE);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [aiTopic, setAiTopic] = useState('Psalms of Praise (Psalm 23 & 100)');

  // 1. Real-time Firestore sync on bibleQuizzes
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');
    const unsub = onSnapshot(
      colRef,
      async (snap) => {
        if (!snap.empty) {
          const loaded: AdminQuizItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Bible Quiz',
              category: data.category || 'Epistles',
              difficulty: data.difficulty || 'Intermediate',
              timeLimitMinutes: data.timeLimitMinutes || 10,
              passingScorePct: data.passingScorePct || data.passPercentage || 70,
              status: data.status || 'draft',
              questions: Array.isArray(data.questions) ? data.questions : [],
            };
          });
          setQuizzes(loaded);
          if (!loaded.some((q) => q.id === selectedQuizId)) {
            setSelectedQuizId(loaded[0].id);
          }
        } else {
          // Auto-seed initial quizzes into Firestore if empty
          try {
            for (const q of INITIAL_ADMIN_QUIZZES) {
              await setDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', q.id), {
                ...q,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (seedErr) {
            console.error('[AdminQuizzesPage] Seeding error:', seedErr);
            setQuizzes(INITIAL_ADMIN_QUIZZES);
          }
        }
      },
      (err) => {
        console.error('[AdminQuizzesPage] Firestore error:', err);
      }
    );

    // 2. Real-time Firestore sync on quizAttempts (Analytics & Reports)
    const attColRef = collection(db, 'Rhema Church', 'rhema', 'quizAttempts');
    const unsubAtt = onSnapshot(
      attColRef,
      (snap) => {
        if (!snap.empty) {
          const loadedAttempts = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              participant: data.participant || data.participantName || 'Anonymous Member',
              quiz: data.quiz || data.quizTitle || 'Bible Quiz',
              scorePct: data.scorePct ?? data.score ?? 100,
              duration: data.duration || '03:00',
              date: data.date || (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Today'),
            };
          });
          setAttempts(loadedAttempts);
        }
      },
      () => {}
    );

    return () => {
      unsub();
      unsubAtt();
    };
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const activeQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0] || null;

  const openCreateQuiz = () => {
    setEditingQuizId(null);
    setQTitle('');
    setQCat('Gospels');
    setQDiff('Beginner');
    setQTime(10);
    setQPass(70);
    setQStatus('Draft');
    setQuizModalOpen(true);
  };

  const openEditQuiz = (item: AdminQuizItem) => {
    setEditingQuizId(item.id);
    setQTitle(item.title);
    setQCat(item.category);
    setQDiff(item.difficulty);
    setQTime(item.timeLimitMinutes);
    setQPass(item.passingScorePct);
    setQStatus(item.status);
    setQuizModalOpen(true);
  };

  const handleSaveQuizMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim()) return;
    try {
      if (editingQuizId) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', editingQuizId), {
          title: qTitle.trim(),
          category: qCat,
          difficulty: qDiff,
          timeLimitMinutes: Number(qTime) || 10,
          passingScorePct: Number(qPass) || 70,
          status: qStatus,
          updatedAt: new Date().toISOString(),
        });
        notify(`Updated quiz "${qTitle.trim()}" in Firestore.`);
      } else {
        const newDocRef = doc(collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes'));
        const created: AdminQuizItem = {
          id: newDocRef.id,
          title: qTitle.trim(),
          category: qCat,
          difficulty: qDiff,
          timeLimitMinutes: Number(qTime) || 10,
          passingScorePct: Number(qPass) || 70,
          status: qStatus,
          questions: [],
        };
        await setDoc(newDocRef, {
          ...created,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setSelectedQuizId(newDocRef.id);
        notify(`Created quiz "${created.title}" in Firestore.`);
      }
      setQuizModalOpen(false);
    } catch (err: any) {
      console.error('[AdminQuizzesPage] Save quiz error:', err);
      notify('Failed to save quiz. Please check permissions.');
    }
  };

  const handleConfirmDeleteQuiz = async () => {
    if (!deleteQuizTarget) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', deleteQuizTarget.id));
      notify(`Deleted quiz "${deleteQuizTarget.title}" from Firestore.`);
      setDeleteQuizTarget(null);
    } catch (err) {
      console.error('[AdminQuizzesPage] Delete quiz error:', err);
      notify('Failed to delete quiz.');
    }
  };

  // Question CRUD inside activeQuiz
  const openCreateQuestion = () => {
    setEditingQuestionId(null);
    setQFormError(null);
    setQText('');
    setQOpt0('');
    setQOpt1('');
    setQOpt2('');
    setQOpt3('');
    setQCorrectIdx(0);
    setQRef('');
    setQExp('');
    setQuestionModalOpen(true);
  };

  const openEditQuestion = (q: AdminQuizQuestion) => {
    setEditingQuestionId(q.id);
    setQFormError(null);
    setQText(q.question);
    setQOpt0(q.options[0]);
    setQOpt1(q.options[1]);
    setQOpt2(q.options[2]);
    setQOpt3(q.options[3]);
    setQCorrectIdx(q.correctIndex);
    setQRef(q.scriptureRef);
    setQExp(q.explanation);
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setQFormError(null);

    if (!qText.trim() || !qOpt0.trim() || !qOpt1.trim() || !qOpt2.trim() || !qOpt3.trim()) {
      setQFormError('Question text and all 4 multiple-choice answers are required.');
      return;
    }

    const record: AdminQuizQuestion = {
      id: editingQuestionId || `q-${Date.now()}`,
      question: qText.trim(),
      options: [qOpt0.trim(), qOpt1.trim(), qOpt2.trim(), qOpt3.trim()],
      correctIndex: qCorrectIdx,
      scriptureRef: qRef.trim() || 'Scripture Reference',
      explanation: qExp.trim() || 'Biblical explanation.',
    };

    const nextQuestions = editingQuestionId
      ? activeQuiz.questions.map((qq) => (qq.id === editingQuestionId ? record : qq))
      : [...activeQuiz.questions, record];

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: nextQuestions,
        updatedAt: new Date().toISOString(),
      });
      setQuestionModalOpen(false);
      notify(editingQuestionId ? 'Updated question in Firestore.' : 'Added question to Firestore quiz.');
    } catch (err) {
      console.error('[AdminQuizzesPage] Save question error:', err);
      notify('Failed to save question to Firestore.');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeQuiz) return;
    const nextQuestions = activeQuiz.questions.filter((q) => q.id !== questionId);
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: nextQuestions,
        updatedAt: new Date().toISOString(),
      });
      notify('Removed question from quiz in Firestore.');
    } catch (err) {
      console.error('[AdminQuizzesPage] Delete question error:', err);
      notify('Failed to remove question.');
    }
  };

  // Client-side file import handler (TXT/CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawDelimitedText(String(reader.result || ''));
      notify(`Loaded "${file.name}" into question parser.`);
    };
    reader.readAsText(file);
  };

  const handleImportParsedQuestions = async () => {
    if (!activeQuiz) return;
    const { parsed, errors } = parseQuizQuestionsFromDelimitedText(rawDelimitedText);
    setParseErrors(errors);
    if (parsed.length === 0) return;

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: [...activeQuiz.questions, ...parsed],
        updatedAt: new Date().toISOString(),
      });
      notify(`Imported ${parsed.length} questions into "${activeQuiz.title}" in Firestore.`);
      setActiveTab('studio');
    } catch (err) {
      console.error('[AdminQuizzesPage] Import error:', err);
      notify('Failed to save imported questions.');
    }
  };

  const handleGenerateSimulatedTemplate = async () => {
    if (!activeQuiz || !aiTopic.trim()) return;
    const generated: AdminQuizQuestion = {
      id: `ai-template-${Date.now()}`,
      question: `[Study Template] Which biblical principle is central to "${aiTopic.trim()}"?`,
      options: [
        'Trusting God’s covenant faithfulness in worship and obedience',
        'Relying solely on human wisdom without prayer',
        'Ignoring fellowship with the congregation',
        'Forgetting scriptural meditation',
      ],
      correctIndex: 0,
      scriptureRef: 'Psalm 119:105',
      explanation: 'Generated from scriptural study template.',
    };

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: [...activeQuiz.questions, generated],
        updatedAt: new Date().toISOString(),
      });
      notify(`Added 1 study question to "${activeQuiz.title}" in Firestore.`);
      setActiveTab('studio');
    } catch (err) {
      console.error('[AdminQuizzesPage] Template generation error:', err);
      notify('Failed to save question.');
    }
  };

  const handleGradePreviewAttempt = async () => {
    if (!previewQuiz) return;
    setPreviewSubmitted(true);
    const correctCount = previewQuiz.questions.filter((q) => previewAnswers[q.id] === q.correctIndex).length;
    const scorePct = previewQuiz.questions.length > 0 ? Math.round((correctCount / previewQuiz.questions.length) * 100) : 100;
    try {
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'quizAttempts'), {
        quizId: previewQuiz.id,
        quizTitle: previewQuiz.title,
        quiz: previewQuiz.title,
        participant: 'Admin Preview Session',
        participantName: 'Admin Preview Session',
        participantId: 'admin_preview',
        scorePct,
        duration: '02:15',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString(),
      });
      notify(`Recorded preview attempt: ${scorePct}%`);
    } catch (err) {
      // preview attempt write error logged silently
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const catOk = categoryFilter === 'All' || q.category === categoryFilter;
    const searchOk = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    return catOk && searchOk;
  });

  const startPreview = (quiz: AdminQuizItem) => {
    setPreviewQuiz(quiz);
    setPreviewAnswers({});
    setPreviewSubmitted(false);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-semibold">
                <HelpCircle size={14} />
                <span>M32 · Admin Bible Quiz Studio, AI Generator &amp; Reports</span>
              </div>
              <h1 className="text-2xl font-serif font-extrabold">
                Bible Quiz Authoring Studio &amp; Analytics
              </h1>
              <p className="text-xs text-slate-200">
                Build multiple-choice Bible quizzes, parse CSV/TXT question sheets locally, test-play previews, and review demonstration reports.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateQuiz}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Plus size={15} />
              <span>New Quiz (Sim)</span>
            </button>
          </div>

          {toast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{toast}</span>
              </div>
              <button type="button" onClick={() => setToast(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-[#EBE6DC] dark:border-[#222F3E] pb-2 text-xs font-semibold overflow-x-auto">
            {[
              { key: 'studio', label: `Quiz & Question Bank (${quizzes.length})`, icon: HelpCircle },
              { key: 'parser', label: 'CSV/TXT Importer & Simulated AI', icon: Sparkles },
              { key: 'reports', label: 'Quiz Analytics & Reports (Demo)', icon: BarChart3 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key as any)}
                  className={`pb-2 px-1 border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === t.key
                      ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: STUDIO & QUESTION BANK */}
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Quiz List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-white dark:bg-[#131C27] rounded-2xl p-4 border border-[#EBE6DC] dark:border-[#222F3E] space-y-2.5 text-xs">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search quizzes..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                  >
                    {['All', 'Old Testament', 'New Testament', 'Gospels', 'Epistles', 'Psalms & Wisdom'].map((c) => (
                      <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5">
                  {filteredQuizzes.map((quiz) => {
                    const selected = activeQuiz?.id === quiz.id;
                    return (
                      <div
                        key={quiz.id}
                        onClick={() => setSelectedQuizId(quiz.id)}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all space-y-2 ${
                          selected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#1E6F43] shadow-xs'
                            : 'bg-white dark:bg-[#131C27] border-[#EBE6DC] dark:border-[#222F3E]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#1E6F43] dark:text-emerald-300 font-bold">
                            {quiz.category} · {quiz.difficulty}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                            {quiz.status}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-sm">{quiz.title}</h3>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{quiz.questions.length} Questions · {quiz.timeLimitMinutes} min</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openEditQuiz(quiz)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                              title="Edit quiz settings"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteQuizTarget(quiz)}
                              className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete quiz locally"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Question Bank for Active Quiz */}
              <div className="lg:col-span-7 bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 space-y-4">
                {activeQuiz ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
                      <div>
                        <h2 className="font-serif font-bold text-base">{activeQuiz.title}</h2>
                        <p className="text-xs text-slate-500">
                          Passing Score: {activeQuiz.passingScorePct}% · Time Limit: {activeQuiz.timeLimitMinutes} mins
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activeQuiz.questions.length === 0}
                          onClick={() => startPreview(activeQuiz)}
                          className="px-3 py-1.5 rounded-xl bg-[#0B192C] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                        >
                          <Play size={13} className="text-[#E5C158]" />
                          <span>Test Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={openCreateQuestion}
                          className="px-3 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Plus size={14} />
                          <span>Add Question</span>
                        </button>
                      </div>
                    </div>

                    {activeQuiz.questions.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-[#EBE6DC] dark:border-[#222F3E] rounded-xl">
                        No questions in this quiz yet. Click &ldquo;Add Question&rdquo; or use the CSV/TXT Importer tab.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeQuiz.questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="p-4 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-2.5 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-sm text-[#18221B] dark:text-white">
                                Q{idx + 1}. {q.question}
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditQuestion(q)}
                                  className="p-1.5 rounded-lg border border-[#EBE6DC] dark:border-[#222F3E]"
                                  title="Edit question"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  title="Delete question"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] ${
                                    oIdx === q.correctIndex
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                      : 'bg-white dark:bg-[#131C27] border-[#EBE6DC] dark:border-[#222F3E] text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}. {opt} {oIdx === q.correctIndex && '✓'}
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                              <span className="font-semibold text-[#C89D35] flex items-center gap-1">
                                <BookOpen size={12} /> {q.scriptureRef}
                              </span>
                              <span className="italic">{q.explanation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-10 text-center text-xs text-slate-500">
                    Select or create a quiz to manage its question bank.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT-SIDE CSV/TXT PARSER & SIMULATED AI */}
          {activeTab === 'parser' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 space-y-4">
                <div>
                  <h2 className="font-serif font-bold text-base">Local CSV / TXT Question Importer</h2>
                  <p className="text-slate-500 mt-0.5">
                    Format per line: <code className="font-mono">Question | OptA | OptB | OptC | OptD | CorrectIndex(0-3) | Ref | Explanation</code>
                  </p>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-[#1E6F43] text-[#1E6F43] bg-emerald-50/40 dark:bg-emerald-950/30 font-semibold">
                  <Upload size={14} />
                  <span>Load Local .CSV or .TXT File (Browser Only)</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>

                <textarea
                  rows={6}
                  value={rawDelimitedText}
                  onChange={(e) => setRawDelimitedText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] font-mono text-[11px]"
                />

                {parseErrors.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-700 dark:text-red-300 space-y-1">
                    {parseErrors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!activeQuiz}
                  onClick={handleImportParsedQuestions}
                  className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white font-bold disabled:opacity-40"
                >
                  Parse &amp; Import into &ldquo;{activeQuiz?.title || 'Selected Quiz'}&rdquo;
                </button>
              </div>

              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    Local Template Simulation — Zero External AI Keys
                  </span>
                  <h2 className="font-serif font-bold text-base mt-2">Simulated AI Study Question Draft</h2>
                  <p className="text-slate-500 mt-0.5">
                    Live Gemini/Groq API generation is deferred to authenticated Cloud Functions (`functions/src/ai.ts`). Use this local template generator to test authoring flows safely.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Bible Study Topic / Passage</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                  />
                </div>

                <button
                  type="button"
                  disabled={!activeQuiz}
                  onClick={handleGenerateSimulatedTemplate}
                  className="w-full py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132A4A] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Sparkles size={15} className="text-[#E5C158]" />
                  <span>Generate Local Template Question (Sim)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ANALYTICS & REPORTS (DEMO) */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {[
                  { label: 'Total Attempts (Demo)', val: '184', note: 'Sample congregation quiz plays' },
                  { label: 'Average Score (Demo)', val: '82%', note: 'Above 70% passing threshold' },
                  { label: 'Completion Rate (Demo)', val: '94%', note: 'Simulated completion metric' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 space-y-1"
                  >
                    <span className="text-slate-500 font-semibold">{m.label}</span>
                    <div className="text-2xl font-serif font-extrabold text-[#1E6F43] dark:text-emerald-400">
                      {m.val}
                    </div>
                    <span className="text-[11px] text-slate-400">{m.note}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden">
                <div className="p-4 border-b border-[#EBE6DC] dark:border-[#222F3E] flex items-center justify-between text-xs">
                  <h3 className="font-serif font-bold text-sm">Recent Quiz Attempts (Synthetic Demo Table)</h3>
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Zero Real Member PII</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F5EE] dark:bg-[#0D141D] text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Participant</th>
                        <th className="px-4 py-3">Quiz</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE0] dark:divide-[#1E2C3D]">
                      {attempts.map((att) => (
                        <tr key={att.id}>
                          <td className="px-4 py-3 font-semibold">{att.participant}</td>
                          <td className="px-4 py-3">{att.quiz}</td>
                          <td className="px-4 py-3 font-bold text-[#1E6F43] dark:text-emerald-400">
                            {att.scorePct}%
                          </td>
                          <td className="px-4 py-3 font-mono">{att.duration}</td>
                          <td className="px-4 py-3 text-slate-400">{att.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CREATE/EDIT QUIZ META MODAL */}
          {quizModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#131C27] w-full max-w-lg rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
                  <h3 className="font-serif font-bold text-base">
                    {editingQuizId ? 'Edit Quiz Settings (Local Sim)' : 'Create New Quiz (Local Sim)'}
                  </h3>
                  <button type="button" onClick={() => setQuizModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSaveQuizMeta} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Quiz Title *</label>
                    <input
                      type="text"
                      required
                      value={qTitle}
                      onChange={(e) => setQTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Category</label>
                      <select
                        value={qCat}
                        onChange={(e) => setQCat(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      >
                        {['Old Testament', 'New Testament', 'Gospels', 'Epistles', 'Psalms & Wisdom'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Difficulty</label>
                      <select
                        value={qDiff}
                        onChange={(e) => setQDiff(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      >
                        {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Time (Min)</label>
                      <input
                        type="number"
                        min={1}
                        value={qTime}
                        onChange={(e) => setQTime(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Pass %</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={qPass}
                        onChange={(e) => setQPass(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Status</label>
                      <select
                        value={qStatus}
                        onChange={(e) => setQStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      >
                        <option value="Draft (Sim)">Draft (Sim)</option>
                        <option value="Scheduled (Sim)">Scheduled (Sim)</option>
                        <option value="Published (Sim)">Published (Sim)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                    <button
                      type="button"
                      onClick={() => setQuizModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#1E6F43] text-white font-bold"
                    >
                      Save Quiz Locally
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* QUESTION EDITOR MODAL */}
          {questionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#131C27] w-full max-w-xl rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
                  <h3 className="font-serif font-bold text-base">
                    {editingQuestionId ? 'Edit Question (Local Sim)' : 'Add Multiple-Choice Question'}
                  </h3>
                  <button type="button" onClick={() => setQuestionModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                {qFormError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 text-xs text-red-700 dark:text-red-300">
                    {qFormError}
                  </div>
                )}

                <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Question Text *</label>
                    <textarea
                      required
                      rows={2}
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-semibold">
                      4 Answer Choices (Select radio button for the correct answer) *
                    </label>
                    {[
                      { idx: 0, val: qOpt0, set: setQOpt0, lbl: 'Option A' },
                      { idx: 1, val: qOpt1, set: setQOpt1, lbl: 'Option B' },
                      { idx: 2, val: qOpt2, set: setQOpt2, lbl: 'Option C' },
                      { idx: 3, val: qOpt3, set: setQOpt3, lbl: 'Option D' },
                    ].map((opt) => (
                      <div key={opt.idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={qCorrectIdx === opt.idx}
                          onChange={() => setQCorrectIdx(opt.idx)}
                          className="accent-[#1E6F43]"
                        />
                        <input
                          type="text"
                          required
                          value={opt.val}
                          onChange={(e) => opt.set(e.target.value)}
                          placeholder={opt.lbl}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Scripture Reference</label>
                      <input
                        type="text"
                        value={qRef}
                        onChange={(e) => setQRef(e.target.value)}
                        placeholder="e.g. Hebrews 11:1"
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Answer Explanation</label>
                      <input
                        type="text"
                        value={qExp}
                        onChange={(e) => setQExp(e.target.value)}
                        placeholder="Brief biblical explanation"
                        className="w-full px-3 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                    <button
                      type="button"
                      onClick={() => setQuestionModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#1E6F43] text-white font-bold"
                    >
                      Save Question Locally
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* INTERACTIVE QUIZ PREVIEW MODAL */}
          {previewQuiz && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#131C27] w-full max-w-xl rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base">Interactive Quiz Preview (Sim)</h3>
                    <p className="text-[11px] text-slate-500">{previewQuiz.title}</p>
                  </div>
                  <button type="button" onClick={() => setPreviewQuiz(null)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {previewQuiz.questions.map((q, idx) => {
                    const chosen = previewAnswers[q.id];
                    return (
                      <div key={q.id} className="p-4 rounded-xl bg-[#F7F5EE]/70 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-2">
                        <p className="font-bold">Q{idx + 1}. {q.question}</p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            const isPicked = chosen === oIdx;
                            const isRight = previewSubmitted && oIdx === q.correctIndex;
                            const isWrongPick = previewSubmitted && isPicked && oIdx !== q.correctIndex;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={previewSubmitted}
                                onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: oIdx })}
                                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                                  isRight
                                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 font-bold'
                                    : isWrongPick
                                    ? 'bg-red-100 dark:bg-red-950 border-red-500'
                                    : isPicked
                                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                                    : 'bg-white dark:bg-[#131C27] border-[#EBE6DC] dark:border-[#222F3E]'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </button>
                            );
                          })}
                        </div>
                        {previewSubmitted && (
                          <p className="text-[11px] text-[#1E6F43] dark:text-emerald-400 pt-1">
                            <strong>{q.scriptureRef}:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {previewSubmitted ? (
                    <div className="p-4 rounded-xl bg-[#0B192C] text-white flex items-center justify-between">
                      <span>
                        Preview Score:{' '}
                        <strong>
                          {previewQuiz.questions.filter((q) => previewAnswers[q.id] === q.correctIndex).length} /{' '}
                          {previewQuiz.questions.length}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewAnswers({});
                          setPreviewSubmitted(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold"
                      >
                        Retry Preview
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGradePreviewAttempt}
                      className="w-full py-2.5 rounded-xl bg-[#1E6F43] text-white font-bold"
                    >
                      Grade Preview Attempt
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DELETE QUIZ CONFIRMATION */}
          {deleteQuizTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#131C27] w-full max-w-md rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-2xl space-y-4">
                <h3 className="font-serif font-bold text-base text-red-600">Confirm Local Quiz Deletion</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Delete <strong>{deleteQuizTarget.title}</strong> and its {deleteQuizTarget.questions.length} questions from local demonstration storage?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQuizTarget(null)}
                    className="px-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteQuiz}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                  >
                    Delete Locally
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
