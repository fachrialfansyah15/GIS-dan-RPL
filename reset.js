// Toggle handlers (delegated)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.toggle-password');
    if (!btn) return;
    const wrapper = btn.closest('.password-field');
    const input = wrapper ? wrapper.querySelector('input[type="password"], input[type="text"]') : null;
    if (!input) return;
    const isPassword = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPassword ? 'text' : 'password');
    btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    const icon = btn.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
});

(function() {
    // Get token from query string
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    const tokenInput = document.getElementById('token');
    if (tokenInput) tokenInput.value = token;

    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('resetSubmit');

    function toast(message, ok) {
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
            const p1 = /** @type {HTMLInputElement} */(document.getElementById('newPassword')).value;
            const p2 = /** @type {HTMLInputElement} */(document.getElementById('confirmPassword')).value;
            if (p1 !== p2) {
                toast('Passwords do not match', false);
                return;
            }
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> Updating...';
            try {
                const res = await fetch(form.getAttribute('action'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token, newPassword: p1 })
                });
                if (!res.ok) throw new Error('Reset failed');
                toast('Password updated. You can now login.', true);
                setTimeout(() => window.location.href = 'index.html', 1500);
            } catch(err) {
                toast('Reset link invalid or expired.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Password';
            }
        });
    }
})();
