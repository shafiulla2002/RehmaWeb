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
  title: string;
  topic?: string;
  category: string;
  difficulty: QuizDifficulty;
  language: string;
  bibleVersion?: string;
  book?: string;
  chapterStart?: number;
  chapterEnd?: number;
  description?: string;
  isDailyQuiz?: boolean;
  dailyDate?: string;
  timeLimitMinutes: number;
  passPercentage: number;
  status: QuizStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  sourceFile?: string;
  totalQuestions: number;
  totalMarks: number;
  marksPerQuestion: number;
  questions: QuizQuestion[];
  createdAt?: any;
  updatedAt?: any;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  participant: string;
  participantName?: string;
  memberPhone?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTakenSeconds?: number;
  duration?: string;
  date?: string;
  passed: boolean;
  answers?: any[];
  submittedAt?: any;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
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

const createBlankQuestion = (order: number, type: QuizQuestionType = 'single_choice'): QuizQuestion => ({
  id: `q_${Date.now()}_${order}`,
  order,
  questionType: type,
  question: '',
  questionTelugu: '',
  options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
  optionsTelugu: type === 'true_false' ? ['నిజం', 'అబద్ధం'] : ['', '', '', ''],
  correctAnswer: '',
  bibleReference: '',
  explanation: '',
  explanationTelugu: '',
  marks: 1,
});

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<BibleQuiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'parser' | 'reports'>('studio');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // ── Quiz Create / Edit Modal State (Full Mobile Parity) ──
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [quizFormError, setQuizFormError] = useState<string | null>(null);

  // Metadata form fields
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

  // ── Question Editor Modal State (Full Mobile Parity) ──
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

  // ── Document Parser & Auto-Extractor State ──
  const [rawParserText, setRawParserText] = useState(
    `Who built the ark according to Genesis 6?|Moses|Noah|Abraham|David|Noah|Genesis 6:14|God commanded Noah to build an ark of cypress wood.
In which city was Jesus born?|Nazareth|Bethlehem|Jerusalem|Capernaum|Bethlehem|Matthew 2:1|Jesus was born in Bethlehem in Judea during the reign of King Herod.`
  );
  const [parserFileAttached, setParserFileAttached] = useState<string>('');
  const [parserTargetLang, setParserTargetLang] = useState('en');
  const [parserError, setParserError] = useState<string | null>(null);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 1. Real-time Firestore sync on bibleQuizzes
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        setLoading(false);
        const list: BibleQuiz[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            churchId: d.churchId || 'rhema',
            title: d.title || 'Bible Quiz',
            topic: d.topic || '',
            category: d.category || 'General',
            difficulty: d.difficulty || 'medium',
            language: d.language || 'en',
            bibleVersion: d.bibleVersion || 'NIV',
            book: d.book || '',
            chapterStart: d.chapterStart || 0,
            chapterEnd: d.chapterEnd || 0,
            description: d.description || '',
            isDailyQuiz: Boolean(d.isDailyQuiz),
            dailyDate: d.dailyDate || '',
            timeLimitMinutes: Number(d.timeLimitMinutes) || 0,
            passPercentage: Number(d.passPercentage || d.passingScorePct) || 70,
            status: d.status || 'published',
            scheduledDate: d.scheduledDate || '',
            scheduledTime: d.scheduledTime || '',
            sourceFile: d.sourceFile || '',
            totalQuestions: Number(d.totalQuestions) || (Array.isArray(d.questions) ? d.questions.length : 0),
            totalMarks: Number(d.totalMarks) || 0,
            marksPerQuestion: Number(d.marksPerQuestion) || 1,
            questions: Array.isArray(d.questions) ? d.questions : [],
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        });

        list.sort((a, b) => a.title.localeCompare(b.title));
        setQuizzes(list);
        if (list.length > 0 && !selectedQuizId) {
          setSelectedQuizId(list[0].id);
        }
      },
      (err) => {
        console.warn('Firestore bibleQuizzes error:', err);
        setLoading(false);
      }
    );

    // 2. Real-time Firestore sync on quizAttempts (Live Reports)
    const attColRef = collection(db, 'Rhema Church', 'rhema', 'quizAttempts');
    const unsubAtt = onSnapshot(
      attColRef,
      (snap) => {
        const loadedAttempts: QuizAttempt[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          loadedAttempts.push({
            id: docSnap.id,
            quizId: d.quizId || '',
            quizTitle: d.quizTitle || d.quiz || 'Bible Quiz',
            participant: d.memberName || d.participant || d.participantName || 'Church Member',
            participantName: d.memberName || d.participantName || 'Church Member',
            memberPhone: d.memberPhone || '',
            score: Number(d.score) || 0,
            totalMarks: Number(d.totalMarks) || (d.totalQuestions ? d.totalQuestions : 10),
            percentage: Number(d.percentage || d.scorePct) || 0,
            timeTakenSeconds: d.timeTakenSeconds || 0,
            duration: d.duration || '03:15',
            date: d.date || (d.submittedAt ? new Date(d.submittedAt.seconds ? d.submittedAt.seconds * 1000 : d.submittedAt).toLocaleDateString() : 'Today'),
            passed: Boolean(d.passed ?? (Number(d.percentage || d.scorePct) >= 70)),
            answers: Array.isArray(d.answers) ? d.answers : [],
            submittedAt: d.submittedAt,
          });
        });
        setAttempts(loadedAttempts);
      },
      (err) => {
        console.warn('Firestore quizAttempts error:', err);
      }
    );

    return () => {
      unsub();
      unsubAtt();
    };
  }, []);

  const activeQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedQuizId) || quizzes[0] || null;
  }, [quizzes, selectedQuizId]);

  // Summary Metrics matching Mobile AdminQuizList
  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.status === 'published').length;
    const scheduled = quizzes.filter((q) => q.status === 'scheduled').length;
    const drafts = quizzes.filter((q) => q.status === 'draft').length;
    const daily = quizzes.filter((q) => q.isDailyQuiz).length;
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
      : 82;
    return { total, published, scheduled, drafts, daily, totalAttempts, avgScore };
  }, [quizzes, attempts]);

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
      if (q) {
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

  // ── Open Create Quiz Modal ──
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
    setQuizModalOpen(true);
  };

  // ── Open Edit Quiz Modal ──
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
    setQuizModalOpen(true);
  };

  // ── Save Quiz Metadata ──
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim()) {
      setQuizFormError('Quiz Title is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setQuizFormError(null);

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
        status: qStatus,
        scheduledDate: qStatus === 'scheduled' ? qScheduledDate : '',
        scheduledTime: qStatus === 'scheduled' ? qScheduledTime : '',
        updatedAt: serverTimestamp(),
      };

      if (editingQuizId) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', editingQuizId), payload);
        try {
          await updateDoc(doc(db, 'bibleQuizzes', editingQuizId), payload);
        } catch {}
        setToast(`Updated quiz "${qTitle.trim()}" successfully.`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'bibleQuizzes');
        const newDoc = await addDoc(colRef, {
          ...payload,
          isDailyQuiz: false,
          totalQuestions: 0,
          totalMarks: 0,
          marksPerQuestion: 1,
          questions: [],
          createdAt: serverTimestamp(),
        });
        try {
          await setDoc(doc(db, 'bibleQuizzes', newDoc.id), {
            ...payload,
            id: newDoc.id,
            isDailyQuiz: false,
            totalQuestions: 0,
            totalMarks: 0,
            marksPerQuestion: 1,
            questions: [],
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

  // ── Open Create Question Modal ──
  const openCreateQuestionModal = () => {
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

  // ── Open Edit Question Modal ──
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

  // ── Save Question to Active Quiz ──
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setQFormError(null);

    if (!questText.trim()) {
      setQFormError('Question text is required.');
      return;
    }

    const validOptions = questOptions.filter((opt) => opt.trim().length > 0);
    if (questType === 'single_choice' && validOptions.length < 2) {
      setQFormError('At least 2 choices are required for multiple choice questions.');
      return;
    }

    if (!questCorrectAnswer.trim()) {
      setQFormError('Please select the correct answer by clicking its radio circle.');
      return;
    }

    const currentQuestions = activeQuiz.questions || [];
    const newRecord: QuizQuestion = {
      id: editingQuestionId || `q_${Date.now()}_${currentQuestions.length + 1}`,
      order: editingQuestionId
        ? (currentQuestions.find((qq) => qq.id === editingQuestionId)?.order || 1)
        : currentQuestions.length + 1,
      questionType: questType,
      question: questText.trim(),
      questionTelugu: questTextTe.trim(),
      options: questType === 'true_false' ? ['True', 'False'] : questOptions.map((o) => o.trim()),
      optionsTelugu: questOptionsTe.map((o) => o.trim()),
      correctAnswer: questCorrectAnswer.trim(),
      bibleReference: questBibleRef.trim(),
      explanation: questExplanation.trim(),
      explanationTelugu: questExplanationTe.trim(),
      marks: Number(questMarks) || 1,
    };

    const nextQuestions = editingQuestionId
      ? currentQuestions.map((qq) => (qq.id === editingQuestionId ? newRecord : qq))
      : [...currentQuestions, newRecord];

    const totalMarks = nextQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: nextQuestions,
        totalQuestions: nextQuestions.length,
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

  // ── Delete Question ──
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

  // ── Import Questions from Text / File ──
  const handleImportQuestions = async () => {
    if (!activeQuiz) return;
    setParserError(null);

    const lines = rawParserText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setParserError('Please paste question data or attach a file.');
      return;
    }

    const imported: QuizQuestion[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 6) {
        const [q, a, b, c, d, correct, ref, exp] = parts;
        imported.push({
          id: `imp_${Date.now()}_${idx}`,
          order: (activeQuiz.questions?.length || 0) + idx + 1,
          questionType: 'single_choice',
          question: q,
          options: [a, b, c, d],
          correctAnswer: correct,
          bibleReference: ref || '',
          explanation: exp || '',
          marks: 1,
        });
      }
    });

    if (imported.length === 0) {
      setParserError('No questions could be parsed. Expected format: Question | OptA | OptB | OptC | OptD | CorrectAnswer | Reference | Explanation');
      return;
    }

    const merged = [...(activeQuiz.questions || []), ...imported];
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'bibleQuizzes', activeQuiz.id), {
        questions: merged,
        totalQuestions: merged.length,
        totalMarks: merged.reduce((acc, q) => acc + (q.marks || 1), 0),
        updatedAt: serverTimestamp(),
      });
      setToast(`Imported ${imported.length} questions into "${activeQuiz.title}".`);
      setActiveTab('studio');
    } catch (err: any) {
      setParserError('Failed to save imported questions.');
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
    } catch {}
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24">
          {/* Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white border border-emerald-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold">{toast}</span>
            </div>
          )}

          {/* TOP APP HEADER BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <HelpCircle size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
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
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Plus size={16} />
                <span>+ New Bible Quiz</span>
              </button>
            </div>
          </div>

          {/* 1. TOP SUMMARY CARDS (Full Mobile Parity) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Card 1: Total Quizzes */}
            <div
              onClick={() => {
                setStatusFilter('All');
                setActiveTab('studio');
              }}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-blue-400/50 flex flex-col justify-between h-32"
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
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-emerald-400/50 flex flex-col justify-between h-32"
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
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-purple-400/50 flex flex-col justify-between h-32"
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
              onClick={() => setActiveTab('reports')}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-amber-400/50 flex flex-col justify-between h-32"
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
              onClick={() => setActiveTab('studio')}
              className={`pb-2 px-3 border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === 'studio'
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
              onClick={() => setActiveTab('reports')}
              className={`pb-2 px-3 border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === 'reports'
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
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Quiz Directory */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search & Category Filter */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title, topic, or book..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                    />
                  </div>

                  {/* Filter Badges with Counts (Exact Mobile Parity) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { key: 'All', label: 'All', count: stats.total },
                      { key: 'Published', label: 'Published', count: stats.published },
                      { key: 'Scheduled', label: 'Scheduled', count: stats.scheduled },
                      { key: 'Drafts', label: 'Drafts', count: stats.drafts },
                    ].map((item) => {
                      const isSel = statusFilter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setStatusFilter(item.key)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSel ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
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
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No quizzes match your filter criteria.
                    </div>
                  ) : (
                    filteredQuizzes.map((quiz) => {
                      const isSelected = activeQuiz?.id === quiz.id;

                      return (
                        <div
                          key={quiz.id}
                          onClick={() => setSelectedQuizId(quiz.id)}
                          className={`cursor-pointer p-4 rounded-2xl border transition-all space-y-2.5 ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                                {quiz.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px]">
                                {quiz.difficulty}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                quiz.status === 'published'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : quiz.status === 'scheduled'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {quiz.status}
                            </span>
                          </div>

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

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="flex items-center gap-1.5">
                              <BookOpen size={12} />
                              <span>{quiz.questions?.length || 0} Questions</span>
                              <span>·</span>
                              <Clock size={12} />
                              <span>{quiz.timeLimitMinutes === 0 ? 'Untimed' : `${quiz.timeLimitMinutes}m`}</span>
                            </span>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openEditQuizModal(quiz)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                                title="Edit Quiz Settings"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteQuizTarget(quiz)}
                                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50"
                                title="Delete Quiz"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
                          {activeQuiz.timeLimitMinutes === 0 ? 'No Limit (Untimed)' : `${activeQuiz.timeLimitMinutes} mins`}
                          {activeQuiz.scheduledDate && ` · Scheduled for ${activeQuiz.scheduledDate} ${activeQuiz.scheduledTime}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPreview(activeQuiz)}
                          className="px-3.5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <Play size={13} className="text-amber-400 dark:text-amber-600" />
                          <span>Test Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={openCreateQuestionModal}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <Plus size={14} />
                          <span>Add Question</span>
                        </button>
                      </div>
                    </div>

                    {/* Question List */}
                    {activeQuiz.questions?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                        <HelpCircle size={28} className="mx-auto text-slate-400" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          No questions in this quiz yet
                        </p>
                        <p>Click &ldquo;+ Add Question&rdquo; above or use the Document Importer tab.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(activeQuiz.questions || []).map((q, idx) => (
                          <div
                            key={q.id || idx}
                            className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 mr-2">
                                  Q{idx + 1} ({q.questionType === 'true_false' ? 'True/False' : 'Multiple Choice'}) · {q.marks || 1} Mark
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                                  {q.question}
                                </h4>
                                {q.questionTelugu && (
                                  <p className="text-xs text-amber-700 dark:text-amber-400 font-serif mt-0.5">
                                    {q.questionTelugu}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditQuestionModal(q)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600"
                                  title="Edit Question"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                  title="Delete Question"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = q.correctAnswer === opt;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="truncate">
                                      <span className="font-extrabold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                                      {opt}
                                    </span>
                                    {isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reference & Explanation Footer */}
                            {(q.bibleReference || q.explanation) && (
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
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
                  <div className="p-12 text-center text-xs text-slate-400">
                    Select a quiz from the list to view its questions.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: DOCUMENT & TEXT IMPORTER */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'parser' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Study Notes &amp; Delimited Question Importer
                  </h2>
                  <p className="text-slate-500 mt-1">
                    Format per line: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Question | OptA | OptB | OptC | OptD | CorrectAnswer | BibleRef | Explanation</code>
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
                  disabled={!activeQuiz}
                  onClick={handleImportQuestions}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40 shadow transition-all"
                >
                  Parse &amp; Import into &ldquo;{activeQuiz?.title || 'Selected Quiz'}&rdquo;
                </button>
              </div>

              {/* Instructions & Template Helper */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Importer Guidelines &amp; Multi-Language Support
                  </h3>
                  <p className="text-slate-500 mt-1">
                    You can import questions written in English, Telugu, Hindi, and other regional scripts.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Telugu Sample Format:
                    </span>
                    <p className="font-mono text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed whitespace-pre-wrap">
                      నోవహు ఓడను ఏ చెక్కతో చేసెను?|తుమ్మ కఱ్ఱ|గోఫెరు చెక్క|దేవదారు చెక్క|సిందూర చెక్క|గోఫెరు చెక్క|ఆదికాండము 6:14|దేవుడు నోవహుతో గోఫెరు కఱ్ఱతో ఓడను చేసికోమని సెలవిచ్చెను.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Direct AI Generation via Cloud Functions:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Quizzes generated through the mobile app using AI or church study PDFs automatically sync straight into this dashboard via Firebase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: QUIZ ANALYTICS & REPORTS (REAL FIREBASE DATA) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 shadow-sm">
                  <span className="text-slate-500 font-semibold">Total Congregation Attempts</span>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {attempts.length}
                  </div>
                  <span className="text-[11px] text-slate-400">Logged in Firestore</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 shadow-sm">
                  <span className="text-slate-500 font-semibold">Average Passing Score</span>
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                    {stats.avgScore}%
                  </div>
                  <span className="text-[11px] text-slate-400">70% passing threshold</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 shadow-sm">
                  <span className="text-slate-500 font-semibold">Pass Rate Percentage</span>
                  <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
                    {attempts.length > 0
                      ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
                      : 100}
                    %
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {attempts.filter((a) => a.passed).length} of {attempts.length} passed
                  </span>
                </div>
              </div>

              {/* Attempts Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Congregation Member Quiz Attempts
                  </h3>
                  <span className="text-slate-400 font-medium">Real-time Firebase Sync</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Member Name</th>
                        <th className="px-5 py-3">Quiz Title</th>
                        <th className="px-5 py-3">Score &amp; Marks</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {attempts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                            No member quiz attempts logged yet.
                          </td>
                        </tr>
                      ) : (
                        attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                              {att.participant}
                              {att.memberPhone && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {att.memberPhone}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                              {att.quizTitle}
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {att.percentage}%
                              </span>{' '}
                              <span className="text-slate-400 text-[11px]">
                                ({att.score}/{att.totalMarks})
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.passed
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                }`}
                              >
                                {att.passed ? 'PASSED' : 'NEEDS STUDY'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400">{att.date}</td>
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
          {/* MODAL 1: CREATE / EDIT QUIZ METADATA (FULL MOBILE PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {quizModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingQuizId ? 'Edit Bible Quiz Settings' : 'Create New Bible Quiz'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configure title, category, difficulty, scheduling &amp; availability
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuizModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                {quizFormError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{quizFormError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs font-semibold">
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Category
                      </label>
                      <select
                        value={qCategory}
                        onChange={(e) => setQCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
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
                            className={`py-2 rounded-xl text-[11px] font-bold uppercase border transition-all ${
                              qDifficulty === d
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isSel
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {lang.name} ({lang.native})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule & Availability Section (Matching Mobile AdminQuizEditor exactly) */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Schedule &amp; Availability
                    </span>

                    {/* Status Toggle: Draft | Scheduled | Published */}
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
                          className={`py-2 rounded-lg text-xs font-bold transition-all ${
                            qStatus === item.key
                              ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Scheduled Date and Time controls */}
                    {qStatus === 'scheduled' && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="flex flex-wrap gap-1">
                          {SCHEDULE_TIME_PRESETS.map((p) => (
                            <button
                              key={p.time}
                              type="button"
                              onClick={() => setQScheduledTime(p.time)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                qScheduledTime === p.time
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time Limit & Passing Score */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Time Limit
                      </label>
                      <select
                        value={qTimeLimit}
                        onChange={(e) => setQTimeLimit(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
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
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQuizModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow disabled:opacity-50 flex items-center gap-2"
                    >
                      {formSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>{editingQuizId ? 'Save Changes' : 'Create Quiz'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 2: ADD / EDIT QUESTION (FULL MOBILE PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {questionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingQuestionId ? 'Edit Quiz Question' : 'Add Question'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tap the circle (○) next to any choice to mark it as the correct answer
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
                  {/* Question Type Toggle: Multiple Choice vs True/False */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">TYPE:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuestType('single_choice');
                        if (questOptions.length < 4) {
                          setQuestOptions(['', '', '', '']);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        questType === 'single_choice'
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Multiple Choice (4 Choices)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuestType('true_false');
                        setQuestOptions(['True', 'False']);
                        if (questCorrectAnswer !== 'True' && questCorrectAnswer !== 'False') {
                          setQuestCorrectAnswer('True');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        questType === 'true_false'
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      True / False
                    </button>
                  </div>

                  {/* Question Text (English) */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Question Text (English) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={questText}
                      onChange={(e) => setQuestText(e.target.value)}
                      placeholder="Type the question text here..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {/* Question Text (Telugu, Optional) */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Question Text (Telugu, Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={questTextTe}
                      onChange={(e) => setQuestTextTe(e.target.value)}
                      placeholder="ప్రశ్నను తెలుగులో ఇక్కడ టైప్ చేయండి (ఐచ్ఛికం)..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-serif font-medium"
                    />
                  </div>

                  {/* Answer Choices with Radio Select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                        Answer Choices &amp; Correct Answer Selection
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {questCorrectAnswer ? `Selected: "${questCorrectAnswer}"` : 'Select correct answer ○'}
                      </span>
                    </div>

                    {questType === 'true_false' ? (
                      <div className="grid grid-cols-2 gap-3">
                        {['True', 'False'].map((tf) => {
                          const isCorrect = questCorrectAnswer === tf;
                          return (
                            <div
                              key={tf}
                              onClick={() => setQuestCorrectAnswer(tf)}
                              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{tf}</span>
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                                }`}
                              >
                                {isCorrect && <Check size={10} strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {questOptions.map((opt, oIdx) => {
                          const isCorrect = questCorrectAnswer === opt && opt.trim().length > 0;
                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              {/* Clickable Radio Circle */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (opt.trim()) setQuestCorrectAnswer(opt.trim());
                                }}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                  isCorrect
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'
                                }`}
                                title="Mark as correct answer"
                              >
                                {isCorrect ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] text-slate-400 font-bold">{String.fromCharCode(65 + oIdx)}</span>}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...questOptions];
                                  updated[oIdx] = val;
                                  setQuestOptions(updated);
                                  if (questCorrectAnswer === opt) {
                                    setQuestCorrectAnswer(val);
                                  }
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-medium ${
                                  isCorrect
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 font-bold'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bible Reference */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Bible Reference (e.g. Genesis 6:14, John 3:16)
                    </label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                      <BookOpen size={15} className="text-amber-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={questBibleRef}
                        onChange={(e) => setQuestBibleRef(e.target.value)}
                        placeholder="e.g. Matthew 2:1"
                        className="flex-1 bg-transparent text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Explanation (English & Telugu) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Explanation / Devotional Insight (English)
                      </label>
                      <textarea
                        rows={2}
                        value={questExplanation}
                        onChange={(e) => setQuestExplanation(e.target.value)}
                        placeholder="Biblical explanation..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                        Explanation (Telugu, Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={questExplanationTe}
                        onChange={(e) => setQuestExplanationTe(e.target.value)}
                        placeholder="లేఖన వివరణ (ఐచ్ఛికం)..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-serif font-medium"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
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
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
                    >
                      {editingQuestionId ? 'Update Question' : 'Save Question'}
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
                      CONGREGATION MEMBER PREVIEW
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
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
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

                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, oIdx) => {
                            const isChosen = sel === opt;
                            const isCorrect = q.correctAnswer === opt;

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                  if (!previewSubmitted) {
                                    setPreviewAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                  }
                                }}
                                className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                                  previewShowAnswers && isCorrect
                                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : isChosen
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>
                                  <span className="font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                                  {opt}
                                </span>
                                {previewShowAnswers && isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {previewShowAnswers && q.explanation && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
                            <span className="font-bold block mb-0.5">Biblical Explanation:</span>
                            <span>{q.explanation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewShowAnswers(!previewShowAnswers)}
                    className="text-xs font-bold text-emerald-600 hover:underline"
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
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                      >
                        Submit Test Play
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 4: DELETE CONFIRMATION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {deleteQuizTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Delete Bible Quiz?
                    </h3>
                    <p className="text-[11px] text-slate-500">Permanent removal from library</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete &ldquo;{deleteQuizTarget.title}&rdquo;? All questions and participant attempt metrics for this quiz will be removed.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQuizTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDeleteQuiz}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    <span>Delete Permanently</span>
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
