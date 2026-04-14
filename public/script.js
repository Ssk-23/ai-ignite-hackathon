const getEl = (id) => document.getElementById(id);

let modalEl;
let backdropEl;
let formEl;
let successMessageEl;

function openModal() {
  if (!modalEl || !backdropEl) return;
  modalEl.classList.add('active');
  backdropEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modalEl || !backdropEl) return;
  modalEl.classList.remove('active');
  backdropEl.classList.remove('active');
  document.body.style.overflow = 'auto';
}

function getTargetDate() {
  const configuredDate = document.body.dataset.eventDate;
  if (configuredDate) {
    return new Date(configuredDate);
  }

  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + 3);
  return fallbackDate;
}

function setCountdownValues(days, hours, minutes, seconds) {
  getEl('days').textContent = String(days).padStart(2, '0');
  getEl('hours').textContent = String(hours).padStart(2, '0');
  getEl('minutes').textContent = String(minutes).padStart(2, '0');
  getEl('seconds').textContent = String(seconds).padStart(2, '0');
}

function startCountdown() {
  const eventDate = getTargetDate();

  const updateCountdown = () => {
    const now = Date.now();
    const distance = eventDate.getTime() - now;

    if (distance <= 0) {
      setCountdownValues(0, 0, 0, 0);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    setCountdownValues(days, hours, minutes, seconds);
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function setSubmitLoading(submitBtn, loading, originalLabel) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'PROCESSING...' : originalLabel;
}

function collectFormData() {
  return {
    name: getEl('name').value.trim(),
    email: getEl('email').value.trim(),
    phone: getEl('phone').value.trim(),
    college: getEl('college').value.trim(),
    teamName: getEl('teamName').value.trim(),
    teamSize: Number.parseInt(getEl('teamSize').value, 10),
  };
}

function isValidFormData(data) {
  return (
    data.name &&
    data.email &&
    data.phone &&
    data.college &&
    data.teamName &&
    Number.isInteger(data.teamSize) &&
    data.teamSize >= 1 &&
    data.teamSize <= 4
  );
}

async function fetchConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Unable to load payment configuration');
  }

  return response.json();
}

function showSuccessState() {
  if (!formEl || !successMessageEl) return;
  formEl.style.display = 'none';
  successMessageEl.style.display = 'block';
  formEl.reset();
  successMessageEl.scrollIntoView({ behavior: 'smooth' });
}

async function verifyPayment(response, registrationId) {
  const verifyResponse = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentId: response.razorpay_payment_id,
      orderId: response.razorpay_order_id,
      signature: response.razorpay_signature,
      registrationId,
    }),
  });

  const verifyData = await verifyResponse.json();
  if (!verifyData.success) {
    throw new Error(verifyData.error || 'Payment verification failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  modalEl = getEl('registrationModal');
  backdropEl = getEl('modalBackdrop');
  formEl = getEl('registrationForm');
  successMessageEl = getEl('successMessage');

  startCountdown();

  if (backdropEl) {
    backdropEl.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalEl && modalEl.classList.contains('active')) {
      closeModal();
    }
  });

  if (!formEl) return;

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = collectFormData();
    if (!isValidFormData(formData)) {
      alert('Please fill all fields correctly. Team size must be between 1 and 4.');
      return;
    }

    const submitBtn = formEl.querySelector('.btn-submit');
    const originalLabel = submitBtn.textContent;
    setSubmitLoading(submitBtn, true, originalLabel);

    try {
      const [configData, registerResponse] = await Promise.all([
        fetchConfig(),
        fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }),
      ]);

      const registerData = await registerResponse.json();
      if (!registerData.success) {
        throw new Error(registerData.error || 'Registration failed');
      }

      if (!configData.razorpayKeyId) {
        throw new Error('Razorpay key is missing on server config');
      }

      const rzp = new Razorpay({
        key: configData.razorpayKeyId,
        amount: registerData.amount,
        currency: registerData.currency,
        order_id: registerData.orderId,
        name: 'AI IGNITE 2026',
        description: 'Team Registration Fee - HKBK Hackathon',
        receipt: registerData.registrationId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#a78bfa' },
        modal: { escape: true },
        handler: async (paymentResponse) => {
          try {
            await verifyPayment(paymentResponse, registerData.registrationId);
            showSuccessState();
          } catch (verificationError) {
            alert('Payment verification failed. Please contact support.');
            console.error(verificationError);
          }
        },
      });

      rzp.on('payment.failed', (response) => {
        alert(`Payment failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitLoading(submitBtn, false, originalLabel);
    }
  });
});
