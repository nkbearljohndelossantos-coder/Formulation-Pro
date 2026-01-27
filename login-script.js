/**
 * Interactive Chemical Background Animation
 */
const canvas = document.getElementById('chem-canvas');
const ctx = canvas.getContext('2d');

let atoms = [];
const atomTypes = ['C', 'H', 'O', 'N'];
const mouse = { x: null, y: null, radius: 150 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Atom {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 4 + 2; // Large gold atoms
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.label = atomTypes[Math.floor(Math.random() * atomTypes.length)];
        this.color = 'rgba(212, 175, 55, 0.8)'; // Gold Color
        this.originalX = this.x;
        this.originalY = this.y;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Draw label
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(212, 175, 55, 0.9)'; // Gold Labels
        ctx.fillText(this.label, this.x + 8, this.y - 8);
    }

    update() {
        // Floating movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

        // Mouse interaction
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * 5;
            const directionY = forceDirectionY * force * 5;

            this.x -= directionX;
            this.y -= directionY;
        }
    }
}

function initAtoms() {
    atoms = [];
    const numberOfAtoms = (canvas.width * canvas.height) / 15000;
    for (let i = 0; i < numberOfAtoms; i++) {
        atoms.push(new Atom());
    }
}

function connect() {
    let opacityValue = 1;
    for (let a = 0; a < atoms.length; a++) {
        for (let b = a; b < atoms.length; b++) {
            let dx = atoms[a].x - atoms[b].x;
            let dy = atoms[a].y - atoms[b].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                opacityValue = 1 - (distance / 150);
                ctx.strokeStyle = 'rgba(212, 175, 55,' + opacityValue * 0.4 + ')'; // Gold connections
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(atoms[a].x, atoms[a].y);
                ctx.lineTo(atoms[b].x, atoms[b].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].update();
        atoms[i].draw();
    }
    connect();
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    initCanvas();
    initAtoms();
});

initCanvas();
initAtoms();
animate();

// Animation and form switching logic
const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');

// Switch to register form
if (registerLink) {
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.add('active');
    });
}


// Switch to login form
if (loginLink) {
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('active');
    });
}

// Google Login Handlers
const googleLoginBtn = document.getElementById('google-login-btn');
const googleRegisterBtn = document.getElementById('google-register-btn');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        await window.auth.signInWithGoogle();
    });
}

if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener('click', async () => {
        await window.auth.signInWithGoogle();
    });
}


// Handle login form submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        window.supabaseClient.debug.log('Login Form Submitted', 'info', { email });

        const btn = loginForm.querySelector('.btn');
        const btnText = btn.querySelector('span');
        btn.disabled = true;
        btnText.textContent = 'Signing in...';

        const result = await window.auth.signIn(email, password);

        if (result.success) {
            window.supabaseClient.debug.log('Login successful, checking profile...', 'info');
            // Check role and activation for redirection
            const userWithProfile = await window.auth.getCurrentUserWithProfile();

            if (!userWithProfile) {
                window.supabaseClient.debug.log('Post-login profile check failed (possibly inactive)', 'error');
                btn.disabled = false;
                btnText.textContent = 'Login';
                return;
            }

            const profile = userWithProfile.profile;
            window.supabaseClient.debug.log('Routing user...', 'info', { role: profile.role });

            // Redirect based on role
            const redirect = (profile.role === 'compounding') ? 'compounding-dashboard.html' : 'index.html';
            window.location.href = redirect;
        } else {
            window.supabaseClient.debug.log('Login failed', 'error', result.error);
            btn.disabled = false;
            btnText.textContent = 'Login';
        }
    });
}

// Handle register form submission
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const code = document.getElementById('register-code').value;

        if (!code) {
            window.supabaseClient.showNotification('Please enter the Unique Admin Code', 'error');
            return;
        }

        const btn = registerForm.querySelector('.btn');
        const btnText = btn.querySelector('span');
        btn.disabled = true;
        btnText.textContent = 'Creating account...';

        const result = await window.auth.signUp(email, password, name, code);

        if (result.success) {
            setTimeout(() => {
                wrapper.classList.remove('active');
                document.getElementById('login-email').value = email;
            }, 2000);
        } else {
            btn.disabled = false;
            btnText.textContent = 'Register';
        }
    });
}

// Check if already logged in (Role-aware & Activation-aware)
window.addEventListener('load', async () => {
    try {
        window.supabaseClient.debug.log('Auto-login check started', 'info');

        // GOOGLE AUTH FIX: If we have an access token in the hash, we are returning from Google Auth.
        // We must clear the logout pending flag to allow the handshake.
        if (window.location.hash && window.location.hash.includes('access_token=')) {
            window.supabaseClient.debug.log('Google OAuth response detected. Clearing logout guards.', 'info');
            localStorage.removeItem('antigravity_logout_pending');
        }

        // Check if we just logged out to prevent immediate re-entry loop
        if (localStorage.getItem('antigravity_logout_pending')) {
            window.supabaseClient.debug.log('Auto-login suppressed: Logout in progress', 'warning');
            return;
        }

        const user = await window.supabaseClient.getCurrentUser();
        if (user) {
            window.supabaseClient.debug.log('Active session found, validating profile...', 'info');
            const userWithProfile = await window.auth.getCurrentUserWithProfile();

            if (!userWithProfile) {
                window.supabaseClient.debug.log('Auto-login aborted: Inactive user redirected', 'warning');
                // Redirection to inactive.html is handled inside getCurrentUserWithProfile
                return;
            }

            const profile = userWithProfile.profile;
            const targetPage = (profile.role === 'compounding') ? 'compounding-dashboard.html' : 'index.html';

            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect') || targetPage;

            window.supabaseClient.debug.log('Auto-login redirecting...', 'info', { to: redirect });
            window.location.href = redirect;
        } else {
            window.supabaseClient.debug.log('No active session found at startup', 'info');
        }
    } catch (err) {
        window.supabaseClient.debug.log('Auto-login system error', 'error', err);
        console.error('Error during auto-login check:', err);
    }
});
