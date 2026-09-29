import { NAV_ITEMS } from '../app/constants.js';

export const bottomNavHtml = () => `<div class="bottomnav" id="bottomnav">${NAV_ITEMS.map(n => `<button data-view="${n.view}"><span>${n.short}</span></button>`).join('')}</div>`;
