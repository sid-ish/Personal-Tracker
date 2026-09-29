import { NAV_ITEMS } from '../app/constants.js';

export const sidebarHtml = () => `<div class="sidebar" id="sidebar">
  <div class="brand">Sidharth OS<span>Command Centre</span></div>
  ${NAV_ITEMS.map(n => `<button class="navbtn" data-view="${n.view}">${n.label}</button>`).join('')}
</div>`;
