'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
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
  Clock,
  Calendar as CalendarIcon,
  Globe,
  Check,
  AlertCircle,
  FileText,
  RefreshCw,
  Eye,
  Trophy,
  Award,
  Users,
  Filter,
  ArrowUpDown,
  Phone,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Send,
  Save,
  Pause,
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

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
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
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'studio' | 'parser' | 'reports'>('studio');

  // Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [reportSort, setReportSort] = useState<'rank' | 'recent'>('rank');
  const [reportQuizFilter, setReportQuizFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // ── Quiz Create / Edit Modal State (Full Mobile Parity) ──
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [quizFormError, setQuizFormError] = useState<string | null>(null);

  // Form Fields
  const [qTitle, setQTitle] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qCategory, setQCategory] = useState('General');
  const [qDifficulty, setQDifficulty] = useState<QuizDifficulty>('medium');
  const [qLanguage, setQLanguage] = useState('en');
  const [qBibleVersion, setQBibleVersion] = useState('NIV');
  const [qBook, setQBook] = useState('');
  const [qDescription, setQDescription] = useState('');
  const [qTimeLimit, setQTimeLimit] = useState(10);
  const [qPassPercentage, setQPassPercentage] = useState(70);
  const [qStatus, setQStatus] = useState<QuizStatus>('published');
  const [qScheduledDate, setQScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [qScheduledTime, setQScheduledTime] = useState('06:00');
  const [formQuestions, setFormQuestions] = useState<QuizQuestion[]>([]);

  // ── Focused Question Editor Modal (Right Panel Quick Add/Edit) ──
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qFormError, setQFormError] = useState<string | null>(null);

  // Question fields
  const [questType, setQuestType] = useState<QuizQuestionType>('single_choice');
  const [questText, setQuestText] = useState('');
  const [questTextTe, setQuestTextTe] = useState('');
  const [questOptions, setQuestOptions] = useState<string[]>(['', '', '', '']);
  const [questOptionsTe, setQuestOptionsTe] = useState<string[]>(['', '', '', '']);
  const [questCorrectAnswer, setQuestCorrectAnswer] = useState('');
  const [questBibleRef, setQuestBibleRef] = useState('');
  const [questExplanation, setQuestExplanation] = useState('');
  const [questExplanationTe, setQuestExplanationTe] = useState('');
  const [questMarks, setQuestMarks] = useState(1);

  // ── Interactive Member Preview Modal ──
  const [previewQuiz, setPreviewQuiz] = useState<BibleQuiz | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [previewShowAnswers, setPreviewShowAnswers] = useState(false);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // ── Inspect Attempt Modal (Reports) ──
  const [inspectAttempt, setInspectAttempt] = useState<QuizAttempt | null>(null);

  // ── Delete Confirmation ──
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<BibleQuiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attemptToDelete, setAttemptToDelete] = useState<QuizAttempt | null>(null);
  const [isDeletingAttempt, setIsDeletingAttempt] = useState(false);

  // ── Document Parser & Auto-Extractor State ──
  const [rawParserText, setRawParserText] = useState(
    `Who built the ark according to Genesis 6?|Moses|Noah|Abraham|David|Noah|Genesis 6:14|God commanded Noah to build an ark of cypress wood.
In which city was Jesus born?|Nazareth|Bethlehem|Jerusalem|Capernaum|Bethlehem|Matthew 2:1|Jesus was born in Bethlehem in Judea during the reign of King Herod.`
  );
  const [parserFileAttached, setParserFileAttached] = useState<string>('');
  const [parserError, setParserError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);

  // ── Real-Time Listener on Firestore ──
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const loaded: BibleQuiz[] = [];
        snap.forEach((d) => {
          const data = d.data();
          loaded.push({
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

        loaded.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tB - tA;
        });

        setQuizzes(loaded);
        if (!selectedQuizId && loaded.length > 0) {
          setSelectedQuizId(loaded[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching bible quizzes:', err);
        setLoading(false);
      }
    );

    // Listen to real congregation attempts
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

  // Summary Metrics matching Mobile AdminQuizList
  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.status === 'published').length;
    const scheduled = quizzes.filter((q) => q.status === 'scheduled').length;
    const drafts = quizzes.filter((q) => q.status === 'draft').length;
    const daily = quizzes.filter((q) => q.isDailyQuiz).length;
    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
        : 82;
    return { total, published, scheduled, drafts, daily, totalAttempts, avgScore };
  }, [quizzes, attempts]);

  // Unique list of quizzes for Reports filter
  const attemptedQuizzes = useMemo(() => {
    const map = new Map<string, string>();
    attempts.forEach((a) => {
      if (a.quizTitle) map.set(a.quizId || a.quizTitle, a.quizTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [attempts]);

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return quizzes.filter((item) => {
      // Status Filter
      if (statusFilter === 'Published' && item.status !== 'published') return false;
      if (statusFilter === 'Scheduled' && item.status !== 'scheduled') return false;
      if (statusFilter === 'Drafts' && item.status !== 'draft') return false;
      if (statusFilter === 'Daily' && !item.isDailyQuiz) return false;

      // Category Filter
      if (categoryFilter !== 'All' && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Search Query (Title, Topic, Book)
      if (q && statusFilter !== 'Reports') {
        const t = (item.title || '').toLowerCase();
        const top = (item.topic || '').toLowerCase();
        const b = (item.book || '').toLowerCase();
        const c = (item.category || '').toLowerCase();
        if (!t.includes(q) && !top.includes(q) && !b.includes(q) && !c.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [quizzes, statusFilter, categoryFilter, searchQuery]);

  // Active quiz for question bank
  const activeQuiz = useMemo(() => {
    if (filteredQuizzes.length === 0) return null;
    return filteredQuizzes.find((q) => q.id === selectedQuizId) || filteredQuizzes[0] || null;
  }, [filteredQuizzes, selectedQuizId]);

  // Filtered and Ranked Attempts for Reports
  const filteredAndRankedAttempts = useMemo(() => {
    let list = [...attempts];

    if (searchQuery.trim() && (statusFilter === 'Reports' || activeTab === 'reports')) {
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
  }, [attempts, searchQuery, statusFilter, activeTab, reportQuizFilter, reportSort]);

  // ── One-Click Status Toggle (Mobile Parity) ──
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
      console.error('Error toggling publish status:', err);
      setToast('Failed to update quiz status.');
    }
  };

  // ── Open Create Quiz Modal (Full Mobile Parity) ──
  const openCreateQuizModal = () => {
    setEditingQuizId(null);
    setQuizFormError(null);
    setQTitle('');
    setQTopic('');
    setQCategory('General');
    setQDifficulty('medium');
    setQLanguage('en');
    setQBibleVersion('NIV');
    setQBook('');
    setQDescription('');
    setQTimeLimit(10);
    setQPassPercentage(70);
    setQStatus('published');
    setQScheduledDate(new Date().toISOString().slice(0, 10));
    setQScheduledTime('06:00');
    setFormQuestions([
      {
        id: 'q_' + Date.now(),
        order: 1,
        questionType: 'single_choice',
        question: '',
        questionTelugu: '',
        options: ['', '', '', ''],
        optionsTelugu: ['', '', '', ''],
        correctAnswer: '',
        bibleReference: '',
        explanation: '',
        explanationTelugu: '',
        marks: 1,
      },
    ]);
    setQuizModalOpen(true);
  };

  // ── Open Edit Quiz Modal (Full Mobile Parity) ──
  const openEditQuizModal = (item: BibleQuiz) => {
    setEditingQuizId(item.id);
    setQuizFormError(null);
    setQTitle(item.title || '');
    setQTopic(item.topic || '');
    setQCategory(item.category || 'General');
    setQDifficulty(item.difficulty || 'medium');
    setQLanguage(item.language || 'en');
    setQBibleVersion(item.bibleVersion || 'NIV');
    setQBook(item.book || '');
    setQDescription(item.description || '');
    setQTimeLimit(item.timeLimitMinutes ?? 10);
    setQPassPercentage(item.passPercentage ?? 70);
    setQStatus(item.status || 'published');
    setQScheduledDate(item.scheduledDate || new Date().toISOString().slice(0, 10));
    setQScheduledTime(item.scheduledTime || '06:00');
    setFormQuestions(Array.isArray(item.questions) && item.questions.length > 0 ? [...item.questions] : []);
    setQuizModalOpen(true);
  };

  // ── Form Inline Question Helpers ──
  const handleAddInlineQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        order: prev.length + 1,
        questionType: 'single_choice',
        question: '',
        questionTelugu: '',
        options: ['', '', '', ''],
        optionsTelugu: ['', '', '', ''],
        correctAnswer: '',
        bibleReference: '',
        explanation: '',
        explanationTelugu: '',
        marks: 1,
      },
    ]);
  };

  const handleUpdateInlineQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    setFormQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveInlineQuestion = (idx: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetInlineCorrectAnswer = (qIdx: number, optVal: string) => {
    setFormQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctAnswer: optVal };
      return copy;
    });
  };

  // ── Save Quiz ──
  const handleSaveQuiz = async (e?: React.FormEvent, overrideStatus?: QuizStatus) => {
    if (e) e.preventDefault();
    setFormSubmitting(true);
    setQuizFormError(null);

    if (!qTitle.trim()) {
      setQuizFormError('Quiz Title is required.');
      setFormSubmitting(false);
      return;
    }

    const finalStatus = overrideStatus || qStatus;
    const cleanQuestions = formQuestions.filter((q) => q.question.trim().length > 0);
    const totalMarks = cleanQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const payload = {
      churchId: 'rhema',
      title: qTitle.trim(),
      topic: qTopic.trim(),
      category: qCategory,
      difficulty: qDifficulty,
      language: qLanguage,
      bibleVersion: qBibleVersion,
      book: qBook.trim(),
      description: qDescription.trim(),
      timeLimitMinutes: Number(qTimeLimit) || 0,
      passPercentage: Number(qPassPercentage) || 70,
      status: finalStatus,
      scheduledDate: finalStatus === 'scheduled' ? qScheduledDate : '',
      scheduledTime: finalStatus === 'scheduled' ? qScheduledTime : '',
      totalQuestions: cleanQuestions.length,
      totalMarks: totalMarks,
      marksPerQuestion: 1,
      questions: cleanQuestions,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingQuizId) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', editingQuizId), payload);
        try {
          await updateDoc(doc(db, 'bibleQuizzes', editingQuizId), payload);
        } catch {}
        setToast(`Updated quiz "${qTitle.trim()}".`);
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
        setSelectedQuizId(newDoc.id);
        setToast(`Created new quiz "${qTitle.trim()}".`);
      }

      setQuizModalOpen(false);
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      setQuizFormError(err.message || 'Failed to save quiz.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Delete Quiz ──
  const handleConfirmDeleteQuiz = async () => {
    if (!deleteQuizTarget) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', deleteQuizTarget.id));
      try {
        await deleteDoc(doc(db, 'bibleQuizzes', deleteQuizTarget.id));
      } catch {}
      setToast(`Deleted quiz "${deleteQuizTarget.title}".`);
      setDeleteQuizTarget(null);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setToast('Failed to delete quiz.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Delete Attempt ──
  const handleConfirmDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeletingAttempt(true);
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'quizAttempts', attemptToDelete.id));
      setToast(`Deleted quiz attempt for ${attemptToDelete.participant || 'member'}.`);
      setAttemptToDelete(null);
      if (inspectAttempt?.id === attemptToDelete.id) {
        setInspectAttempt(null);
      }
    } catch (err) {
      console.error('Error deleting attempt:', err);
      setToast('Failed to delete attempt.');
    } finally {
      setIsDeletingAttempt(false);
    }
  };

  // ── Focused Question Editor (Right Pane) ──
  const openAddQuestionModal = () => {
    setEditingQuestionId(null);
    setQFormError(null);
    setQuestType('single_choice');
    setQuestText('');
    setQuestTextTe('');
    setQuestOptions(['', '', '', '']);
    setQuestOptionsTe(['', '', '', '']);
    setQuestCorrectAnswer('');
    setQuestBibleRef('');
    setQuestExplanation('');
    setQuestExplanationTe('');
    setQuestMarks(1);
    setQuestionModalOpen(true);
  };

  const openEditQuestionModal = (q: QuizQuestion) => {
    setEditingQuestionId(q.id);
    setQFormError(null);
    setQuestType(q.questionType || 'single_choice');
    setQuestText(q.question || '');
    setQuestTextTe(q.questionTelugu || '');

    const opts = Array.isArray(q.options) ? q.options : [];
    const optsTe = Array.isArray(q.optionsTelugu) ? q.optionsTelugu : [];
    setQuestOptions(
      q.questionType === 'true_false'
        ? ['True', 'False']
        : opts.length >= 4
        ? opts
        : [...opts, '', '', ''].slice(0, 4)
    );
    setQuestOptionsTe(
      optsTe.length >= 4
        ? optsTe
        : [...optsTe, '', '', ''].slice(0, 4)
    );
    setQuestCorrectAnswer(q.correctAnswer || '');
    setQuestBibleRef(q.bibleReference || '');
    setQuestExplanation(q.explanation || '');
    setQuestExplanationTe(q.explanationTelugu || '');
    setQuestMarks(q.marks || 1);
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setQFormError(null);

    if (!questText.trim()) {
      setQFormError('Question text is required.');
      return;
    }

    const cleanOptions =
      questType === 'true_false'
        ? ['True', 'False']
        : questOptions.map((o) => o.trim()).filter((o) => o.length > 0);

    if (cleanOptions.length < 2) {
      setQFormError('Please enter at least 2 answer choices.');
      return;
    }

    if (!questCorrectAnswer || !cleanOptions.includes(questCorrectAnswer)) {
      setQFormError('Please mark which option is the correct answer.');
      return;
    }

    const currentQuestions: QuizQuestion[] = Array.isArray(activeQuiz.questions)
      ? [...activeQuiz.questions]
      : [];

    let updatedQuestions: QuizQuestion[];
    if (editingQuestionId) {
      updatedQuestions = currentQuestions.map((q) => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            questionType: questType,
            question: questText.trim(),
            questionTelugu: questTextTe.trim() || undefined,
            options: cleanOptions,
            optionsTelugu: questOptionsTe.filter((o) => o.trim().length > 0),
            correctAnswer: questCorrectAnswer,
            bibleReference: questBibleRef.trim(),
            explanation: questExplanation.trim(),
            explanationTelugu: questExplanationTe.trim() || undefined,
            marks: questMarks || 1,
          };
        }
        return q;
      });
    } else {
      const newQuestion: QuizQuestion = {
        id: 'q_' + Date.now(),
        order: currentQuestions.length + 1,
        questionType: questType,
        question: questText.trim(),
        questionTelugu: questTextTe.trim() || undefined,
        options: cleanOptions,
        optionsTelugu: questOptionsTe.filter((o) => o.trim().length > 0),
        correctAnswer: questCorrectAnswer,
        bibleReference: questBibleRef.trim(),
        explanation: questExplanation.trim(),
        explanationTelugu: questExplanationTe.trim() || undefined,
        marks: questMarks || 1,
      };
      updatedQuestions = [...currentQuestions, newQuestion];
    }

    const totalMarks = updatedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
        totalMarks: totalMarks,
        updatedAt: serverTimestamp(),
      });
      setQuestionModalOpen(false);
      setToast(editingQuestionId ? 'Question updated.' : 'Added question to quiz.');
    } catch (err: any) {
      console.error('Error saving question:', err);
      setQFormError('Failed to save question to Firestore.');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!activeQuiz) return;
    const nextQuestions = (activeQuiz.questions || []).filter((q) => q.id !== qId);
    const totalMarks = nextQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: nextQuestions,
        totalQuestions: nextQuestions.length,
        totalMarks: totalMarks,
        updatedAt: serverTimestamp(),
      });
      setToast('Question removed.');
    } catch (err) {
      console.error('Error removing question:', err);
      setToast('Failed to remove question.');
    }
  };

  // ── Delimited Text Parser ──
  const handleParseText = () => {
    setParserError(null);
    if (!rawParserText.trim()) {
      setParserError('Please paste delimited question lines.');
      return;
    }

    const lines = rawParserText.split('\n').filter((l) => l.trim().length > 0);
    const generated: QuizQuestion[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) return;

      const qText = parts[0];
      const optA = parts[1] || '';
      const optB = parts[2] || '';
      const optC = parts[3] || '';
      const optD = parts[4] || '';
      const correct = parts[5] || optA;
      const ref = parts[6] || '';
      const expl = parts[7] || '';

      const opts = [optA, optB, optC, optD].filter((o) => o.length > 0);

      generated.push({
        id: `gen_${Date.now()}_${idx}`,
        order: idx + 1,
        questionType: opts.length === 2 && (opts[0] === 'True' || opts[0] === 'False') ? 'true_false' : 'single_choice',
        question: qText,
        options: opts.length >= 2 ? opts : ['Choice A', 'Choice B'],
        correctAnswer: correct,
        bibleReference: ref,
        explanation: expl,
        marks: 1,
      });
    });

    if (generated.length === 0) {
      setParserError('No questions could be parsed. Check line pipe delimiter format.');
      return;
    }

    setParsedQuestions(generated);
    setToast(`Parsed ${generated.length} questions.`);
  };

  const handleApplyParsedToActiveQuiz = async () => {
    if (!activeQuiz) {
      setParserError('No quiz selected in studio to append questions to.');
      return;
    }

    const existing = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    const combined = [...existing, ...parsedQuestions];
    const totalMarks = combined.reduce((sum, q) => sum + (q.marks || 1), 0);

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: combined,
        totalQuestions: combined.length,
        totalMarks: totalMarks,
        updatedAt: serverTimestamp(),
      });
      setToast(`Appended ${parsedQuestions.length} questions to "${activeQuiz.title}".`);
      setParsedQuestions([]);
      setActiveTab('studio');
    } catch (err) {
      console.error('Error appending parsed questions:', err);
      setParserError('Failed to append questions to Firestore.');
    }
  };

  // ── Member Preview Test Play ──
  const openPreview = (quiz: BibleQuiz) => {
    setPreviewQuiz(quiz);
    setPreviewAnswers({});
    setPreviewShowAnswers(false);
    setPreviewSubmitted(false);
  };

  const submitPreviewTest = async () => {
    if (!previewQuiz) return;
    setPreviewSubmitted(true);
    setPreviewShowAnswers(true);

    let correctCount = 0;
    (previewQuiz.questions || []).forEach((q) => {
      if (previewAnswers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const total = previewQuiz.questions?.length || 1;
    const scorePct = Math.round((correctCount / total) * 100);

    try {
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'quizAttempts'), {
        quizId: previewQuiz.id,
        quizTitle: previewQuiz.title,
        memberName: 'Admin Preview Session',
        memberPhone: 'Admin',
        score: correctCount,
        totalMarks: total,
        percentage: scorePct,
        passed: scorePct >= (previewQuiz.passPercentage || 70),
        timeTakenSeconds: 90,
        duration: '01:30',
        submittedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    } catch (err) {
      console.error('Error logging preview attempt:', err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
          {/* Toast Notification */}
          {toast && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg animate-in fade-in">
              <span>{toast}</span>
              <button onClick={() => setToast(null)} className="p-1 hover:opacity-75">
                <X size={14} />
              </button>
            </div>
          )}

          {/* 1. TOP HEADER & SUMMARY METRICS CARDS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Admin Bible Quiz Studio
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate Scripture challenges, manage question banks, schedule auto-releases, and inspect congregation reports
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateQuizModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>New Bible Quiz</span>
              </button>
            </div>
          </div>

          {/* 4 Interactive KPI Cards matching Mobile AdminQuizList */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: All Quizzes */}
            <div
              onClick={() => {
                setStatusFilter('All');
                setActiveTab('studio');
              }}
              className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm cursor-pointer transition-all flex flex-col justify-between h-32 ${
                statusFilter === 'All' && activeTab === 'studio'
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-blue-500" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                  {stats.total}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  ALL QUIZZES
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Catalog library</span>
              </div>
            </div>

            {/* Card 2: Published */}
            <div
              onClick={() => {
                setStatusFilter('Published');
                setActiveTab('studio');
              }}
              className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm cursor-pointer transition-all flex flex-col justify-between h-32 ${
                statusFilter === 'Published' && activeTab === 'studio'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-emerald-500" />
              <div>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block tracking-tight">
                  {stats.published}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  PUBLISHED LIVE
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Active for members</span>
              </div>
            </div>

            {/* Card 3: Scheduled */}
            <div
              onClick={() => {
                setStatusFilter('Scheduled');
                setActiveTab('studio');
              }}
              className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm cursor-pointer transition-all flex flex-col justify-between h-32 ${
                statusFilter === 'Scheduled' && activeTab === 'studio'
                  ? 'border-purple-500 ring-2 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-purple-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-purple-500" />
              <div>
                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 block tracking-tight">
                  {stats.scheduled}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  SCHEDULED
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Upcoming releases</span>
              </div>
            </div>

            {/* Card 4: Reports / Attempts */}
            <div
              onClick={() => {
                setStatusFilter('Reports');
                setActiveTab('reports');
              }}
              className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm cursor-pointer transition-all flex flex-col justify-between h-32 ${
                statusFilter === 'Reports' || activeTab === 'reports'
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-amber-500" />
              <div>
                <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 block tracking-tight">
                  {stats.totalAttempts}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  TOTAL ATTEMPTS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Avg Score {stats.avgScore}%</span>
              </div>
            </div>
          </div>

          {/* 2. MAIN NAVIGATION TABS */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('studio');
                if (statusFilter === 'Reports') setStatusFilter('All');
              }}
              className={`pb-2 px-3 border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === 'studio' && statusFilter !== 'Reports'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen size={15} />
              <span>Quiz &amp; Question Bank ({quizzes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('parser')}
              className={`pb-2 px-3 border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === 'parser'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload size={15} />
              <span>Document &amp; Text Importer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('reports');
                setStatusFilter('Reports');
              }}
              className={`pb-2 px-3 border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === 'reports' || statusFilter === 'Reports'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
              <span>Quiz Analytics &amp; Reports ({attempts.length})</span>
            </button>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: STUDIO & QUESTION BANK */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'studio' && statusFilter !== 'Reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Quiz Directory */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search & Filter Badges (Exact Mobile Parity) */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title, book, category..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                    />
                  </div>

                  {/* Filter Badges with Counts (All Quizzes, Published, Scheduled, Drafts, Reports) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { key: 'All', label: 'All Quizzes', count: stats.total },
                      { key: 'Published', label: 'Published', count: stats.published },
                      { key: 'Scheduled', label: 'Scheduled', count: stats.scheduled },
                      { key: 'Drafts', label: 'Drafts', count: stats.drafts },
                      { key: 'Reports', label: 'Reports', count: attempts.length },
                    ].map((item) => {
                      const isSel = statusFilter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setStatusFilter(item.key);
                            if (item.key === 'Reports') {
                              setActiveTab('reports');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isSel
                                ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quizzes List Cards */}
                <div className="space-y-3">
                  {loading && quizzes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-emerald-500" />
                      <span>Loading quizzes from Firestore...</span>
                    </div>
                  ) : filteredQuizzes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
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
                        onClick={openCreateQuizModal}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        + Create a quiz now
                      </button>
                    </div>
                  ) : (
                    filteredQuizzes.map((quiz) => {
                      const isSelected = activeQuiz?.id === quiz.id;

                      return (
                        <div
                          key={quiz.id}
                          onClick={() => setSelectedQuizId(quiz.id)}
                          className={`cursor-pointer p-4 rounded-2xl border transition-all space-y-3 ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                          }`}
                        >
                          {/* Top Row: Badges on Left & Edit/Delete on Right (Exact Mobile Alignment) */}
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  quiz.status === 'published'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : quiz.status === 'scheduled'
                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {quiz.status === 'scheduled' && quiz.scheduledDate
                                  ? `📅 ${quiz.scheduledDate}${quiz.scheduledTime ? ` · ⏰ ${formatQuizTime(quiz.scheduledTime)}` : ''}`
                                  : quiz.status.toUpperCase()}
                              </span>

                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                                {quiz.difficulty}
                              </span>

                              <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold text-[10px] border border-slate-200 dark:border-slate-800">
                                {quiz.category}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openEditQuizModal(quiz)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Edit Quiz"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteQuizTarget(quiz)}
                                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Delete Quiz"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Main Content: Title & Meta Info */}
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                              {quiz.title}
                            </h3>
                            {quiz.topic && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                Topic: {quiz.topic}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {quiz.book ? (
                              <span>📖 {quiz.book}</span>
                            ) : (
                              <span>🏷️ {quiz.category || 'General'}</span>
                            )}
                            <span>·</span>
                            <span>{quiz.questions?.length || 0} Questions</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />{' '}
                              {quiz.timeLimitMinutes === 0 ? 'Untimed' : `${quiz.timeLimitMinutes}m`}
                            </span>
                          </div>

                          {/* Bottom Action Row: View, Report, Move to Draft / Publish (Exact Mobile Parity) */}
                          <div
                            className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openPreview(quiz)}
                              className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter('Reports');
                                setActiveTab('reports');
                                setReportQuizFilter(quiz.title);
                              }}
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                            >
                              <BarChart3 size={13} />
                              <span>Report</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePublish(quiz)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                quiz.status === 'published'
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              {quiz.status === 'published' ? (
                                <>
                                  <Pause size={13} />
                                  <span>Move to Draft</span>
                                </>
                              ) : (
                                <>
                                  <Send size={13} />
                                  <span>Publish</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Question Bank for Selected Quiz */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
                {activeQuiz ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                            {activeQuiz.title}
                          </h2>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                            {activeQuiz.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pass: {activeQuiz.passPercentage}% · Limit:{' '}
                          {activeQuiz.timeLimitMinutes === 0
                            ? 'No Limit (Untimed)'
                            : `${activeQuiz.timeLimitMinutes} mins`}
                          {activeQuiz.scheduledDate &&
                            ` · Scheduled for ${activeQuiz.scheduledDate} ${formatQuizTime(activeQuiz.scheduledTime)}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPreview(activeQuiz)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>Test Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={openAddQuestionModal}
                          className="px-3.5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Add Question</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Bank Items */}
                    {activeQuiz.questions?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                        <p className="font-semibold text-slate-600 dark:text-slate-400">
                          This quiz currently has zero questions.
                        </p>
                        <button
                          type="button"
                          onClick={openAddQuestionModal}
                          className="text-emerald-600 font-bold hover:underline"
                        >
                          + Add your first question now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(activeQuiz.questions || []).map((q, idx) => (
                          <div
                            key={q.id || idx}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Q{idx + 1} ({q.questionType === 'true_false' ? 'TRUE / FALSE' : 'MULTIPLE CHOICE'}) ·{' '}
                                {q.marks || 1} MARK
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditQuestionModal(q)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                  title="Edit Question"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 rounded-lg text-red-500 hover:text-red-700"
                                  title="Delete Question"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                              {q.question}
                            </p>
                            {q.questionTelugu && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                {q.questionTelugu}
                              </p>
                            )}

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-semibold">
                              {(q.options || []).map((opt, optIdx) => {
                                const isCorrect = q.correctAnswer === opt;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                    {isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reference and Explanation */}
                            {(q.bibleReference || q.explanation) && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                {q.bibleReference && (
                                  <span className="font-bold text-amber-600 flex items-center gap-1">
                                    <BookOpen size={12} /> {q.bibleReference}
                                  </span>
                                )}
                                {q.explanation && (
                                  <span className="italic truncate max-w-sm">{q.explanation}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-3 min-h-[360px]">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <BookOpen size={20} />
                    </div>
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
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
                      onClick={openCreateQuizModal}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create New Quiz</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: DOCUMENT & TEXT IMPORTER */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'parser' && statusFilter !== 'Reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Study Notes &amp; Delimited Question Importer
                  </h2>
                  <p className="text-slate-500 mt-1">
                    Format per line:{' '}
                    <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Question | OptA | OptB | OptC | OptD | CorrectAnswer | BibleRef | Explanation
                    </code>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700">
                    <FileText size={15} />
                    <span>Upload .TXT / .CSV File</span>
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setParserFileAttached(file.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setRawParserText(String(reader.result || ''));
                          setToast(`Loaded "${file.name}".`);
                        };
                        reader.readAsText(file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {parserFileAttached && (
                    <span className="text-xs text-emerald-600 font-bold">
                      Attached: {parserFileAttached}
                    </span>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={rawParserText}
                  onChange={(e) => setRawParserText(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />

                {parserError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-700 text-xs font-semibold">
                    {parserError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleParseText}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Parse Question Sheet</span>
                </button>
              </div>

              {/* Parsed Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Parsed Questions Preview ({parsedQuestions.length})
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Review extracted questions before appending to active quiz.
                  </p>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {parsedQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Click "Parse Question Sheet" to preview extracted questions.
                    </div>
                  ) : (
                    parsedQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Q{idx + 1} · {q.options.length} Choices
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white">{q.question}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold">
                          Correct: {q.correctAnswer}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  disabled={parsedQuestions.length === 0 || !activeQuiz}
                  onClick={handleApplyParsedToActiveQuiz}
                  className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Check size={14} />
                  <span>
                    Append to "{activeQuiz ? activeQuiz.title : 'Selected Quiz'}"
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: QUIZ ANALYTICS & REPORTS (FULL MOBILE PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {(activeTab === 'reports' || statusFilter === 'Reports') && (
            <div className="space-y-6">
              {/* Reports Header & KPI Metrics Card */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                      Quiz Results &amp; Congregation Leaderboard
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Member participation, scores, pass rates, and prize rankings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
                      <Users size={13} />
                      <span>{new Set(attempts.map((a) => a.participant || a.memberName)).size} Unique Members</span>
                    </span>
                  </div>
                </div>

                {/* 3 Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="text-center sm:text-left">
                    <span className="text-2xl font-black text-slate-900 dark:text-white block">
                      {attempts.length}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Total Attempts
                    </span>
                  </div>
                  <div className="text-center sm:text-left border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
                      {stats.avgScore}%
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Average Score
                    </span>
                  </div>
                  <div className="text-center sm:text-left border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-2xl font-black text-amber-500 block">
                      {filteredAndRankedAttempts[0] ? `${filteredAndRankedAttempts[0].percentage}%` : '0%'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Top Score
                    </span>
                  </div>
                </div>

                {/* Controls: Search, Sort Switcher & Quiz Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                  <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by member name, quiz title, phone..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>

                  {/* Sort Buttons (Rank vs Recent) */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">Sort by:</span>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setReportSort('rank')}
                        className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          reportSort === 'rank'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Clock size={13} />
                        <span>Recent</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quiz Filter Chips if multiple quizzes */}
                {attemptedQuizzes.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setReportQuizFilter('All')}
                      className={`px-3 py-1 rounded-full font-bold border whitespace-nowrap cursor-pointer ${
                        reportQuizFilter === 'All'
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      All Quizzes ({attempts.length})
                    </button>
                    {attemptedQuizzes.map((q) => {
                      const isSel = reportQuizFilter === q.id || reportQuizFilter === q.title;
                      const count = attempts.filter((a) => a.quizId === q.id || a.quizTitle === q.title).length;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setReportQuizFilter(q.title)}
                          className={`px-3 py-1 rounded-full font-bold border whitespace-nowrap cursor-pointer ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {q.title} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attempts Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Congregation Member Quiz Attempts ({filteredAndRankedAttempts.length})
                  </h3>
                  <span className="text-slate-400 font-medium">Real-time Firebase Sync</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Rank</th>
                        <th className="px-5 py-3.5">Member Name</th>
                        <th className="px-5 py-3.5">Quiz Title</th>
                        <th className="px-5 py-3.5">Score &amp; Marks</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Duration</th>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredAndRankedAttempts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                            No member quiz attempts found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAndRankedAttempts.map((att, idx) => (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5">
                              {reportSort === 'rank' ? (
                                idx === 0 ? (
                                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-amber-300">
                                    🥇
                                  </span>
                                ) : idx === 1 ? (
                                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center">
                                    🥈
                                  </span>
                                ) : idx === 2 ? (
                                  <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 font-black text-xs flex items-center justify-center">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-bold">#{idx + 1}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-bold">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                              {att.participant || att.memberName}
                              {att.memberPhone && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {att.memberPhone}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {att.quizTitle}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                {att.percentage}%
                              </span>{' '}
                              <span className="text-slate-400 text-[11px]">
                                ({att.score}/{att.totalMarks})
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.passed
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                }`}
                              >
                                {att.passed ? 'PASSED' : 'NEEDS STUDY'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {att.duration || (att.timeTakenSeconds ? `${att.timeTakenSeconds}s` : '—')}
                            </td>
                            <td className="px-5 py-3.5 text-slate-400">{att.date}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setAttemptToDelete(att)}
                                className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Delete Attempt"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 1: CREATE / EDIT BIBLE QUIZ FORM (EXACT MOBILE PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {quizModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
                {/* Header with Title and Preview Button */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                      {editingQuizId ? 'Edit Bible Quiz' : 'New Bible Quiz'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure title, schedule, questions &amp; study instructions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tempQuiz: BibleQuiz = {
                          id: editingQuizId || 'temp_preview',
                          churchId: 'rhema',
                          title: qTitle || 'Untitled Quiz Preview',
                          description: qDescription,
                          category: qCategory,
                          topic: qTopic,
                          difficulty: qDifficulty,
                          language: qLanguage,
                          timeLimitMinutes: qTimeLimit,
                          passPercentage: qPassPercentage,
                          status: qStatus,
                          scheduledDate: qScheduledDate,
                          scheduledTime: qScheduledTime,
                          totalQuestions: formQuestions.length,
                          totalMarks: formQuestions.reduce((s, q) => s + (q.marks || 1), 0),
                          marksPerQuestion: 1,
                          questions: formQuestions,
                          createdAt: null,
                          updatedAt: null,
                        };
                        openPreview(tempQuiz);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizModalOpen(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {quizFormError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{quizFormError}</span>
                  </div>
                )}

                <form onSubmit={(e) => handleSaveQuiz(e)} className="space-y-6 text-xs font-semibold">
                  {/* ── Section 1: Upload Document (Exact Mobile Parity) ── */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-black dark:bg-white text-white dark:text-black">
                        <FileText size={14} />
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                          Upload Document
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Auto-extracts study questions from PDF, Word, Excel, CSV, or TXT
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <Upload size={14} />
                        <span>Choose Document &amp; Generate</span>
                        <input
                          type="file"
                          accept=".txt,.csv,.doc,.docx,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const text = String(reader.result || '');
                              const lines = text.split('\n').filter((l) => l.trim().length > 0);
                              const parsed: QuizQuestion[] = [];
                              lines.forEach((line, idx) => {
                                const parts = line.split('|').map((p) => p.trim());
                                if (parts.length >= 3) {
                                  const opts = [parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || ''].filter(
                                    (o) => o.length > 0
                                  );
                                  parsed.push({
                                    id: `gen_${Date.now()}_${idx}`,
                                    order: idx + 1,
                                    questionType: opts.length === 2 && (opts[0] === 'True' || opts[0] === 'False') ? 'true_false' : 'single_choice',
                                    question: parts[0],
                                    options: opts.length >= 2 ? opts : ['Option A', 'Option B'],
                                    correctAnswer: parts[5] || opts[0],
                                    bibleReference: parts[6] || '',
                                    explanation: parts[7] || '',
                                    marks: 1,
                                  });
                                }
                              });
                              if (parsed.length > 0) {
                                setFormQuestions(parsed);
                                setToast(`Extracted ${parsed.length} questions from ${file.name}.`);
                              } else {
                                setToast(`Loaded ${file.name}.`);
                              }
                            };
                            reader.readAsText(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* ── Section 2: Schedule & Availability (Exact Mobile Parity) ── */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-black dark:bg-white text-white dark:text-black">
                        <CalendarIcon size={14} />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Schedule &amp; Availability
                      </span>
                    </div>

                    {/* Status Segment: Draft | Scheduled | Publish Live */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      {[
                        { key: 'draft', label: 'Save Draft' },
                        { key: 'scheduled', label: 'Scheduled' },
                        { key: 'published', label: 'Publish Live' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setQStatus(item.key as QuizStatus)}
                          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            qStatus === item.key
                              ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Scheduled Controls */}
                    {qStatus === 'scheduled' && (
                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                          <Clock size={15} />
                          <span>
                            Members will automatically unlock this quiz on{' '}
                            <strong>{qScheduledDate}</strong> at{' '}
                            <strong>{formatQuizTime(qScheduledTime)}</strong>.
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Release Date
                            </label>
                            <input
                              type="date"
                              value={qScheduledDate}
                              onChange={(e) => setQScheduledDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Release Time (24h)
                            </label>
                            <input
                              type="time"
                              value={qScheduledTime}
                              onChange={(e) => setQScheduledTime(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Quick Time Presets
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {SCHEDULE_TIME_PRESETS.map((p) => (
                              <button
                                key={p.time}
                                type="button"
                                onClick={() => setQScheduledTime(p.time)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  qScheduledTime === p.time
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Section 3: Quiz Information (Exact Mobile Parity) ── */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-black dark:bg-white text-white dark:text-black">
                        <BookOpen size={14} />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Quiz Information
                      </span>
                    </div>

                    {/* Quiz Title */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Quiz Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={qTitle}
                        onChange={(e) => setQTitle(e.target.value)}
                        placeholder="e.g. Sunday Fellowship Bible Challenge"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>

                    {/* Topic / Series (Optional) */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Topic / Series (Optional)
                      </label>
                      <input
                        type="text"
                        value={qTopic}
                        onChange={(e) => setQTopic(e.target.value)}
                        placeholder="e.g. Gospel of John, Life of David, Parables..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>

                    {/* Category & Difficulty */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                          Category
                        </label>
                        <select
                          value={qCategory}
                          onChange={(e) => setQCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                        >
                          {CANONICAL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                          Difficulty
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setQDifficulty(d)}
                              className={`py-2 rounded-xl text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                                qDifficulty === d
                                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Language Selector */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Language
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const isSel = qLanguage === lang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => setQLanguage(lang.code)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {lang.name} ({lang.native})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Limit & Passing Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                          Time Limit (Per Attempt)
                        </label>
                        <select
                          value={qTimeLimit}
                          onChange={(e) => setQTimeLimit(Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                        >
                          {TIME_LIMIT_PRESETS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                          Passing Score (%)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={qPassPercentage}
                          onChange={(e) => setQPassPercentage(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    {/* Description / Instructions */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Description / Study Instructions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={qDescription}
                        onChange={(e) => setQDescription(e.target.value)}
                        placeholder="e.g. Read John 1-5 prior to attempting this quiz challenge."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* ── Section 4: Quiz Questions Builder (Exact Mobile Parity) ── */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-black dark:bg-white text-white dark:text-black">
                          <HelpCircle size={14} />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                            Quiz Questions ({formQuestions.length})
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Click the circle (○) to mark the correct answer
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddInlineQuestion}
                        className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {/* List of Inline Questions */}
                    <div className="space-y-4">
                      {formQuestions.map((q, qIdx) => (
                        <div
                          key={q.id || qIdx}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="w-7 h-7 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-black flex items-center justify-center">
                              Q{qIdx + 1}
                            </span>

                            {/* Type Toggle: Multiple Choice vs True/False */}
                            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleUpdateInlineQuestion(qIdx, 'questionType', 'single_choice')}
                                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                  q.questionType === 'single_choice'
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                Multiple Choice
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateInlineQuestion(qIdx, 'questionType', 'true_false');
                                  handleUpdateInlineQuestion(qIdx, 'options', ['True', 'False']);
                                }}
                                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                  q.questionType === 'true_false'
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                True / False
                              </button>
                            </div>

                            {formQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveInlineQuestion(qIdx)}
                                className="p-1 rounded-lg text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Question Text */}
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => handleUpdateInlineQuestion(qIdx, 'question', e.target.value)}
                            placeholder="Type the question text here..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
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
                                      onClick={() => handleSetInlineCorrectAnswer(qIdx, optVal)}
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                        isCorrect
                                          ? 'border-emerald-600 bg-emerald-600 text-white'
                                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                                      }`}
                                    >
                                      {isCorrect && <Check size={12} strokeWidth={3} />}
                                    </button>
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                      <span className="font-bold text-slate-400 text-xs">
                                        {String.fromCharCode(65 + optIdx)}.
                                      </span>
                                      {q.questionType === 'true_false' ? (
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                          {optVal}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={optVal}
                                          onChange={(e) => {
                                            const copy = [...(q.options || [])];
                                            copy[optIdx] = e.target.value;
                                            handleUpdateInlineQuestion(qIdx, 'options', copy);
                                          }}
                                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                          className="flex-1 bg-transparent border-none outline-none text-xs font-semibold"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {/* Bible Reference & Explanation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <input
                              type="text"
                              value={q.bibleReference || ''}
                              onChange={(e) => handleUpdateInlineQuestion(qIdx, 'bibleReference', e.target.value)}
                              placeholder="Bible Reference (e.g. John 3:16)"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                            />
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleUpdateInlineQuestion(qIdx, 'explanation', e.target.value)}
                              placeholder="Scripture Explanation / Devotional Insight (optional)"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddInlineQuestion}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Another Question</span>
                    </button>
                  </div>

                  {/* ── Section 5: Footer Actions ── */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQuizModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => handleSaveQuiz(undefined, 'draft')}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Save as Draft</span>
                    </button>

                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {formSubmitting ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : qStatus === 'scheduled' ? (
                        <Clock size={14} />
                      ) : qStatus === 'draft' ? (
                        <Save size={14} />
                      ) : (
                        <Send size={14} />
                      )}
                      <span>
                        {qStatus === 'scheduled'
                          ? 'Schedule Quiz'
                          : qStatus === 'draft'
                          ? 'Save Draft'
                          : 'Publish Quiz Live'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 2: FOCUSED QUESTION EDITOR (FOR QUICK ADD/EDIT) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {questionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingQuestionId ? 'Edit Scripture Question' : 'Add New Scripture Question'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Target Quiz: {activeQuiz?.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                {qFormError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{qFormError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs font-semibold">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Question Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuestType('single_choice');
                          if (questOptions.length < 4) setQuestOptions(['', '', '', '']);
                        }}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          questType === 'single_choice'
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Multiple Choice (4 Choices)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestType('true_false');
                          setQuestOptions(['True', 'False']);
                        }}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          questType === 'true_false'
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        True / False (2 Choices)
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Question Text (English) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={questText}
                      onChange={(e) => setQuestText(e.target.value)}
                      placeholder="e.g. Who built the ark according to Genesis 6?"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Telugu Question Text */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Question Text (Telugu Translation, Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={questTextTe}
                      onChange={(e) => setQuestTextTe(e.target.value)}
                      placeholder="e.g. ఆదికాండము 6 ప్రకారం ఓడను ఎవరు నిర్మించారు?"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Answer Choices */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                        Answer Choices &amp; Correct Answer Selection
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Click circle (○) to mark correct answer
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(questType === 'true_false' ? ['True', 'False'] : questOptions).map(
                        (opt, idx) => {
                          const isCorrect = questCorrectAnswer === opt && opt.trim().length > 0;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setQuestCorrectAnswer(opt)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                  isCorrect
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                                }`}
                              >
                                {isCorrect && <Check size={12} strokeWidth={3} />}
                              </button>
                              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                <span className="font-bold text-slate-400 text-xs">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                {questType === 'true_false' ? (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {opt}
                                  </span>
                                ) : (
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const copy = [...questOptions];
                                      copy[idx] = e.target.value;
                                      setQuestOptions(copy);
                                    }}
                                    placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Scripture Reference & Marks */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Scripture Reference
                      </label>
                      <input
                        type="text"
                        value={questBibleRef}
                        onChange={(e) => setQuestBibleRef(e.target.value)}
                        placeholder="e.g. Genesis 6:14"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Marks Per Question
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={questMarks}
                        onChange={(e) => setQuestMarks(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                      />
                    </div>
                  </div>

                  {/* Scripture Explanation */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Scripture Explanation (English)
                    </label>
                    <textarea
                      rows={2}
                      value={questExplanation}
                      onChange={(e) => setQuestExplanation(e.target.value)}
                      placeholder="e.g. God gave Noah exact specifications for building the ark of gopher wood."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQuestionModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow flex items-center gap-2"
                    >
                      <Save size={14} />
                      <span>{editingQuestionId ? 'Update Question' : 'Save Question'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 3: TEST PREVIEW (MEMBER EXPERIENCE) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {previewQuiz && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                      Admin Test Play Preview
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                      {previewQuiz.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {previewQuiz.topic || previewQuiz.category} · {previewQuiz.difficulty.toUpperCase()} ·{' '}
                      {previewQuiz.questions?.length || 0} Questions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewQuiz(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {(previewQuiz.questions || []).map((q, qIdx) => {
                    const sel = previewAnswers[q.id];

                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Question {qIdx + 1} of {previewQuiz.questions.length}
                          </span>
                          {q.bibleReference && (
                            <span className="text-[11px] font-bold text-amber-600">
                              {q.bibleReference}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-sm text-slate-900 dark:text-white">{q.question}</p>

                        <div className="space-y-1.5 text-xs font-semibold">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = sel === opt;
                            const isCorrect = previewShowAnswers && q.correctAnswer === opt;
                            const isWrong = previewShowAnswers && isSelected && q.correctAnswer !== opt;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  if (!previewSubmitted) {
                                    setPreviewAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                  }
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white border-emerald-500 font-bold'
                                    : isWrong
                                    ? 'bg-red-500 text-white border-red-500'
                                    : isSelected
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <span>
                                  <strong className="mr-1">{String.fromCharCode(65 + optIdx)}.</strong>{' '}
                                  {opt}
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
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    {previewShowAnswers ? 'Hide Answers' : 'Reveal Answers & Scripture'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewQuiz(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                    >
                      Close Preview
                    </button>
                    {!previewSubmitted && (
                      <button
                        type="button"
                        onClick={submitPreviewTest}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow"
                      >
                        Submit Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 4: CONFIRM DELETE QUIZ */}
          {/* ───────────────────────────────────────────────────────────── */}
          {deleteQuizTarget && (
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
                    Are you sure you want to permanently delete "{deleteQuizTarget.title}"? This cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQuizTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDeleteQuiz}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 5: CONFIRM DELETE ATTEMPT */}
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
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAttempt}
                    onClick={handleConfirmDeleteAttempt}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
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
