// Central error handling: full details go to the console; users only see a short banner.
export function handleError(err) {
  console.error('[Sidharth OS]', err);
  let bar = document.getElementById('errorBanner');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'errorBanner';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10;background:var(--danger);color:#fff;padding:8px 14px;font-size:.8rem;text-align:center';
    document.body.appendChild(bar);
  }
  bar.textContent = 'Something went wrong. Your data is safe — try reloading the page.';
}
export const registerGlobalErrorHandlers = () => {
  window.addEventListener('error', e => handleError(e.error || e.message));
  window.addEventListener('unhandledrejection', e => handleError(e.reason));
};
