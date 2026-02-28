import './style.css'

// Character sets for ASCII conversion
const CHARSETS = {
  standard: '@%#*+=-:. ',
  extended: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  blocks: '█▓▒░ ',
  simple: '# .'
};

// State
let currentImage = null;
let settings = {
  width: 100,
  charset: 'standard',
  contrast: 1.0,
  invert: false,
  color: false
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const uploadContent = document.querySelector('.upload-content');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const changeImageBtn = document.getElementById('changeImageBtn');
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const asciiOutput = document.getElementById('asciiOutput');
const outputBadge = document.getElementById('outputBadge');

const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const charsetSelect = document.getElementById('charsetSelect');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValue = document.getElementById('contrastValue');
const invertCheckbox = document.getElementById('invertCheckbox');
const colorCheckbox = document.getElementById('colorCheckbox');

const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');

const controlsSection = document.getElementById('controlsSection');

// Disable controls until an image is loaded
function setControlsEnabled(enabled) {
  const controls = controlsSection.querySelectorAll('input, select, button');
  controls.forEach(el => el.disabled = !enabled);
  controlsSection.classList.toggle('disabled', !enabled);
}
setControlsEnabled(false);

// Upload Zone Events
uploadZone.addEventListener('click', (e) => {
  if (e.target === changeImageBtn || changeImageBtn.contains(e.target)) return;
  fileInput.click();
});

changeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadImage(file);
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    loadImage(file);
  }
});

// Paste from clipboard (Ctrl+V)
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) loadImage(file);
      return;
    }
  }
});

// Control Events
widthSlider.addEventListener('input', (e) => {
  settings.width = parseInt(e.target.value);
  widthValue.textContent = settings.width;
  if (currentImage) generateAscii();
});

charsetSelect.addEventListener('change', (e) => {
  settings.charset = e.target.value;
  if (currentImage) generateAscii();
});

contrastSlider.addEventListener('input', (e) => {
  settings.contrast = parseFloat(e.target.value);
  contrastValue.textContent = settings.contrast.toFixed(1);
  if (currentImage) generateAscii();
});

invertCheckbox.addEventListener('change', (e) => {
  settings.invert = e.target.checked;
  if (currentImage) generateAscii();
});

colorCheckbox.addEventListener('change', (e) => {
  settings.color = e.target.checked;
  if (currentImage) generateAscii();
});

// Button Events
copyBtn.addEventListener('click', async () => {
  const text = asciiOutput.textContent;
  if (text && text !== 'Your ASCII art will appear here...') {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy', 'error');
    }
  }
});

downloadBtn.addEventListener('click', () => {
  const text = asciiOutput.textContent;
  if (text && text !== 'Your ASCII art will appear here...') {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.txt';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Downloaded!');
  }
});

downloadPngBtn.addEventListener('click', () => {
  if (!currentImage) return;
  exportAsPng();
});

// Load Image
function loadImage(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      showImagePreview(e.target.result, file.name);
      setControlsEnabled(true);
      generateAscii();
      updateBadge('Generated', 'success');
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
  updateBadge('Processing...', 'processing');
}

// Show image preview in upload zone
function showImagePreview(src, name) {
  previewImg.src = src;
  previewName.textContent = name || 'Pasted image';
  uploadContent.classList.add('hidden');
  imagePreview.classList.add('visible');
}

// Generate ASCII Art
function generateAscii() {
  if (!currentImage) return;

  const charset = CHARSETS[settings.charset];
  const targetWidth = settings.width;

  // Calculate dimensions maintaining aspect ratio
  const aspectRatio = currentImage.height / currentImage.width;
  const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5);

  // Set canvas size and draw image
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);

  // Get image data
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data;

  if (settings.color) {
    generateColorAscii(charset, pixels, targetWidth, targetHeight);
  } else {
    generatePlainAscii(charset, pixels, targetWidth, targetHeight);
  }

  scaleAsciiOutput();
}

function generatePlainAscii(charset, pixels, width, height) {
  let ascii = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];

      let brightness = luminance(r, g, b);
      brightness = applyContrast(brightness);
      if (settings.invert) brightness = 255 - brightness;

      const charIndex = Math.floor((brightness / 255) * (charset.length - 1));
      ascii += charset[charIndex];
    }
    ascii += '\n';
  }

  asciiOutput.innerHTML = '';
  asciiOutput.textContent = ascii;
}

function generateColorAscii(charset, pixels, width, height) {
  const fragment = document.createDocumentFragment();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];

      let brightness = luminance(r, g, b);
      brightness = applyContrast(brightness);

      let charBrightness = brightness;
      if (settings.invert) charBrightness = 255 - charBrightness;

      const charIndex = Math.floor((charBrightness / 255) * (charset.length - 1));
      const char = charset[charIndex];

      const span = document.createElement('span');
      span.textContent = char;
      span.style.color = `rgb(${r},${g},${b})`;
      fragment.appendChild(span);
    }
    fragment.appendChild(document.createTextNode('\n'));
  }

  asciiOutput.textContent = '';
  asciiOutput.appendChild(fragment);
}

// Perceptual luminance (ITU-R BT.601)
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function applyContrast(brightness) {
  brightness = ((brightness / 255 - 0.5) * settings.contrast + 0.5) * 255;
  return Math.max(0, Math.min(255, brightness));
}

// Export ASCII art as PNG
function exportAsPng() {
  const output = asciiOutput;
  const text = output.textContent;
  if (!text || text === 'Your ASCII art will appear here...') return;

  const lines = text.split('\n').filter(l => l.length > 0);
  const fontSize = 10;
  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize * 1.2;
  const padding = 20;

  const maxLineLen = Math.max(...lines.map(l => l.length));
  const pngCanvas = document.createElement('canvas');
  pngCanvas.width = Math.ceil(maxLineLen * charWidth) + padding * 2;
  pngCanvas.height = Math.ceil(lines.length * lineHeight) + padding * 2;

  const pngCtx = pngCanvas.getContext('2d');
  pngCtx.fillStyle = '#0a0e27';
  pngCtx.fillRect(0, 0, pngCanvas.width, pngCanvas.height);
  pngCtx.font = `${fontSize}px "JetBrains Mono", "Courier New", monospace`;
  pngCtx.textBaseline = 'top';

  if (settings.color) {
    // Re-render from image data to get colors
    const charset = CHARSETS[settings.charset];
    const targetWidth = settings.width;
    const aspectRatio = currentImage.height / currentImage.width;
    const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imageData.data;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const offset = (y * targetWidth + x) * 4;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];

        let brightness = luminance(r, g, b);
        brightness = applyContrast(brightness);
        let charBrightness = brightness;
        if (settings.invert) charBrightness = 255 - charBrightness;

        const charIndex = Math.floor((charBrightness / 255) * (charset.length - 1));
        const char = charset[charIndex];

        pngCtx.fillStyle = `rgb(${r},${g},${b})`;
        pngCtx.fillText(char, padding + x * charWidth, padding + y * lineHeight);
      }
    }
  } else {
    pngCtx.fillStyle = '#e4e7f5';
    lines.forEach((line, i) => {
      pngCtx.fillText(line, padding, padding + i * lineHeight);
    });
  }

  pngCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.png';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('PNG downloaded!');
  });
}

// Scale ASCII Output to fit viewport
function scaleAsciiOutput() {
  const container = document.querySelector('.output-container');
  const output = asciiOutput;

  if (!output.textContent || output.textContent === 'Your ASCII art will appear here...') {
    return;
  }

  const lines = output.textContent.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  const lineCount = lines.length;

  const containerWidth = container.clientWidth - 32;
  const containerHeight = container.clientHeight - 32;

  const fontSizeByWidth = containerWidth / (maxLineLength * 0.6);
  const fontSizeByHeight = containerHeight / (lineCount * 1.2);

  const optimalFontSize = Math.min(fontSizeByWidth, fontSizeByHeight);
  const finalFontSize = Math.max(4, Math.min(20, optimalFontSize));

  output.style.fontSize = `${finalFontSize}px`;
}

// Update Badge
function updateBadge(text, status = 'ready') {
  outputBadge.textContent = text;
  outputBadge.className = 'output-badge';

  if (status === 'processing') {
    outputBadge.classList.add('processing');
    outputBadge.style.background = 'rgba(245, 158, 11, 0.2)';
    outputBadge.style.color = '#f59e0b';
  } else if (status === 'success') {
    outputBadge.style.background = 'rgba(16, 185, 129, 0.2)';
    outputBadge.style.color = '#10b981';
  } else {
    outputBadge.style.background = 'rgba(102, 126, 234, 0.2)';
    outputBadge.style.color = '#667eea';
  }
}

// Show Notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)'};
    color: white;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Rescale ASCII output on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (currentImage) {
      scaleAsciiOutput();
    }
  }, 150);
});

// Prevent FOUC
window.addEventListener('load', () => {
  document.getElementById('app').classList.add('loaded');
});
