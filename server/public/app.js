// State
let selectedFile = null;
let livePreviewTimeout = null;
let lastConvertedSvgUrl = null;

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImage');
const convertBtn = document.getElementById('convertBtn');

const loading = document.getElementById('loading');
const downloadBtn = document.getElementById('downloadBtn');
const livePreview = document.getElementById('livePreview');

// Parameter elements
const colorModeToggle = document.getElementById('colorModeToggle');
const detail = document.getElementById('detail');
const detailValue = document.getElementById('detailValue');
const smoothness = document.getElementById('smoothness');
const smoothnessValue = document.getElementById('smoothnessValue');
const contrast = document.getElementById('contrast');
const contrastValue = document.getElementById('contrastValue');

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

// Live preview function with debouncing
async function updateLivePreview() {
    if (!selectedFile) return;

    livePreview.innerHTML = '<div class="preview-loading">⏳ Converting...</div>';

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

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.files.svg) {
            // Store the SVG URL for download
            lastConvertedSvgUrl = data.files.svg;

            // Fetch and display the SVG
            const svgResponse = await fetch(data.files.svg);
            const svgText = await svgResponse.text();
            livePreview.innerHTML = svgText;
        } else {
            livePreview.innerHTML = '<div class="preview-placeholder"><span>Conversion failed</span></div>';
        }
    } catch (error) {
        console.error('Live preview error:', error);
        livePreview.innerHTML = '<div class="preview-placeholder"><span>Preview error</span></div>';
    }
}

function debouncedLivePreview() {
    if (livePreviewTimeout) {
        clearTimeout(livePreviewTimeout);
    }
    livePreviewTimeout = setTimeout(() => {
        updateLivePreview();
    }, 600); // Wait 600ms after user stops sliding
}

// Parameter updates with labels
detail.addEventListener('input', (e) => {
    const labels = ['Low', 'Medium', 'High'];
    detailValue.textContent = labels[e.target.value - 1];
    debouncedLivePreview();
});

smoothness.addEventListener('input', (e) => {
    const labels = ['Sharp', 'Medium', 'Smooth'];
    smoothnessValue.textContent = labels[e.target.value - 1];
    debouncedLivePreview();
});

contrast.addEventListener('input', (e) => {
    const labels = ['Very Dark', 'Dark', 'Balanced', 'Light', 'Very Light'];
    contrastValue.textContent = labels[e.target.value - 1];
    debouncedLivePreview();
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
    debouncedLivePreview();
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

// Convert button handler - Finalizes and prepares download
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const successOverlay = document.getElementById('successOverlay');

    // If we don't have a cached preview, generate one first
    if (!lastConvertedSvgUrl) {
        loading.style.display = 'flex';
        await updateLivePreview();
        loading.style.display = 'none';
    }

    // Show success animation
    successOverlay.style.display = 'flex';

    // Set up download button with the last converted SVG
    if (lastConvertedSvgUrl) {
        downloadBtn.href = lastConvertedSvgUrl;
        downloadBtn.download = lastConvertedSvgUrl.split('/').pop();
    }

    // Hide success overlay and show glowing download button
    setTimeout(() => {
        successOverlay.style.display = 'none';

        // Show and illuminate the download button
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.classList.remove('glow-hidden');
        downloadBtn.classList.add('glow-active');
    }, 2000);
});

function resetForm() {
    selectedFile = null;
    lastConvertedSvgUrl = null;
    fileInput.value = '';
    preview.style.display = 'none';
    dropZone.style.display = 'block';
    loading.style.display = 'none';

    // Reset live preview
    livePreview.innerHTML = '<div class="preview-placeholder"><span>Adjust sliders to preview</span></div>';

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
