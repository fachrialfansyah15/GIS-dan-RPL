(function() {
    const form = document.getElementById('forgotForm');
    const submitBtn = document.getElementById('forgotSubmit');

    function showToast(message, ok) {
        const div = document.createElement('div');
        div.className = 'reports-message ' + (ok ? 'success' : 'info');
        div.innerHTML = '<i class="fas ' + (ok ? 'fa-check-circle' : 'fa-info-circle') + '"></i><span>' + message + '</span>';
        div.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;color:white;font-weight:500;z-index:10000;display:flex;align-items:center;gap:10px;animation:slideIn 0.3s ease;' + (ok ? 'background:#28a745;' : 'background:#17a2b8;');
        document.body.appendChild(div);
        setTimeout(() => { div.style.animation = 'slideOut 0.3s ease'; setTimeout(() => div.remove(), 300); }, 3000);
    }

    if (form && submitBtn) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span>' + ' Sending...';
            try {
                const res = await fetch(form.getAttribute('action'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: document.getElementById('email').value.trim() })
                });
                showToast('If the email exists, we\'ve sent a reset link.', true);
            } catch(err) {
                showToast('If the email exists, we\'ve sent a reset link.', true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send reset link';
            }
        });
    }
})();
