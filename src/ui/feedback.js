import { esc } from './shared.js';
let toastTimer;
export function toast(message) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer); el.textContent = message; el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}
document.addEventListener('studio:notice', e => toast(e.detail));
export function confirmation(message, action) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    dialog.innerHTML = `<h2 id="confirmation-title">Keep your learning safe.</h2><p>${esc(message)}</p><div class="button-row"><button class="button secondary" data-cancel>Keep current progress</button><button class="button primary" data-confirm>${esc(action)}</button></div>`;
    const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
    dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
    dialog.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', e => { e.preventDefault(); finish(false); });
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('[data-cancel]').focus();
  });
}
