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
  invert: false
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
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

const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Upload Zone Events
uploadZone.addEventListener('click', () => fileInput.click());

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

// Load Image
function loadImage(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      generateAscii();
      updateBadge('Generated', 'success');
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
  updateBadge('Processing...', 'processing');
}

// Generate ASCII Art
function generateAscii() {
  if (!currentImage) return;

  const charset = CHARSETS[settings.charset];
  const targetWidth = settings.width;

  // Calculate dimensions maintaining aspect ratio
  const aspectRatio = currentImage.height / currentImage.width;
  const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5); // 0.5 to account for character height

  // Set canvas size and draw image
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);

  // Get image data
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data;

  let ascii = '';

  // Convert pixels to ASCII
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const offset = (y * targetWidth + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];

      // Calculate brightness (0-255)
      let brightness = (r + g + b) / 3;

      // Apply contrast
      brightness = ((brightness / 255 - 0.5) * settings.contrast + 0.5) * 255;
      brightness = Math.max(0, Math.min(255, brightness));

      // Invert if needed
      if (settings.invert) {
        brightness = 255 - brightness;
      }

      // Map brightness to character
      const charIndex = Math.floor((brightness / 255) * (charset.length - 1));
      ascii += charset[charIndex];
    }
    ascii += '\n';
  }

  asciiOutput.textContent = ascii;
  scaleAsciiOutput();
}

// Scale ASCII Output to fit viewport
function scaleAsciiOutput() {
  const container = document.querySelector('.output-container');
  const output = asciiOutput;

  if (!output.textContent || output.textContent === 'Your ASCII art will appear here...') {
    return;
  }

  // Get the ASCII content dimensions
  const lines = output.textContent.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  const lineCount = lines.length;

  // Get container dimensions
  const containerWidth = container.clientWidth - 32; // Account for padding
  const containerHeight = container.clientHeight - 32;

  // Calculate optimal font size based on content
  // Character width is approximately 0.6 * font-size for monospace fonts
  const fontSizeByWidth = containerWidth / (maxLineLength * 0.6);
  // Line height is approximately 1.2 * font-size
  const fontSizeByHeight = containerHeight / (lineCount * 1.2);

  // Use the smaller of the two to ensure it fits both dimensions
  const optimalFontSize = Math.min(fontSizeByWidth, fontSizeByHeight);

  // Clamp between reasonable min and max values
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

// Show Notification (simple visual feedback)
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

// Add notification animations to style
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
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

// Prevent FOUC - show app after everything loads
window.addEventListener('load', () => {
  document.getElementById('app').classList.add('loaded');
});

console.log('🎨 ASCII Art Generator loaded successfully!');
