// State
let selectedFile = null;
let livePreviewTimeout = null;
let lastConvertedSvgUrl = null;

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const removeImageBtn = document.getElementById('removeImage');
const convertBtn = document.getElementById('convertBtn');

const loading = document.getElementById('loading');
const downloadBtn = document.getElementById('downloadBtn');
const livePreview = document.getElementById('livePreview');
const counterValue = document.getElementById('counterValue');

// Parameter elements
const detail = document.getElementById('detail');
const detailValue = document.getElementById('detailValue');
const smoothness = document.getElementById('smoothness');
const smoothnessValue = document.getElementById('smoothnessValue');
const contrast = document.getElementById('contrast');
const contrastValue = document.getElementById('contrastValue');

// Fetch and display counter on page load
async function fetchCounter() {
    try {
        const response = await fetch('/api/counter');
        const data = await response.json();
        counterValue.textContent = data.count.toLocaleString();
    } catch (error) {
        console.error('Failed to fetch counter:', error);
    }
}

function updateCounter(count) {
    counterValue.textContent = count.toLocaleString();
}

// Load counter on startup
fetchCounter();

// Download button handler - tracks downloads
downloadBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/track-download', {
            method: 'POST'
        });
        const data = await response.json();
        if (data.count) {
            updateCounter(data.count);
        }
    } catch (error) {
        console.error('Failed to track download:', error);
    }
});

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
    dropZone.style.display = 'none';
    preview.style.display = 'block';

    // Trigger live preview immediately
    updateLivePreview();
}

// Live preview function with debouncing
async function updateLivePreview() {
    if (!selectedFile) return;

    livePreview.innerHTML = '<div class="preview-loading">⏳ Converting...</div>';

    const params = getConversionParams();
    const formData = new FormData();
    formData.append('image', selectedFile);
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
        console.log('API Response:', data);

        if (response.ok && data.files && data.files.svg) {
            // Store the SVG URL for download
            lastConvertedSvgUrl = data.files.svg;
            console.log('Fetching SVG from:', data.files.svg);

            // Display SVG as an image - browser handles scaling automatically
            livePreview.innerHTML = `<img src="${data.files.svg}" alt="Vector Preview" style="max-width: 100%; max-height: 100%; width: auto; height: auto;">`;
        } else {
            console.error('Invalid response or missing SVG:', data);
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
    const value = parseInt(e.target.value);
    let label;
    if (value <= 3) label = 'Low';
    else if (value <= 7) label = 'Medium';
    else label = 'High';
    detailValue.textContent = label;
    debouncedLivePreview();
});

smoothness.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    let label;
    if (value <= 3) label = 'Sharp';
    else if (value <= 7) label = 'Medium';
    else label = 'Smooth';
    smoothnessValue.textContent = label;
    debouncedLivePreview();
});

contrast.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    let label;
    if (value <= 3) label = 'Dark';
    else if (value <= 7) label = 'Medium';
    else label = 'Light';
    contrastValue.textContent = label;
    debouncedLivePreview();
});

// Map simple sliders to technical parameters
function getConversionParams() {
    const detailValue = parseInt(detail.value);
    const smoothnessValue = parseInt(smoothness.value);
    const contrastValue = parseInt(contrast.value);

    // Map detail (1-10) to turdSize (20 to 1)
    // Lower values = less detail (larger turdSize = filter out small lines), Higher values = more detail (smaller turdSize)
    // Larger turdSize values eliminate small/thin lines
    let turdSize;
    if (detailValue <= 2) turdSize = 20;  // Very low detail - eliminate lots of small lines
    else if (detailValue <= 4) turdSize = 10;
    else if (detailValue <= 6) turdSize = 5;
    else if (detailValue <= 8) turdSize = 2;
    else turdSize = 1; // Maximum detail for values 9-10

    // Map smoothness (1-10) to optTolerance (0.1 to 0.4)
    // Lower values = sharper (less tolerance), Higher values = smoother (more tolerance)
    let optTolerance;
    if (smoothnessValue <= 3) optTolerance = 0.1;
    else if (smoothnessValue <= 7) optTolerance = 0.2;
    else optTolerance = 0.4;

    // Map contrast (1-10) to threshold (64 to 192)
    // Lower values = darker, Higher values = lighter
    const threshold = Math.round(64 + (contrastValue - 1) * (192 - 64) / 9);

    return {
        threshold,
        turdSize,
        optTolerance
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
    detail.value = 5;
    detailValue.textContent = 'Medium';
    smoothness.value = 5;
    smoothnessValue.textContent = 'Medium';
    contrast.value = 5;
    contrastValue.textContent = 'Medium';
}
