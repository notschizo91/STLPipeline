// State
let selectedFile = null;
let isAuthenticated = false;

// Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const app = document.getElementById('app');
const logoutBtn = document.getElementById('logoutBtn');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImage');
const convertBtn = document.getElementById('convertBtn');

const loading = document.getElementById('loading');
const downloadBtn = document.getElementById('downloadBtn');

// Parameter elements
const colorModeToggle = document.getElementById('colorModeToggle');
const detail = document.getElementById('detail');
const detailValue = document.getElementById('detailValue');
const smoothness = document.getElementById('smoothness');
const smoothnessValue = document.getElementById('smoothnessValue');
const contrast = document.getElementById('contrast');
const contrastValue = document.getElementById('contrastValue');

// Check authentication on load
checkAuthStatus();

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            isAuthenticated = true;
            loginModal.style.display = 'none';
            app.style.display = 'block';
            loginError.textContent = '';
        } else {
            loginError.textContent = data.error || 'Invalid password';
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        loginError.textContent = 'Login failed. Please try again.';
    }
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    isAuthenticated = false;
    app.style.display = 'none';
    loginModal.style.display = 'flex';
    passwordInput.value = '';
    resetForm();
});

// Check auth status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (data.authenticated) {
            isAuthenticated = true;
            loginModal.style.display = 'none';
            app.style.display = 'block';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// File upload handlers
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

removeImageBtn.addEventListener('click', () => {
    resetForm();
});

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        dropZone.style.display = 'none';
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Parameter updates with labels
detail.addEventListener('input', (e) => {
    const labels = ['Low', 'Medium', 'High'];
    detailValue.textContent = labels[e.target.value - 1];
});

smoothness.addEventListener('input', (e) => {
    const labels = ['Sharp', 'Medium', 'Smooth'];
    smoothnessValue.textContent = labels[e.target.value - 1];
});

contrast.addEventListener('input', (e) => {
    const labels = ['Very Dark', 'Dark', 'Balanced', 'Light', 'Very Light'];
    contrastValue.textContent = labels[e.target.value - 1];
});

// Color mode toggle handler
colorModeToggle.addEventListener('change', () => {
    const labels = document.querySelectorAll('.mode-label');
    if (colorModeToggle.checked) {
        // Color mode active
        labels[0].style.color = 'var(--text-secondary)';
        labels[1].style.color = 'var(--primary)';
    } else {
        // B&W mode active
        labels[0].style.color = 'var(--primary)';
        labels[1].style.color = 'var(--text-secondary)';
    }
});

// Map simple sliders to technical parameters
function getConversionParams() {
    const turdSizeMap = { 1: 5, 2: 2, 3: 1 };
    const toleranceMap = { 1: 0.1, 2: 0.2, 3: 0.4 };
    const thresholdMap = { 1: 64, 2: 96, 3: 128, 4: 160, 5: 192 };

    return {
        threshold: thresholdMap[parseInt(contrast.value)],
        turdSize: turdSizeMap[parseInt(detail.value)],
        optTolerance: toleranceMap[parseInt(smoothness.value)]
    };
}

// Convert button handler
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const params = getConversionParams();

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('colorMode', colorModeToggle.checked ? 'true' : 'false');
    formData.append('threshold', params.threshold);
    formData.append('turdSize', params.turdSize);
    formData.append('optCurve', 'true');
    formData.append('optTolerance', params.optTolerance);
    formData.append('saveSvg', 'true');
    formData.append('height', '1');
    formData.append('scale', '1');
    formData.append('twistAngle', '0');

    // Show loading overlay
    loading.style.display = 'flex';

    const progressFill = document.getElementById('progressFill');
    const stepText = document.getElementById('stepText');
    const stepIcon = document.querySelector('.step-icon');
    const successOverlay = document.getElementById('successOverlay');

    // Animate progress through steps
    stepText.textContent = 'Analyzing your image...';
    stepIcon.textContent = '🔍';
    progressFill.style.width = '10%';

    setTimeout(() => {
        stepText.textContent = 'Tracing edges and shapes...';
        stepIcon.textContent = '✏️';
        progressFill.style.width = '40%';
    }, 800);

    setTimeout(() => {
        stepText.textContent = 'Converting to vector paths...';
        stepIcon.textContent = '📐';
        progressFill.style.width = '70%';
    }, 2000);

    setTimeout(() => {
        stepText.textContent = 'Optimizing curves...';
        stepIcon.textContent = '✨';
        progressFill.style.width = '90%';
    }, 3000);

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.files.svg) {
            // Complete progress
            progressFill.style.width = '100%';
            stepText.textContent = 'Vector created!';
            stepIcon.textContent = '✅';

            // Wait a moment then show success animation
            setTimeout(() => {
                loading.style.display = 'none';
                successOverlay.style.display = 'flex';

                // Set up download button
                downloadBtn.href = data.files.svg;
                downloadBtn.download = data.files.svg.split('/').pop();

                // Hide success overlay and show glowing download button
                setTimeout(() => {
                    successOverlay.style.display = 'none';

                    // Show and illuminate the download button
                    downloadBtn.style.display = 'inline-flex';
                    downloadBtn.classList.remove('glow-hidden');
                    downloadBtn.classList.add('glow-active');
                }, 2000);
            }, 500);

        } else {
            throw new Error(data.message || 'Conversion failed');
        }
    } catch (error) {
        loading.style.display = 'none';
        alert('Conversion failed: ' + error.message);
        progressFill.style.width = '0%';
    }
});

function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    preview.style.display = 'none';
    dropZone.style.display = 'block';
    loading.style.display = 'none';

    // Hide and reset download button
    downloadBtn.classList.remove('glow-active');
    downloadBtn.classList.add('glow-hidden');
    setTimeout(() => {
        downloadBtn.style.display = 'none';
    }, 300);

    // Reset progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '0%';

    // Reset parameters to defaults
    detail.value = 2;
    detailValue.textContent = 'Medium';
    smoothness.value = 2;
    smoothnessValue.textContent = 'Medium';
    contrast.value = 3;
    contrastValue.textContent = 'Balanced';
}
