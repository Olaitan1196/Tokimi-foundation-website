// ─────────────────────────────────────────
// CONTACT PAGE JS
// Note: Contact form messages are handled
// client-side only (no contact backend route).
// Messages show a success state without
// sending to a server — you can add an
// email service like Nodemailer later.
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const showAlert = (message, type = 'success') => {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type}">
            ${type === 'success' ? '✅' : '❌'} ${message}
        </div>`;

    if (type === 'success') {
        setTimeout(() => container.innerHTML = '', 6000);
    }
};

const setLoading = (loading) => {
    const btn       = document.getElementById('submitBtn');
    btn.disabled    = loading;
    btn.textContent = loading ? '⏳ Sending...' : '📨 Send Message';
};

// ─────────────────────────────────────────
// CHARACTER COUNTER
// Shows how many characters typed in message
// ─────────────────────────────────────────
const initCharCounter = () => {
    const textarea  = document.getElementById('message');
    const countEl   = document.getElementById('charCount');
    const countWrap = countEl.closest('.char-count');

    if (!textarea || !countEl) return;

    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        countEl.textContent = len;

        // Change color as they approach limit
        countWrap.className = 'char-count';
        if (len > 400) countWrap.classList.add('warning');
        if (len > 480) {
            countWrap.classList.remove('warning');
            countWrap.classList.add('danger');
        }

        // Hard limit at 500
        if (len > 500) {
            textarea.value = textarea.value.substring(0, 500);
            countEl.textContent = 500;
        }
    });
};

// ─────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────
const validateForm = () => {
    let valid = true;

    const fields = [
        { id: 'sender_name',  msg: 'Full name is required' },
        { id: 'sender_email', msg: 'Email address is required' },
        { id: 'subject',      msg: 'Please select a subject' },
        { id: 'message',      msg: 'Message is required' },
    ];

    // Clear previous errors
    fields.forEach(f => {
        const el    = document.getElementById(f.id);
        const errEl = document.getElementById(`err-${f.id}`);
        el.classList.remove('error', 'success');
        if (errEl) errEl.textContent = '';
    });

    // Validate each field
    fields.forEach(f => {
        const el    = document.getElementById(f.id);
        const errEl = document.getElementById(`err-${f.id}`);

        if (!el.value.trim()) {
            el.classList.add('error');
            if (errEl) errEl.textContent = f.msg;
            valid = false;
        } else {
            el.classList.add('success');
        }
    });

    // Validate email format
    const emailEl = document.getElementById('sender_email');
    if (emailEl.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailEl.value)) {
            emailEl.classList.remove('success');
            emailEl.classList.add('error');
            document.getElementById('err-sender_email').textContent =
                'Please enter a valid email address';
            valid = false;
        }
    }

    // Message minimum length
    const messageEl = document.getElementById('message');
    if (messageEl.value.trim() && messageEl.value.trim().length < 10) {
        messageEl.classList.remove('success');
        messageEl.classList.add('error');
        document.getElementById('err-message').textContent =
            'Message must be at least 10 characters';
        valid = false;
    }

    return valid;
};

// ─────────────────────────────────────────
// HANDLE FORM SUBMIT
// Currently shows success UI without
// sending to a backend email service.
// To add real email sending, integrate
// Nodemailer on the backend later.
// ─────────────────────────────────────────
const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const formData = {
        name:    document.getElementById('sender_name').value.trim(),
        email:   document.getElementById('sender_email').value.trim(),
        phone:   document.getElementById('sender_phone').value.trim(),
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value.trim(),
    };

    // Simulate a short delay (remove when real email backend is added)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Show success message
    showAlert(
        `Thank you ${formData.name}! Your message has been received. We will get back to you at ${formData.email} within 24 hours.`
    );

    // Reset form
    document.getElementById('contactForm').reset();
    document.getElementById('charCount').textContent = '0';

    // Clear field states
    ['sender_name','sender_email','subject','message'].forEach(id => {
        document.getElementById(id).classList.remove('success', 'error');
    });

    setLoading(false);
};

// ─────────────────────────────────────────
// FAQ TOGGLE
// Opens and closes FAQ items
// ─────────────────────────────────────────
const toggleFaq = (btn) => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all open FAQs first
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
    });

    // Open clicked one if it was closed
    if (!isOpen) {
        item.classList.add('open');
    }
};

// ─────────────────────────────────────────
// SCROLL ANIMATIONS
// ─────────────────────────────────────────
const initAnimations = () => {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(
        '.info-item, .quick-action-btn, .faq-item'
    ).forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
};

// ─────────────────────────────────────────
// RUN EVERYTHING
// ─────────────────────────────────────────
document.getElementById('contactForm')
    .addEventListener('submit', handleSubmit);

initCharCounter();
initAnimations();