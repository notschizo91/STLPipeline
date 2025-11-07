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
const loadingStep = document.getElementById('loadingStep');
const results = document.getElementById('results');

// Parameter elements
const threshold = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const height = document.getElementById('height');
const heightValue = document.getElementById('heightValue');
const scale = document.getElementById('scale');
const scaleValue = document.getElementById('scaleValue');
const twist = document.getElementById('twist');
const twistValue = document.getElementById('twistValue');
const saveSvg = document.getElementById('saveSvg');

// Result elements
const svgDownload = document.getElementById('svgDownload');
const svgLink = document.getElementById('svgLink');
const stlLink = document.getElementById('stlLink');
const convertAnother = document.getElementById('convertAnother');

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
    selectedFile = null;
    fileInput.value = '';
    preview.style.display = 'none';
    dropZone.style.display = 'block';
    convertBtn.disabled = true;
    results.style.display = 'none';
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
        convertBtn.disabled = false;
        results.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Parameter updates
threshold.addEventListener('input', (e) => {
    thresholdValue.textContent = e.target.value;
});

height.addEventListener('input', (e) => {
    heightValue.textContent = e.target.value;
});

scale.addEventListener('input', (e) => {
    scaleValue.textContent = e.target.value;
});

twist.addEventListener('input', (e) => {
    twistValue.textContent = e.target.value;
});

// Convert button handler
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('threshold', threshold.value);
    formData.append('height', height.value);
    formData.append('scale', scale.value);
    formData.append('twistAngle', twist.value);
    formData.append('saveSvg', saveSvg.checked);
    formData.append('turdSize', '2');
    formData.append('optCurve', 'true');
    formData.append('optTolerance', '0.2');

    // Show loading overlay
    loading.style.display = 'flex';
    convertBtn.disabled = true;

    const progressFill = document.getElementById('progressFill');
    const stepText = document.getElementById('stepText');
    const stepIcon = document.querySelector('.step-icon');
    const successOverlay = document.getElementById('successOverlay');

    // Animate progress through steps
    stepText.textContent = 'Vectorizing image...';
    stepIcon.textContent = '🔄';
    progressFill.style.width = '10%';

    setTimeout(() => {
        stepText.textContent = 'Tracing bitmap to vector paths...';
        progressFill.style.width = '35%';
    }, 800);

    setTimeout(() => {
        stepText.textContent = 'Extruding to 3D geometry...';
        stepIcon.textContent = '📐';
        progressFill.style.width = '65%';
    }, 2000);

    setTimeout(() => {
        stepText.textContent = 'Generating STL file...';
        stepIcon.textContent = '🔲';
        progressFill.style.width = '90%';
    }, 3500);

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Complete progress
            progressFill.style.width = '100%';
            stepText.textContent = 'Complete!';
            stepIcon.textContent = '✅';

            // Wait a moment then show success animation
            setTimeout(() => {
                loading.style.display = 'none';
                successOverlay.style.display = 'flex';

                // Hide success overlay and show results after animation
                setTimeout(() => {
                    successOverlay.style.display = 'none';
                    results.style.display = 'block';

                    if (data.files.svg) {
                        svgDownload.style.display = 'flex';
                        svgLink.href = data.files.svg;
                        svgLink.download = data.files.svg.split('/').pop();
                    } else {
                        svgDownload.style.display = 'none';
                    }

                    stlLink.href = data.files.stl;
                    stlLink.download = data.files.stl.split('/').pop();

                    // Scroll to results
                    results.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 2000);
            }, 500);

        } else {
            throw new Error(data.message || 'Conversion failed');
        }
    } catch (error) {
        loading.style.display = 'none';
        alert('Conversion failed: ' + error.message);
        convertBtn.disabled = false;
        // Reset progress
        progressFill.style.width = '0%';
    }
});

// Convert another handler
convertAnother.addEventListener('click', () => {
    resetForm();
});

function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    preview.style.display = 'none';
    dropZone.style.display = 'block';
    convertBtn.disabled = true;
    results.style.display = 'none';
    loading.style.display = 'none';

    // Reset progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '0%';

    // Reset parameters to defaults
    threshold.value = 128;
    thresholdValue.textContent = '128';
    height.value = 5;
    heightValue.textContent = '5';
    scale.value = 1;
    scaleValue.textContent = '1.0';
    twist.value = 0;
    twistValue.textContent = '0';
    saveSvg.checked = true;
}
