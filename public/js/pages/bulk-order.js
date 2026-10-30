/* =====================================================================
   pages/bulk-order.js — bulk order enquiry form
   (From Phase 3 it is saved in the admin panel + sent to Telegram.)
   ===================================================================== */

(function bulkPage() {
  const form = document.querySelector('[data-bulk-form]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const phone = cleanPhone(form.phone.value);
    const items = form.items.value.trim();
    form.name.classList.toggle('is-invalid', name.length < 2);
    form.phone.classList.toggle('is-invalid', !phone);
    form.items.classList.toggle('is-invalid', items.length < 3);
    if (name.length < 2 || !phone || items.length < 3) return;

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await API.bulkEnquiry({
        name, phone, items,
        occasion: form.occasion.value.trim(),
        needed_by: form.needed_by.value,
        website: form.website.value, // honeypot
      });
      UI.track('generate_lead', { form: 'bulk_order' });
      form.innerHTML = `<div class="text-center py-4"><div style="font-size:3rem;color:var(--green)"><i class="bi bi-check-circle-fill"></i></div>
        <h2 class="h4">Thank you, ${esc(name)}!</h2><p class="mb-0">We've received your list and will call you on ${esc(phone)} soon.</p></div>`;
    } catch (err) {
      UI.toast(err.message || 'Sorry, please try again.', 'danger');
      btn.disabled = false;
    }
  });
})();
