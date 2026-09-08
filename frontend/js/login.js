// Login + register pages share this. Presence of #name field => register mode.
const form = document.getElementById('auth-form');
const errorBox = document.getElementById('form-error');
const isRegister = !!document.getElementById('name');

const nextParam = new URLSearchParams(location.search).get('next');
const nextPage = nextParam && /^[\w.-]+\.html$/.test(nextParam) ? nextParam : 'index.html';

if (Auth.isLoggedIn()) location.href = nextPage;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.textContent = '';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const field = (n) => form.elements.namedItem(n);
    const payload = {
      email: field('email').value.trim(),
      password: field('password').value,
    };
    let res;
    if (isRegister) {
      payload.name = field('name').value.trim();
      res = await Api.register(payload);
    } else {
      res = await Api.login(payload);
    }
    Api.setSession(res.token, res.user);
    toast(`Welcome, ${res.user.name}!`, 'ok');
    setTimeout(() => (location.href = res.user.role === 'admin' ? 'admin/dashboard.html' : nextPage), 500);
  } catch (err) {
    errorBox.textContent = err.message;
    submitBtn.disabled = false;
  }
});
