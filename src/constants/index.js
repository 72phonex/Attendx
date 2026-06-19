export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SUBJECT_COLORS = [
  '#7C6FF7', '#F04444', '#22C55E', '#F0A444',
  '#44A4F0', '#F044A4', '#A4F044', '#44F0D4',
  '#F07044', '#9B44F0',
];

export const PRIORITY_COLORS = {
  high: '#F04444',
  medium: '#F0A444',
  low: '#22C55E',
};

export const PRIORITY_LABELS = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
};

export const AI_PROVIDERS = {
  groq: {
    name: 'Groq (Free)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyHint: 'Get free key at console.groq.com',
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    keyHint: 'Get key at platform.openai.com',
  },
  gemini: {
    name: 'Gemini (Free)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    keyHint: 'Get free key at aistudio.google.com',
  },
  custom: {
    name: 'Custom Endpoint',
    endpoint: '',
    defaultModel: '',
    models: [],
    keyHint: 'Any OpenAI-compatible API',
  },
};

export const getTodayIndex = () => {
  const day = new Date().getDay(); // 0=Sun
  if (day === 0) return -1; // Sunday — no classes
  return day - 1; // Mon=0 … Sat=5
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getTodayString = () => new Date().toISOString().split('T')[0];
