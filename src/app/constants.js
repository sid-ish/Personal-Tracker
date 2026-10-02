import { GATE_ME_SYLLABUS } from '../data/gate-me-syllabus.js';
import { GATE_RA_SYLLABUS } from '../data/gate-ra-syllabus.js';
import { GATE_GA_SYLLABUS } from '../data/gate-ga-syllabus.js';

export const SYLLABI = { ME: GATE_ME_SYLLABUS, RA: GATE_RA_SYLLABUS, GA: GATE_GA_SYLLABUS };

/** Sidebar structure. `key` is the single-letter shortcut shown as a hint. */
export const NAV_GROUPS = [
  { label: 'WORKSPACE', items: [
    { view: 'dashboard', label: 'Command Centre', short: 'Home', icon: 'LayoutDashboard', key: 'D' },
    { view: 'today', label: 'Today', short: 'Today', icon: 'CalendarCheck', key: 'T' },
    { view: 'calendar', label: 'Calendar', short: 'Calendar', icon: 'Calendar', key: 'C' } ] },
  { label: 'LEARNING', items: [
    { view: 'gate', label: 'GATE 2027', short: 'GATE', icon: 'GraduationCap', key: 'G' },
    { view: 'knowledge', label: 'Knowledge', short: 'Knowledge', icon: 'BookOpen', key: 'K' } ] },
  { label: 'CAREER', items: [
    { view: 'career', label: 'Career', short: 'Career', icon: 'Briefcase', key: 'R' },
    { view: 'projects', label: 'Projects', short: 'Projects', icon: 'FolderKanban', key: 'P' } ] },
  { label: 'SYSTEM', items: [{ view: 'settings', label: 'Settings', short: 'Settings', icon: 'Settings', key: ',' }] },
];
export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);
export const VIEW_TITLES = { ...Object.fromEntries(NAV_ITEMS.map(n => [n.view, n.label])), focus: 'Focus mode' };

export const TASK_CATEGORIES = [['academic', 'Academic'], ['gate', 'GATE'], ['project', 'Project'], ['personal', 'Personal'], ['other', 'Other']];
export const PRIORITIES = [['urgent', 'Urgent'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
export const INTERN_STATUSES = ['saved','applied','shortlisted','interview','offer','accepted','rejected','withdrawn','waiting'];
/** Kanban columns; each groups one or more stored statuses. The first status is what a drop assigns. */
export const PIPELINE = [
  { id: 'saved', label: 'Saved', statuses: ['saved', 'waiting'] }, { id: 'applied', label: 'Applied', statuses: ['applied', 'shortlisted'] },
  { id: 'interview', label: 'Interview', statuses: ['interview'] }, { id: 'offer', label: 'Offer', statuses: ['offer', 'accepted'] },
  { id: 'rejected', label: 'Rejected', statuses: ['rejected', 'withdrawn'] },
];
export const UNI_CHECKLIST = ['transcript','cv','sop','lor1','lor2','testScore','other'];
export const SKILL_CATS = ['Programming','CAD','Robotics','Embedded','Electronics','Mechanical','Manufacturing','Simulation','AI/ML','Computer Vision','Communication','Project Management','Other'];
export const RESUME_SECTIONS = ['Education','Projects','Internships','Skills','Achievements','Certifications','Competitions','Leadership','Publications'];
export const EVENT_TYPES = ['Competition','Hackathon','Conference','Workshop','Presentation','Interview','Meeting','Exam','College Event','Deadline','Other'];
export const RESOURCE_TYPES = ['Course','Book','Video','Playlist','Paper','Documentation','Tutorial','Dataset','Website','Reference'];
export const RESOURCE_STATUSES = ['saved','started','in_progress','completed','revisit','archived'];
export const DOC_CATS = ['Academic','Resume','Internship','Projects','Certificates','Applications','Personal','Other'];
export const ACH_TYPES = ['Competition','Certification','Internship','Project','Presentation','Publication','Academic','Award','Other'];
export const PROJECT_STATUSES = ['active','planned','idea','paused','completed','archived'];
export const MISTAKE_TYPES = ['concept gap','formula forgotten','calculation','sign error','misread','time pressure','guess','carelessness','other'];
