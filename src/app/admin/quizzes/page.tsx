'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  serverTimestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  BarChart2,
  PauseCircle,
  Send,
  CheckCircle,
  Clock,
  BookOpen,
  Calendar as CalendarIcon,
  HelpCircle,
  Save,
  FileText,
  Upload,
  Globe,
  Check,
  AlertCircle,
  RefreshCw,
  Trophy,
  Users,
  X,
  Award,
  Sparkles,
} from 'lucide-react';

type QuizQuestionType = 'single_choice' | 'true_false';
type QuizDifficulty = 'easy' | 'medium' | 'hard';
type QuizStatus = 'draft' | 'published' | 'scheduled' | 'archived';

interface QuizQuestion {
  id: string;
  order: number;
  questionType: QuizQuestionType;
  question: string;
  questionTelugu?: string;
  options: string[];
  optionsTelugu?: string[];
  correctAnswer: string;
  bibleReference: string;
  book?: string;
  chapter?: number;
  verse?: number | string;
  explanation: string;
  explanationTelugu?: string;
  marks: number;
}

interface BibleQuiz {
  id: string;
  churchId: string;
  churchName?: string;
  title: string;
  description: string;
  category: string;
  topic?: string;
  difficulty: QuizDifficulty;
  language: string;
  bibleVersion?: string;
  book?: string;
  isDailyQuiz?: boolean;
  dailyDate?: string;
  level?: number;
  timeLimitMinutes: number;
  passPercentage: number;
  status: QuizStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  totalQuestions: number;
  totalMarks: number;
  marksPerQuestion: number;
  questions: QuizQuestion[];
  createdAt: any;
  updatedAt: any;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  participant?: string;
  memberName?: string;
  memberPhone?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeTakenSeconds?: number;
  duration?: string;
  date: string;
  submittedAt?: any;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'మరాठी' },
];

const CANONICAL_CATEGORIES = [
  'General',
  'Old Testament',
  'New Testament',
  'Gospels',
  'Epistles',
  'Psalms & Wisdom',
  'Faith',
  'Parables',
  'Miracles',
  'Family',
  'Prophecy',
];

const SCHEDULE_TIME_PRESETS = [
  { time: '05:00', label: '5:00 AM' },
  { time: '06:00', label: '6:00 AM' },
  { time: '07:00', label: '7:00 AM' },
  { time: '09:00', label: '9:00 AM' },
  { time: '12:00', label: '12:00 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '18:00', label: '6:00 PM' },
  { time: '20:00', label: '8:00 PM' },
];

const TIME_LIMIT_PRESETS = [
  { label: 'No Limit (Untimed)', value: 0 },
  { label: '5 Minutes', value: 5 },
  { label: '10 Minutes', value: 10 },
  { label: '15 Minutes', value: 15 },
  { label: '20 Minutes', value: 20 },
  { label: '30 Minutes', value: 30 },
  { label: '45 Minutes', value: 45 },
  { label: '60 Minutes', value: 60 },
];

function formatQuizTime(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '12:00 AM';
  const clean = timeStr.trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12 && match12[3]) {
    return `${match12[1]}:${match12[2]} ${match12[3].toUpperCase()}`;
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<BibleQuiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Navigation View States (Matching Mobile AdminQuizList) ──
  // 'list' | 'editor' | 'reports'
  const [currentView, setCurrentView] = useState<'list' | 'editor' | 'reports'>('list');
  const [selectedQuiz, setSelectedQuiz] = useState<BibleQuiz | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [reportSort, setReportSort] = useState<'rank' | 'recent'>('rank');
  const [reportQuizFilter, setReportQuizFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // ── Editor Form State (Matching Mobile AdminQuizEditor) ──
  const [editorId, setEditorId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
  const [passPercentage, setPassPercentage] = useState(70);
  const [publishStatus, setPublishStatus] = useState<QuizStatus>('published');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('06:00');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<string>('');

  // ── Interactive Member Preview Modal ──
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewQuizData, setPreviewQuizData] = useState<BibleQuiz | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [previewShowAnswers, setPreviewShowAnswers] = useState(false);

  // ── Delete Confirmation ──
  const [quizToDelete, setQuizToDelete] = useState<BibleQuiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attemptToDelete, setAttemptToDelete] = useState<QuizAttempt | null>(null);
  const [isDeletingAttempt, setIsDeletingAttempt] = useState(false);

  // ── Real-Time Listener on Firestore ──
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: BibleQuiz[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            churchId: data.churchId || 'rhema',
            churchName: data.churchName || 'Rhema Central Sanctuary',
            title: data.title || 'Untitled Quiz',
            description: data.description || '',
            category: data.category || 'General',
            topic: data.topic || '',
            difficulty: data.difficulty || 'medium',
            language: data.language || 'en',
            bibleVersion: data.bibleVersion || 'NIV',
            book: data.book || '',
            isDailyQuiz: !!data.isDailyQuiz,
            dailyDate: data.dailyDate || '',
            level: data.level,
            timeLimitMinutes: data.timeLimitMinutes ?? 10,
            passPercentage: data.passPercentage ?? 70,
            status: data.status || 'published',
            scheduledDate: data.scheduledDate || '',
            scheduledTime: data.scheduledTime || '06:00',
            totalQuestions: data.totalQuestions || (data.questions ? data.questions.length : 0),
            totalMarks: data.totalMarks || 0,
            marksPerQuestion: data.marksPerQuestion || 1,
            questions: Array.isArray(data.questions) ? data.questions : [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        list.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tB - tA;
        });

        setQuizzes(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quizzes:', err);
        setLoading(false);
      }
    );

    // Attempts listener
    const attColRef = collection(db, 'Rhema Church', 'rhema', 'quizAttempts');
    const unsubAtt = onSnapshot(
      attColRef,
      (snap) => {
        const attList: QuizAttempt[] = [];
        snap.forEach((d) => {
          const data = d.data();
          attList.push({
            id: d.id,
            quizId: data.quizId || '',
            quizTitle: data.quizTitle || 'Bible Quiz',
            participant: data.participant || data.memberName || 'Congregation Member',
            memberName: data.memberName || data.participant || 'Congregation Member',
            memberPhone: data.memberPhone || '',
            score: data.score || 0,
            totalMarks: data.totalMarks || 10,
            percentage: data.percentage || 0,
            passed: typeof data.passed === 'boolean' ? data.passed : (data.percentage || 0) >= 70,
            timeTakenSeconds: data.timeTakenSeconds || 0,
            duration: data.duration || (data.timeTakenSeconds ? `${Math.floor(data.timeTakenSeconds / 60)}m ${data.timeTakenSeconds % 60}s` : '0s'),
            date: data.date || (data.submittedAt?.toDate ? data.submittedAt.toDate().toLocaleDateString() : 'Today'),
            submittedAt: data.submittedAt,
          });
        });

        attList.sort((a, b) => {
          const tA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
          const tB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
          return tB - tA;
        });

        setAttempts(attList);
      },
      (err) => {
        console.warn('Attempts listener warning:', err);
      }
    );

    return () => {
      unsub();
      unsubAtt();
    };
  }, []);

  // Counts
  const totalCount = quizzes.length;
  const publishedCount = quizzes.filter((q) => q.status === 'published').length;
  const scheduledCount = quizzes.filter((q) => q.status === 'scheduled').length;
  const draftCount = quizzes.filter((q) => q.status === 'draft').length;

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const qLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !qLower ||
        q.title.toLowerCase().includes(qLower) ||
        (q.book && q.book.toLowerCase().includes(qLower)) ||
        (q.category && q.category.toLowerCase().includes(qLower)) ||
        (q.topic && q.topic.toLowerCase().includes(qLower));

      if (!matchesSearch) return false;

      if (statusFilter === 'Published') return q.status === 'published';
      if (statusFilter === 'Scheduled') return q.status === 'scheduled';
      if (statusFilter === 'Drafts') return q.status === 'draft';
      if (statusFilter === 'Daily') return q.isDailyQuiz;

      return true;
    });
  }, [quizzes, searchQuery, statusFilter]);

  // Unique list of quizzes for Reports filter
  const attemptedQuizzes = useMemo(() => {
    const map = new Map<string, string>();
    attempts.forEach((a) => {
      if (a.quizTitle) map.set(a.quizId || a.quizTitle, a.quizTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [attempts]);

  // Filtered & Ranked Attempts
  const filteredAndRankedAttempts = useMemo(() => {
    let list = [...attempts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          (a.participant || a.memberName || '').toLowerCase().includes(q) ||
          (a.quizTitle || '').toLowerCase().includes(q) ||
          (a.memberPhone || '').toLowerCase().includes(q)
      );
    }

    if (reportQuizFilter !== 'All') {
      list = list.filter((a) => a.quizId === reportQuizFilter || a.quizTitle === reportQuizFilter);
    }

    if (reportSort === 'rank') {
      list.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    } else {
      list.sort((a, b) => {
        const da = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
        const dbTime = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
        return dbTime - da;
      });
    }

    return list;
  }, [attempts, searchQuery, reportQuizFilter, reportSort]);

  // ── Open Editor (New Quiz or Edit Quiz) ──
  const openEditor = (quiz?: BibleQuiz) => {
    setFormError(null);
    if (quiz) {
      setEditorId(quiz.id);
      setTitle(quiz.title || '');
      setTopic(quiz.topic || '');
      setCategory(quiz.category || 'General');
      setDifficulty(quiz.difficulty || 'medium');
      setLanguage(quiz.language || 'en');
      setDescription(quiz.description || '');
      setTimeLimitMinutes(quiz.timeLimitMinutes ?? 10);
      setPassPercentage(quiz.passPercentage ?? 70);
      setPublishStatus(quiz.status || 'published');
      setScheduledDate(quiz.scheduledDate || new Date().toISOString().slice(0, 10));
      setScheduledTime(quiz.scheduledTime || '06:00');
      setQuestions(Array.isArray(quiz.questions) && quiz.questions.length > 0 ? [...quiz.questions] : []);
      setSourceFile('');
    } else {
      setEditorId(null);
      setTitle('');
      setTopic('');
      setCategory('General');
      setDifficulty('medium');
      setLanguage('en');
      setDescription('');
      setTimeLimitMinutes(10);
      setPassPercentage(70);
      setPublishStatus('published');
      setScheduledDate(new Date().toISOString().slice(0, 10));
      setScheduledTime('06:00');
      setQuestions([
        {
          id: 'q_' + Date.now(),
          order: 1,
          questionType: 'single_choice',
          question: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          bibleReference: '',
          explanation: '',
          marks: 1,
        },
      ]);
      setSourceFile('');
    }
    setCurrentView('editor');
  };

  // ── One-Click Status Toggle ──
  const handleTogglePublish = async (quiz: BibleQuiz) => {
    const newStatus: QuizStatus = quiz.status === 'published' ? 'draft' : 'published';
    const today = new Date().toISOString().slice(0, 10);
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', quiz.id), {
        status: newStatus,
        scheduledDate: quiz.scheduledDate || today,
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'bibleQuizzes', quiz.id), {
          status: newStatus,
          scheduledDate: quiz.scheduledDate || today,
          updatedAt: serverTimestamp(),
        });
      } catch {}
      setToast(`Quiz "${quiz.title}" is now ${newStatus === 'published' ? 'Published Live' : 'moved to Draft'}.`);
    } catch (err: any) {
      console.error(err);
      setToast('Failed to update status.');
    }
  };

  // ── Save Quiz (Mobile AdminQuizEditor) ──
  const handleSaveQuiz = async (saveMode?: QuizStatus) => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Quiz Title is required.');
      return;
    }

    const finalStatus = saveMode || publishStatus;
    const cleanQuestions = questions.filter((q) => q.question.trim().length > 0);
    const totalMarks = cleanQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const payload = {
      churchId: 'rhema',
      title: title.trim(),
      topic: topic.trim(),
      category: category,
      difficulty: difficulty,
      language: language,
      description: description.trim(),
      timeLimitMinutes: Number(timeLimitMinutes) || 0,
      passPercentage: Number(passPercentage) || 70,
      status: finalStatus,
      scheduledDate: finalStatus === 'scheduled' ? scheduledDate : '',
      scheduledTime: finalStatus === 'scheduled' ? scheduledTime : '',
      totalQuestions: cleanQuestions.length,
      totalMarks: totalMarks,
      marksPerQuestion: 1,
      questions: cleanQuestions,
      updatedAt: serverTimestamp(),
    };

    try {
      setIsSaving(true);
      if (editorId) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', editorId), payload);
        try {
          await updateDoc(doc(db, 'bibleQuizzes', editorId), payload);
        } catch {}
        setToast(`Updated quiz "${title.trim()}".`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');
        const newDoc = await addDoc(colRef, {
          ...payload,
          isDailyQuiz: false,
          createdAt: serverTimestamp(),
        });
        try {
          await setDoc(doc(db, 'bibleQuizzes', newDoc.id), {
            ...payload,
            id: newDoc.id,
            isDailyQuiz: false,
            createdAt: serverTimestamp(),
          });
        } catch {}
        setToast(`Created new quiz "${title.trim()}".`);
      }
      setCurrentView('list');
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      setFormError(err.message || 'Failed to save quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete Quiz ──
  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', quizToDelete.id));
      try {
        await deleteDoc(doc(db, 'bibleQuizzes', quizToDelete.id));
      } catch {}
      setToast(`Deleted quiz "${quizToDelete.title}".`);
      setQuizToDelete(null);
    } catch (err) {
      console.error(err);
      setToast('Failed to delete quiz.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Delete Attempt ──
  const confirmDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeletingAttempt(true);
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'quizAttempts', attemptToDelete.id));
      setToast(`Deleted quiz attempt for ${attemptToDelete.participant || 'member'}.`);
      setAttemptToDelete(null);
    } catch (err) {
      console.error(err);
      setToast('Failed to delete attempt.');
    } finally {
      setIsDeletingAttempt(false);
    }
  };

  // ── Question Editing Helpers ──
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        order: prev.length + 1,
        questionType: 'single_choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        bibleReference: '',
        explanation: '',
        marks: 1,
      },
    ]);
  };

  const handleUpdateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetCorrectAnswer = (qIdx: number, optVal: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctAnswer: optVal };
      return copy;
    });
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...(copy[qIdx].options || [])];
      opts[optIdx] = text;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  // ── Launch Preview ──
  const openPreviewModal = (quiz: BibleQuiz) => {
    setPreviewQuizData(quiz);
    setPreviewAnswers({});
    setPreviewShowAnswers(false);
    setPreviewVisible(true);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="max-w-4xl mx-auto space-y-4 pb-20">
          {/* Toast Notification */}
          {toast && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg animate-in fade-in">
              <span>{toast}</span>
              <button onClick={() => setToast(null)} className="p-1 hover:opacity-75 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* VIEW 1: QUIZZES DIRECTORY LIST (MATCHING MOBILE AdminQuizList EXACTLY) */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {currentView === 'list' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Signature Admin Pinned Header (Centered Title, Theme Colors) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div className="min-w-[64px]" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
                  Bible Quizzes
                </h1>
                <div className="min-w-[64px] flex justify-end">
                  <button
                    type="button"
                    onClick={() => openEditor()}
                    className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    statusFilter === 'Reports'
                      ? 'Search by member name, quiz title, phone...'
                      : 'Search by title, book, category...'
                  }
                  className="w-full pl-9 pr-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium shadow-2xs"
                />
              </div>

              {/* Filter Badges with Counts (Exact Mobile Filter Pills) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { key: 'All', label: 'All Quizzes', count: totalCount },
                  { key: 'Published', label: 'Published', count: publishedCount },
                  { key: 'Scheduled', label: 'Scheduled', count: scheduledCount },
                  { key: 'Drafts', label: 'Drafts', count: draftCount },
                  { key: 'Reports', label: 'Reports', count: attempts.length },
                ].map((item) => {
                  const isActive = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isActive
                            ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Content: Quizzes Cards Feed vs Reports Section ── */}
              {statusFilter === 'Reports' ? (
                /* ── Embedded Reports Section (renderReportsSection) ── */
                <div className="space-y-4">
                  {/* Reports Header Card */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                          Quiz Results &amp; Leaderboard
                        </h2>
                        <p className="text-xs text-slate-500">
                          Member participation, scores, and prize rankings
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
                        <Users size={13} />
                        <span>{new Set(attempts.map((a) => a.participant || a.memberName)).size} Members</span>
                      </span>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-xl font-black text-slate-900 dark:text-white block">
                          {attempts.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Attempts</span>
                      </div>
                      <div className="border-x border-slate-200 dark:border-slate-800">
                        <span className="text-xl font-black text-emerald-600 block">
                          {attempts.length > 0
                            ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length)
                            : 0}
                          %
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Score</span>
                      </div>
                      <div>
                        <span className="text-xl font-black text-amber-500 block">
                          {filteredAndRankedAttempts[0] ? `${filteredAndRankedAttempts[0].percentage}%` : '0%'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Top Score</span>
                      </div>
                    </div>

                    {/* Sort Toggle Row */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-bold text-slate-500">Sort by:</span>
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setReportSort('rank')}
                          className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            reportSort === 'rank'
                              ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Trophy size={13} />
                          <span>Rank (Winners)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportSort('recent')}
                          className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            reportSort === 'recent'
                              ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Clock size={13} />
                          <span>Recent</span>
                        </button>
                      </div>
                    </div>

                    {/* Quiz Filter Chips if multiple */}
                    {attemptedQuizzes.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setReportQuizFilter('All')}
                          className={`px-3 py-1 rounded-full font-bold border whitespace-nowrap cursor-pointer ${
                            reportQuizFilter === 'All'
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          All Quizzes ({attempts.length})
                        </button>
                        {attemptedQuizzes.map((q) => {
                          const isSel = reportQuizFilter === q.title;
                          const count = attempts.filter((a) => a.quizTitle === q.title).length;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setReportQuizFilter(q.title)}
                              className={`px-3 py-1 rounded-full font-bold border whitespace-nowrap cursor-pointer ${
                                isSel
                                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {q.title} ({count})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attempts Cards */}
                  <div className="space-y-3">
                    {filteredAndRankedAttempts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                        No quiz attempts found matching your filter criteria.
                      </div>
                    ) : (
                      filteredAndRankedAttempts.map((att, idx) => (
                        <div
                          key={att.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                              {reportSort === 'rank' && idx === 0 ? '🥇' : reportSort === 'rank' && idx === 1 ? '🥈' : reportSort === 'rank' && idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {att.participant || att.memberName}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {att.quizTitle} · {att.date} {att.duration ? `· ⏱️ ${att.duration}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-base font-black text-emerald-600 block">
                                {att.percentage}%
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.passed
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                }`}
                              >
                                {att.passed ? 'PASSED' : 'NEEDS STUDY'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttemptToDelete(att)}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              title="Delete Attempt"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-emerald-500" />
                  <span>Loading quizzes...</span>
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {statusFilter === 'Drafts'
                      ? 'No draft quizzes found.'
                      : statusFilter === 'Scheduled'
                      ? 'No scheduled quizzes found.'
                      : statusFilter === 'Published'
                      ? 'No published quizzes found.'
                      : 'No quizzes match your filter criteria.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openEditor()}
                    className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-sm cursor-pointer"
                  >
                    + Create a Quiz Now
                  </button>
                </div>
              ) : (
                /* ── Quiz Cards Feed (Exact Mobile AdminQuizList Card Layout) ── */
                <div className="space-y-3">
                  {filteredQuizzes.map((quiz) => {
                    const isPublished = quiz.status === 'published';
                    const isScheduled = quiz.status === 'scheduled';

                    return (
                      <div
                        key={quiz.id}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-all hover:shadow-sm"
                      >
                        {/* Top Row: Badges on Left & Edit/Delete on Right (Straight in Line) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Status Badge */}
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPublished
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : isScheduled
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isScheduled && quiz.scheduledDate
                                ? `📅 ${quiz.scheduledDate}${quiz.scheduledTime ? ` · ⏰ ${formatQuizTime(quiz.scheduledTime)}` : ''}`
                                : quiz.status.toUpperCase()}
                            </span>

                            {quiz.isDailyQuiz && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                ☀️ DAILY
                              </span>
                            )}

                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                              {quiz.difficulty.toUpperCase()}
                            </span>

                            {quiz.level && (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
                                LEVEL {quiz.level}
                              </span>
                            )}
                          </div>

                          {/* Top Right: Edit & Delete Buttons straight in line with Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditor(quiz)}
                              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizToDelete(quiz)}
                              className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-100 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Main Content: Title & Meta Info */}
                        <div className="cursor-pointer" onClick={() => openPreviewModal(quiz)}>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                            {quiz.title}
                          </h3>

                          {/* Sub Details: Book / Category · Questions · TimeLimit */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            {quiz.book ? (
                              <span>📖 {quiz.book}</span>
                            ) : (
                              <span>🏷️ {quiz.category || 'General'}</span>
                            )}
                            <span>·</span>
                            <span>{quiz.totalQuestions || quiz.questions?.length || 0} Questions</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />{' '}
                              {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes}m` : 'Untimed'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Actions Row: View, Report, Move to Draft / Publish */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => openPreviewModal(quiz)}
                            className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 cursor-pointer"
                          >
                            <Eye size={15} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuiz(quiz);
                              setReportQuizFilter(quiz.title);
                              setStatusFilter('Reports');
                            }}
                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            <BarChart2 size={15} />
                            <span>Report</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePublish(quiz)}
                            className={`flex items-center gap-1.5 cursor-pointer ${
                              isPublished
                                ? 'text-amber-600 hover:text-amber-700'
                                : 'text-emerald-600 hover:text-emerald-700'
                            }`}
                          >
                            {isPublished ? (
                              <>
                                <PauseCircle size={15} />
                                <span>Move to Draft</span>
                              </>
                            ) : (
                              <>
                                <Send size={15} />
                                <span>Publish</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* VIEW 2: COMPLETE BIBLE QUIZ EDITOR (MATCHING MOBILE AdminQuizEditor) */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {currentView === 'editor' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Signature Admin Pinned Header */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                {/* Left: Back Button */}
                <div className="min-w-[70px]">
                  <button
                    type="button"
                    onClick={() => setCurrentView('list')}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <ArrowLeft size={20} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Middle: Centered Heading Text */}
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
                  {editorId ? 'Edit Bible Quiz' : 'New Bible Quiz'}
                </h2>

                {/* Right: Preview Button */}
                <div className="min-w-[70px] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const tempQuiz: BibleQuiz = {
                        id: editorId || 'preview_temp',
                        churchId: 'rhema',
                        title: title || 'Untitled Quiz',
                        description: description,
                        category: category,
                        topic: topic,
                        difficulty: difficulty,
                        language: language,
                        timeLimitMinutes: timeLimitMinutes,
                        passPercentage: passPercentage,
                        status: publishStatus,
                        scheduledDate: scheduledDate,
                        scheduledTime: scheduledTime,
                        totalQuestions: questions.length,
                        totalMarks: questions.reduce((s, q) => s + (q.marks || 1), 0),
                        marksPerQuestion: 1,
                        questions: questions,
                        createdAt: null,
                        updatedAt: null,
                      };
                      openPreviewModal(tempQuiz);
                    }}
                    className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer hover:opacity-90"
                  >
                    <Eye size={15} strokeWidth={2.2} />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* ── 1. Create Quiz from Uploaded Document (Up to 10 Questions) ── */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Upload Document
                    </h3>
                    <p className="text-xs text-slate-500">Auto-extracts up to 10 questions</p>
                  </div>
                </div>

                {sourceFile && (
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-bold truncate">{sourceFile}</span>
                    <button
                      type="button"
                      onClick={() => setSourceFile('')}
                      className="p-1 rounded text-red-600 hover:bg-red-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Supports PDF, Word (DOC/DOCX), Excel (XLSX), CSV, or Notepad (TXT) study notes. Automatically extracts and generates up to 10 questions.
                </p>

                {/* Quick Language Target Selector (Symmetrical 2x2 Grid) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    DOCUMENT / TARGET LANGUAGE:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: 'te', label: 'Telugu (తెలుగు)' },
                      { code: 'en', label: 'English' },
                      { code: 'hi', label: 'Hindi (हिन्दी)' },
                      { code: 'ta', label: 'Tamil (தமிழ்)' },
                    ].map((l) => {
                      const isSel = language === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setLanguage(l.code)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upload File Input */}
                <label className="cursor-pointer w-full py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-90">
                  <Upload size={16} />
                  <span>Choose Document &amp; Generate Quiz</span>
                  <input
                    type="file"
                    accept=".txt,.csv,.doc,.docx,.pdf,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSourceFile(file.name);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const text = String(reader.result || '');
                        const lines = text.split('\n').filter((l) => l.trim().length > 0);
                        const extracted: QuizQuestion[] = [];
                        lines.slice(0, 10).forEach((line, idx) => {
                          const parts = line.split('|').map((p) => p.trim());
                          if (parts.length >= 3) {
                            const opts = [parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || ''].filter(
                              (o) => o.length > 0
                            );
                            extracted.push({
                              id: `doc_${Date.now()}_${idx}`,
                              order: idx + 1,
                              questionType: opts.length === 2 && (opts[0] === 'True' || opts[0] === 'False') ? 'true_false' : 'single_choice',
                              question: parts[0],
                              options: opts.length >= 2 ? opts : ['Choice A', 'Choice B'],
                              correctAnswer: parts[5] || opts[0],
                              bibleReference: parts[6] || '',
                              explanation: parts[7] || '',
                              marks: 1,
                            });
                          }
                        });
                        if (extracted.length > 0) {
                          setQuestions(extracted);
                          setToast(`10 Questions Extracted from "${file.name}"!`);
                        } else {
                          setToast(`Loaded "${file.name}".`);
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* ── 2. Schedule & Publication Section ── */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
                    <CalendarIcon size={15} />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Schedule &amp; Availability
                  </h3>
                </div>

                {/* Status Segment Control: Draft | Scheduled | Publish Now */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  {[
                    { key: 'draft', label: 'Save Draft' },
                    { key: 'scheduled', label: 'Scheduled' },
                    { key: 'published', label: 'Publish Live' },
                  ].map((opt) => {
                    const isSelected = publishStatus === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPublishStatus(opt.key as QuizStatus)}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Inline Schedule Controls when Scheduled */}
                {publishStatus === 'scheduled' && (
                  <div className="space-y-4 pt-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <Clock size={16} className="text-blue-500 shrink-0" />
                      <span>
                        Members will automatically unlock this quiz on{' '}
                        <strong>{scheduledDate}</strong> at{' '}
                        <strong>{formatQuizTime(scheduledTime)}</strong>.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Release Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Release Time (24h)
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Quick Time Presets */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Quick Presets
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SCHEDULE_TIME_PRESETS.map((p) => {
                          const isSel = scheduledTime === p.time;
                          return (
                            <button
                              key={p.time}
                              type="button"
                              onClick={() => setScheduledTime(p.time)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 3. Quiz Details ── */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs font-semibold">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
                    <BookOpen size={15} />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Quiz Information
                  </h3>
                </div>

                {/* Quiz Title */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sunday Fellowship Bible Challenge"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-xs"
                  />
                </div>

                {/* Topic / Series (Optional) */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Series (Optional)
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Gospel of John, Life of David, Parables..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-xs"
                  />
                </div>

                {/* Difficulty Segment */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => {
                      const isSel = difficulty === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`py-2.5 rounded-xl font-black text-xs uppercase border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-xs"
                  >
                    {CANONICAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSel = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setLanguage(lang.code)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {lang.name} ({lang.native})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Limit Selector */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Time Limit (Per Attempt)
                  </label>
                  <p className="text-[11px] text-slate-500 font-normal mb-1.5">
                    A live countdown timer will be displayed during the quiz. Choose "No Limit" for relaxed untimed study.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_LIMIT_PRESETS.map((item) => {
                      const isSel = timeLimitMinutes === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setTimeLimitMinutes(item.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <Clock size={12} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Passing Score */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-xs"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Description / Study Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Read John 1-5 prior to attempting this quiz challenge."
                    className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-xs"
                  />
                </div>
              </div>

              {/* ── 4. Questions Builder ── */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
                      <HelpCircle size={15} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Quiz Questions ({questions.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tap the circle (○) to mark the correct answer
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3.5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                </div>

                {/* Question Cards List */}
                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      {/* Question Header: Number & Type Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-black flex items-center justify-center">
                          Q{qIdx + 1}
                        </div>

                        {/* Type toggle */}
                        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestion(qIdx, 'questionType', 'single_choice')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              q.questionType === 'single_choice'
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Multiple Choice
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateQuestion(qIdx, 'questionType', 'true_false');
                              handleUpdateQuestion(qIdx, 'options', ['True', 'False']);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              q.questionType === 'true_false'
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            True / False
                          </button>
                        </div>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                        placeholder="Type the question text here..."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs"
                      />

                      {/* Options */}
                      <div className="space-y-2">
                        {(q.questionType === 'true_false' ? ['True', 'False'] : q.options || []).map(
                          (optVal, optIdx) => {
                            const isCorrect = q.correctAnswer === optVal && optVal.trim().length > 0;
                            return (
                              <div key={optIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSetCorrectAnswer(qIdx, optVal)}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    isCorrect
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                                  }`}
                                >
                                  {isCorrect && <Check size={12} strokeWidth={3} />}
                                </button>
                                <div
                                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                    isCorrect
                                      ? 'border-emerald-500 bg-white dark:bg-slate-900'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                  }`}
                                >
                                  <span className="font-bold text-slate-400 text-xs">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  {q.questionType === 'true_false' ? (
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                      {optVal}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={optVal}
                                      onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                      className="flex-1 bg-transparent border-none outline-none text-xs font-semibold"
                                    />
                                  )}
                                  {isCorrect && (
                                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                      {/* Bible Reference & Explanation */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <BookOpen size={16} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={q.bibleReference || ''}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'bibleReference', e.target.value)}
                            placeholder="Bible Reference (e.g. John 3:16)"
                            className="flex-1 bg-transparent border-none outline-none text-xs font-medium"
                          />
                        </div>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="Scripture Explanation / Devotional Insight (optional)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Another Question Button */}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Plus size={16} />
                  <span>Add Another Question</span>
                </button>
              </div>

              {/* ── 5. Footer Buttons (Exact Mobile Layout) ── */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuiz('draft')}
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <Save size={16} />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuiz(publishStatus)}
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-90"
                >
                  {isSaving ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : publishStatus === 'scheduled' ? (
                    <>
                      <Clock size={16} />
                      <span>Schedule Quiz</span>
                    </>
                  ) : publishStatus === 'draft' ? (
                    <>
                      <Save size={16} />
                      <span>Save Draft</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Publish Quiz Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 1: INTERACTIVE MEMBER PREVIEW (EXACT MOBILE PREVIEW) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {previewVisible && previewQuizData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                      Live Member Preview
                    </span>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-0.5">
                      {previewQuizData.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {previewQuizData.questions?.length || 0} Questions ·{' '}
                      {previewQuizData.timeLimitMinutes > 0 ? `${previewQuizData.timeLimitMinutes}m` : 'Untimed'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewVisible(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {(previewQuizData.questions || []).map((q, idx) => {
                    const sel = previewAnswers[q.id];
                    return (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                            Question {idx + 1} of {previewQuizData.questions.length}
                          </span>
                          {q.bibleReference && (
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                              <BookOpen size={12} />
                              <span>{q.bibleReference}</span>
                            </span>
                          )}
                        </div>

                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">{q.question}</p>

                        <div className="space-y-2 text-xs font-semibold">
                          {(q.options || []).map((opt, oIdx) => {
                            const isSelected = sel === opt;
                            const isCorrect = previewShowAnswers && q.correctAnswer === opt;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setPreviewAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white border-emerald-500 font-bold'
                                    : isSelected
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <span>
                                  <strong className="mr-1">{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                                </span>
                                {isCorrect && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>

                        {previewShowAnswers && q.explanation && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs italic">
                            Explanation: {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewShowAnswers((prev) => !prev)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {previewShowAnswers ? 'Hide Answers' : 'Reveal Answers & Scripture'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVisible(false)}
                    className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 2: CONFIRM DELETE QUIZ */}
          {/* ───────────────────────────────────────────────────────────── */}
          {quizToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Delete Bible Quiz?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to permanently delete "{quizToDelete.title}"? This cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuizToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDeleteQuiz}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 3: CONFIRM DELETE ATTEMPT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {attemptToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Delete Quiz Report?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete the report for {attemptToDelete.participant || 'this member'}? This will remove their score and submission.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAttemptToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAttempt}
                    onClick={confirmDeleteAttempt}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isDeletingAttempt ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    <span>Delete</span>
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
