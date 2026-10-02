import { LayoutDashboard, CalendarCheck, Calendar, GraduationCap, BookOpen, Briefcase, FolderKanban, Settings, Search, Command, Bell, Plus, Sun, Moon, Monitor, Palette, Image, X, Check, ChevronLeft, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, Play, Pause, Square, RotateCcw, Timer, Target, Flame, Clock, Download, Upload, Trash2, Pencil, MoreHorizontal, AlertTriangle, Info, CheckCircle2, XCircle, Flag, Link, Tag, StickyNote, Lightbulb, FileText, Layers, ListChecks, TrendingUp, BarChart3, Zap, Keyboard, Shield, Database, RefreshCw, Maximize2, Minimize2, CalendarPlus, ArrowRight, ExternalLink, Star, Inbox, Loader2, Eye, History, Copy, HardDrive, Accessibility, Coffee, Trophy, Mail, Users, Building2, Milestone, GripVertical, Sparkles, Home, ArrowLeft, Bug, FolderOpen, CircleDot, AlarmClock, Hourglass } from 'lucide';

const ICONS = { LayoutDashboard, CalendarCheck, Calendar, GraduationCap, BookOpen, Briefcase, FolderKanban, Settings, Search, Command, Bell, Plus, Sun, Moon, Monitor, Palette, Image, X, Check, ChevronLeft, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, Play, Pause, Square, RotateCcw, Timer, Target, Flame, Clock, Download, Upload, Trash2, Pencil, MoreHorizontal, AlertTriangle, Info, CheckCircle2, XCircle, Flag, Link, Tag, StickyNote, Lightbulb, FileText, Layers, ListChecks, TrendingUp, BarChart3, Zap, Keyboard, Shield, Database, RefreshCw, Maximize2, Minimize2, CalendarPlus, ArrowRight, ExternalLink, Star, Inbox, Loader2, Eye, History, Copy, HardDrive, Accessibility, Coffee, Trophy, Mail, Users, Building2, Milestone, GripVertical, Sparkles, Home, ArrowLeft, Bug, FolderOpen, CircleDot, AlarmClock, Hourglass };

const attrs = a => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
/** One icon system for the whole app (Lucide, 24px grid, 1.75 stroke). `name` is the PascalCase Lucide name. */
export function icon(name, cls = '') {
  const node = ICONS[name];
  if (!node) { console.warn('[icons] unknown icon', name); return ''; }
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('')}</svg>`;
}
