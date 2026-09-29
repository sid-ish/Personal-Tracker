import { GATE_ME_SYLLABUS } from '../data/gate-me-syllabus.js';
import { GATE_RA_SYLLABUS } from '../data/gate-ra-syllabus.js';
import { GATE_GA_SYLLABUS } from '../data/gate-ga-syllabus.js';

export const SYLLABI = { ME: GATE_ME_SYLLABUS, RA: GATE_RA_SYLLABUS, GA: GATE_GA_SYLLABUS };
export const themeOrder = ['system', 'dark', 'light'];
export const NAV_ITEMS = [
  { view: 'today', label: 'Today', short: 'Today' },
  { view: 'gate', label: 'GATE 2027', short: 'GATE' },
  { view: 'career', label: 'Career', short: 'Career' },
  { view: 'dashboard', label: 'Home', short: 'Home' },
  { view: 'knowledge', label: 'Knowledge', short: 'Knowledge' },
  { view: 'projects', label: 'Projects', short: 'Projects' },
  { view: 'calendar', label: 'Calendar', short: 'Calendar' },
];

export const INTERN_STATUSES = ['saved','applied','shortlisted','interview','offer','accepted','rejected','withdrawn','waiting'];
export const UNI_CHECKLIST = ['transcript','cv','sop','lor1','lor2','testScore','other'];
export const SKILL_CATS = ['Programming','CAD','Robotics','Embedded','Electronics','Mechanical','Manufacturing','Simulation','AI/ML','Computer Vision','Communication','Project Management','Other'];
export const RESUME_SECTIONS = ['Education','Projects','Internships','Skills','Achievements','Certifications','Competitions','Leadership','Publications'];
export const EVENT_TYPES = ['Competition','Hackathon','Conference','Workshop','Presentation','Interview','Meeting','Exam','College Event','Deadline','Other'];
export const RESOURCE_TYPES = ['Course','Book','Video','Playlist','Paper','Documentation','Tutorial','Dataset','Website','Reference'];
export const RESOURCE_STATUSES = ['saved','started','in_progress','completed','revisit','archived'];
export const DOC_CATS = ['Academic','Resume','Internship','Projects','Certificates','Applications','Personal','Other'];
export const ACH_TYPES = ['Competition','Certification','Internship','Project','Presentation','Publication','Academic','Award','Other'];
