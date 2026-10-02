import { icon } from './icons.js';
const ITEMS = [['dashboard', 'Home', 'LayoutDashboard'], ['today', 'Today', 'CalendarCheck'], ['gate', 'GATE', 'GraduationCap'], ['projects', 'Projects', 'FolderKanban']];
/** Mobile: four destinations + "More" (opens the full navigation drawer) — never an 8-item cramped bar. */
export const bottomNavHtml = () => `<nav class="bottomnav" id="bottomnav" aria-label="Quick navigation">${ITEMS.map(([v, l, i]) => `<a href="#/${v}" data-view="${v}">${icon(i)}<span>${l}</span></a>`).join('')}<button data-act="open-drawer" aria-label="More navigation">${icon('Menu')}<span>More</span></button></nav>`;
