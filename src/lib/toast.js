/** Tiny global toast bus: any module can call toast(msg, type) and the
 *  <Toaster /> mounted in the dashboard renders it. */
let seq = 0;

export function toast(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { id: ++seq, message: String(message), type },
    })
  );
}

/** Ask every dashboard view to reload server-side data (balances etc). */
export function refreshDashboard() {
  window.dispatchEvent(new CustomEvent('monetra:refresh'));
}
