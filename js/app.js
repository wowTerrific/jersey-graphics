import { renderGraphic, PRINT_SIZES } from './renderer.js';
import { injectDpiIntoPng } from './png-metadata.js';

// Application State
const state = {
  text: 'VARSITY\nCHAMPIONS',
  font: "'Graduate', serif",
  fontSize: 105,
  lineFontSizes: [105, 105], // Per-line font sizes (up to 350px)
  letterSpacing: 6,
  lineHeightMultiplier: 1.15,
  textAlign: 'center', // 'left' | 'center' | 'right'
  arcAngle: 0, // -45 to +45 degrees

  // Colors
  fillColor: '#F59E0B',
  strokeEnabled: true,
  strokeColor: '#FFFFFF',
  strokeWidth: 8,
  punchStroke: true,

  // Mesh punch filter
  pattern: 'staggered', // 'staggered' | 'grid'
  shape: 'pill', // 'pill' | 'circle'
  holeSize: 4.5,
  holeSpacing: 14,
  // Note: meshAngle removed per requirements, fixed at 0 degrees

  // Canvas Print Specifications
  sizeOption: 'chest', // 'chest' (10.95" x 5.95") | 'full' (10.95" x 11.95")

  // Mock Garment Background
  garmentMode: 'checkerboard', // 'checkerboard' | 'heather' | 'red' | 'blue' | 'white' | 'custom'
  garmentCustomColor: '#1E293B',

  // UI state
  showBoundaryGuides: true
};

// DOM References
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const stageContainer = document.getElementById('viewport-stage');
const canvasWrapper = document.getElementById('canvas-wrapper');
const boundaryLabel = document.getElementById('boundary-dimension-label');
const boundaryPixelLabel = document.getElementById('boundary-pixel-label');

// Text inputs
const inputText = document.getElementById('input-text');
const btnUppercase = document.getElementById('btn-uppercase-toggle');
const lineFontContainer = document.getElementById('line-font-sizes-container');

// Size selector buttons
const sizeButtons = document.querySelectorAll('.size-select-btn');

// Text alignment buttons
const alignButtons = document.querySelectorAll('.align-btn');

// Stroke controls
const inputStrokeEnabled = document.getElementById('input-stroke-enabled');
const strokeOptionsContainer = document.getElementById('stroke-options-container');
const inputStrokeWidth = document.getElementById('input-stroke-width');
const labelStrokeWidth = document.getElementById('label-stroke-width');
const inputPunchStroke = document.getElementById('input-punch-stroke');

// Mesh controls
const inputHoleSize = document.getElementById('input-hole-size');
const labelHoleSize = document.getElementById('label-hole-size');
const inputHoleSpacing = document.getElementById('input-hole-spacing');
const labelHoleSpacing = document.getElementById('label-hole-spacing');
const patternButtons = document.querySelectorAll('.pattern-btn');
const shapeButtons = document.querySelectorAll('.shape-btn');

// Export & Feedback
const btnExportMain = document.getElementById('btn-export-main');
const btnExportQuick = document.getElementById('btn-export-quick');
const exportBadge = document.getElementById('export-spec-badge');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

/**
 * Updates the live preview on screen
 */
export function updatePreview() {
  const currentSize = PRINT_SIZES[state.sizeOption];
  const rendered = renderGraphic(state, false);

  canvas.width = rendered.width;
  canvas.height = rendered.height;

  // Clear preview canvas and copy rendered frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(rendered, 0, 0);

  // Update canvas aspect ratio container styling
  const aspect = currentSize.previewWidth / currentSize.previewHeight;
  canvasWrapper.style.aspectRatio = `${aspect}`;

  // Update dimension badges
  if (boundaryLabel) {
    boundaryLabel.textContent = `${currentSize.widthInches}″ × ${currentSize.heightInches}″`;
  }
  if (boundaryPixelLabel) {
    boundaryPixelLabel.textContent = `${currentSize.exportWidth.toLocaleString()} × ${currentSize.exportHeight.toLocaleString()} px @ 300 DPI`;
  }
  if (exportBadge) {
    exportBadge.textContent = `${currentSize.name} — 300 DPI`;
  }
}

/**
 * Initializes and binds color pickers for fill, outline, and custom garment
 */
function initColorControls() {
  // 1. Main Text Fill Color
  setupColorPicker({
    btnId: 'btn-picker-fill',
    inputColorId: 'input-color-fill',
    inputHexId: 'input-color-fill-hex',
    presetClass: 'preset-fill-btn',
    eyeDropperId: 'eyedropper-fill',
    initialColor: state.fillColor,
    onChange: (hex) => {
      state.fillColor = hex;
      updatePreview();
    }
  });

  // 2. Secondary Outline / Stroke Color
  setupColorPicker({
    btnId: 'btn-picker-stroke',
    inputColorId: 'input-color-stroke',
    inputHexId: 'input-color-stroke-hex',
    presetClass: 'preset-stroke-btn',
    eyeDropperId: 'eyedropper-stroke',
    initialColor: state.strokeColor,
    onChange: (hex) => {
      state.strokeColor = hex;
      updatePreview();
    }
  });

  // 3. Mock Garment Custom Fabric Color
  setupColorPicker({
    btnId: 'btn-picker-garment',
    inputColorId: 'input-color-garment',
    inputHexId: 'input-color-garment-hex',
    presetClass: null,
    eyeDropperId: 'eyedropper-garment',
    initialColor: state.garmentCustomColor,
    onChange: (hex) => {
      state.garmentCustomColor = hex;
      setGarmentMode('custom');
    }
  });
}

/**
 * Generic color picker wire-up supporting native color picker, hex typing,
 * custom swatch clicks, and HTML5 EyeDropper API where supported.
 */
function setupColorPicker({ btnId, inputColorId, inputHexId, presetClass, eyeDropperId, initialColor, onChange }) {
  const btn = document.getElementById(btnId);
  const inputColor = document.getElementById(inputColorId);
  const inputHex = document.getElementById(inputHexId);
  const eyeDropperBtn = eyeDropperId ? document.getElementById(eyeDropperId) : null;

  function updateColor(color) {
    let cleanHex = color.trim();
    if (!cleanHex.startsWith('#')) cleanHex = '#' + cleanHex;
    if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) return;

    cleanHex = cleanHex.toUpperCase();
    if (inputColor) inputColor.value = cleanHex;
    if (inputHex) inputHex.value = cleanHex;
    if (btn) {
      const swatch = btn.querySelector('.color-preview-swatch');
      if (swatch) swatch.style.backgroundColor = cleanHex;
    }
    onChange(cleanHex);
  }

  // Trigger native color input or showPicker when swatch container clicked
  if (btn && inputColor) {
    btn.addEventListener('click', (e) => {
      if (e.target === inputColor) return;
      if (typeof inputColor.showPicker === 'function') {
        try {
          inputColor.showPicker();
          e.preventDefault();
          return;
        } catch (_) {}
      }
      inputColor.click();
    });
  }

  if (inputColor) {
    inputColor.addEventListener('input', (e) => {
      updateColor(e.target.value);
    });
    inputColor.addEventListener('change', (e) => {
      updateColor(e.target.value);
    });
  }

  if (inputHex) {
    inputHex.addEventListener('input', (e) => {
      if (/^#?[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
        updateColor(e.target.value);
      }
    });
    inputHex.addEventListener('blur', (e) => {
      updateColor(e.target.value);
    });
  }

  if (presetClass) {
    document.querySelectorAll(`.${presetClass}`).forEach(presetBtn => {
      presetBtn.addEventListener('click', () => {
        const color = presetBtn.getAttribute('data-color');
        if (color) updateColor(color);
      });
    });
  }

  // EyeDropper API check
  if (eyeDropperBtn) {
    if ('EyeDropper' in window) {
      eyeDropperBtn.addEventListener('click', async () => {
        try {
          const eyeDropper = new window.EyeDropper();
          const result = await eyeDropper.open();
          if (result && result.sRGBHex) {
            updateColor(result.sRGBHex);
          }
        } catch (e) {
          // User canceled eye dropper selection, ignore
        }
      });
    } else {
      eyeDropperBtn.style.display = 'none';
    }
  }

  updateColor(initialColor);
}

/**
 * Updates stage mock garment preview background
 */
function setGarmentMode(mode) {
  state.garmentMode = mode;

  // Reset active classes on garment buttons
  document.querySelectorAll('.garment-mode-btn').forEach(b => {
    b.classList.remove('active-garment');
  });

  const activeBtn = document.querySelector(`.garment-mode-btn[data-mode="${mode}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active-garment');
  }

  // Reset stage classes and custom inline style
  stageContainer.classList.remove(
    'checkerboard-bg',
    'preview-heather-dark',
    'preview-red-fabric',
    'preview-blue-fabric',
    'preview-white-fabric',
    'preview-custom-fabric'
  );
  stageContainer.style.backgroundColor = '';

  if (mode === 'checkerboard') {
    stageContainer.classList.add('checkerboard-bg');
  } else if (mode === 'heather') {
    stageContainer.classList.add('preview-heather-dark');
  } else if (mode === 'red') {
    stageContainer.classList.add('preview-red-fabric');
  } else if (mode === 'blue') {
    stageContainer.classList.add('preview-blue-fabric');
  } else if (mode === 'white') {
    stageContainer.classList.add('preview-white-fabric');
  } else if (mode === 'custom') {
    stageContainer.classList.add('preview-custom-fabric');
    stageContainer.style.backgroundColor = state.garmentCustomColor;
  }
}

/**
 * Helper to bi-directionally sync a range slider with a typed number input
 */
function bindSliderAndNumber({ sliderId, numberId, labelId, min, max, formatLabel, onValueChange }) {
  const slider = document.getElementById(sliderId);
  const numInput = document.getElementById(numberId);
  const label = labelId ? document.getElementById(labelId) : null;

  function sync(val, source) {
    let num = parseFloat(val);
    if (isNaN(num)) return;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;

    if (source !== 'slider' && slider && Number(slider.value) !== num) {
      slider.value = num;
    }
    if (source !== 'number' && numInput && Number(numInput.value) !== num) {
      numInput.value = num;
    }
    if (label && formatLabel) {
      label.textContent = formatLabel(num);
    }

    onValueChange(num);
  }

  if (slider) {
    slider.addEventListener('input', (e) => sync(e.target.value, 'slider'));
  }
  if (numInput) {
    numInput.addEventListener('input', (e) => {
      if (e.target.value.trim() !== '') {
        sync(e.target.value, 'number');
      }
    });
    numInput.addEventListener('change', (e) => sync(e.target.value, 'number'));
  }
}

/**
 * Generates and synchronizes per-line font-size controls (slider + number input up to 350px)
 */
function renderLineFontSizeControls() {
  if (!lineFontContainer) return;
  const rawText = state.text || '';
  const lines = rawText.split('\n');

  if (!Array.isArray(state.lineFontSizes)) {
    state.lineFontSizes = [];
  }
  while (state.lineFontSizes.length < lines.length) {
    const prev = state.lineFontSizes[state.lineFontSizes.length - 1] || state.fontSize || 105;
    state.lineFontSizes.push(prev);
  }
  if (state.lineFontSizes.length > lines.length) {
    state.lineFontSizes.length = lines.length;
  }

  lineFontContainer.innerHTML = '';

  lines.forEach((lineText, idx) => {
    const size = state.lineFontSizes[idx] || 105;

    const card = document.createElement('div');
    card.className = 'line-font-card';

    const header = document.createElement('div');
    header.className = 'line-font-header';

    const badge = document.createElement('div');
    badge.className = 'line-font-badge';
    badge.innerHTML = `<i data-lucide="type" style="width: 12px; height: 12px;"></i> Line ${idx + 1}`;

    const preview = document.createElement('span');
    preview.className = 'line-font-preview';
    const displaySnippet = lineText.trim() ? `"${lineText}"` : '(blank line)';
    preview.textContent = displaySnippet;

    header.appendChild(badge);
    header.appendChild(preview);

    const row = document.createElement('div');
    row.className = 'slider-number-row';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '20';
    slider.max = '350';
    slider.value = `${size}`;
    slider.id = `input-line-font-${idx}`;

    const numWrapper = document.createElement('div');
    numWrapper.className = 'number-unit-wrapper';

    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.className = 'form-input-number';
    numInput.min = '20';
    numInput.max = '350';
    numInput.value = `${size}`;
    numInput.id = `num-line-font-${idx}`;

    const unitTag = document.createElement('span');
    unitTag.className = 'input-unit-tag';
    unitTag.textContent = 'px';

    numWrapper.appendChild(numInput);
    numWrapper.appendChild(unitTag);

    row.appendChild(slider);
    row.appendChild(numWrapper);

    card.appendChild(header);
    card.appendChild(row);
    lineFontContainer.appendChild(card);

    function handleSizeChange(val, source) {
      let n = parseInt(val, 10);
      if (isNaN(n)) return;
      if (n < 20) n = 20;
      if (n > 350) n = 350;

      state.lineFontSizes[idx] = n;
      if (source !== 'slider') slider.value = `${n}`;
      if (source !== 'number') numInput.value = `${n}`;

      updatePreview();
    }

    slider.addEventListener('input', (e) => handleSizeChange(e.target.value, 'slider'));
    numInput.addEventListener('input', (e) => {
      if (e.target.value.trim() !== '') {
        handleSizeChange(e.target.value, 'number');
      }
    });
    numInput.addEventListener('change', (e) => handleSizeChange(e.target.value, 'number'));
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Wires up UI event listeners
 */
function setupEventListeners() {
  // 1. Text input & formatting
  inputText.addEventListener('input', (e) => {
    state.text = e.target.value;
    renderLineFontSizeControls();
    updatePreview();
  });

  btnUppercase.addEventListener('click', () => {
    state.text = state.text.toUpperCase();
    inputText.value = state.text;
    renderLineFontSizeControls();
    updatePreview();
  });

  // Alignment buttons
  alignButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      alignButtons.forEach(b => b.classList.remove('active-btn-tab'));
      btn.classList.add('active-btn-tab');
      state.textAlign = btn.getAttribute('data-align') || 'center';
      updatePreview();
    });
  });

  // Size option switch (10.95" x 5.95" vs 10.95" x 11.95")
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('active-size-btn'));
      btn.classList.add('active-size-btn');
      state.sizeOption = btn.getAttribute('data-size');
      updatePreview();
    });
  });

  // Arc slider + typed number input
  bindSliderAndNumber({
    sliderId: 'input-arc',
    numberId: 'num-arc',
    labelId: 'label-arc-val',
    min: -45,
    max: 45,
    formatLabel: (val) => val === 0 ? '0° (Flat)' : `${val > 0 ? '+' : ''}${val}° ${val > 0 ? 'Arch' : 'Inverted'}`,
    onValueChange: (val) => {
      state.arcAngle = val;
      updatePreview();
    }
  });

  // Letter spacing slider + typed number input
  bindSliderAndNumber({
    sliderId: 'input-letter-spacing',
    numberId: 'num-letter-spacing',
    labelId: 'label-letter-spacing',
    min: 0,
    max: 60,
    formatLabel: (val) => `${val}px`,
    onValueChange: (val) => {
      state.letterSpacing = val;
      updatePreview();
    }
  });

  // Line spacing slider + typed number input
  bindSliderAndNumber({
    sliderId: 'input-line-height',
    numberId: 'num-line-height',
    labelId: 'label-line-height',
    min: 0.5,
    max: 2.5,
    formatLabel: (val) => `${val.toFixed(2)}×`,
    onValueChange: (val) => {
      state.lineHeightMultiplier = val;
      updatePreview();
    }
  });

  // Athletic font buttons
  const fontButtons = document.querySelectorAll('.font-select-btn');
  fontButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      fontButtons.forEach(b => b.classList.remove('active-font-btn'));
      btn.classList.add('active-font-btn');
      state.font = btn.getAttribute('data-font');
      updatePreview();
    });
  });

  // Stroke controls
  inputStrokeEnabled.addEventListener('change', (e) => {
    state.strokeEnabled = e.target.checked;
    strokeOptionsContainer.style.opacity = state.strokeEnabled ? '1' : '0.4';
    strokeOptionsContainer.style.pointerEvents = state.strokeEnabled ? 'auto' : 'none';
    updatePreview();
  });

  bindSliderAndNumber({
    sliderId: 'input-stroke-width',
    numberId: 'num-stroke-width',
    labelId: 'label-stroke-width',
    min: 1,
    max: 50,
    formatLabel: (val) => `${val}px`,
    onValueChange: (val) => {
      state.strokeWidth = val;
      updatePreview();
    }
  });

  inputPunchStroke.addEventListener('change', (e) => {
    state.punchStroke = e.target.checked;
    updatePreview();
  });

  // Mesh hole geometry & layout with typed number inputs
  bindSliderAndNumber({
    sliderId: 'input-hole-size',
    numberId: 'num-hole-size',
    labelId: 'label-hole-size',
    min: 1,
    max: 20,
    formatLabel: (val) => `${val}px`,
    onValueChange: (val) => {
      state.holeSize = val;
      updatePreview();
    }
  });

  bindSliderAndNumber({
    sliderId: 'input-hole-spacing',
    numberId: 'num-hole-spacing',
    labelId: 'label-hole-spacing',
    min: 4,
    max: 50,
    formatLabel: (val) => `${val}px`,
    onValueChange: (val) => {
      state.holeSpacing = val;
      updatePreview();
    }
  });

  patternButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      patternButtons.forEach(b => b.classList.remove('active-btn-tab'));
      btn.classList.add('active-btn-tab');
      state.pattern = btn.getAttribute('data-pattern');
      updatePreview();
    });
  });

  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeButtons.forEach(b => b.classList.remove('active-btn-tab'));
      btn.classList.add('active-btn-tab');
      state.shape = btn.getAttribute('data-shape');
      updatePreview();
    });
  });

  // Garment simulator preset buttons
  document.querySelectorAll('.garment-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode) setGarmentMode(mode);
    });
  });

  // Export buttons
  btnExportMain.addEventListener('click', execute300DpiExport);
  if (btnExportQuick) {
    btnExportQuick.addEventListener('click', execute300DpiExport);
  }
}

/**
 * Renders full 300 DPI canvas, injects pHYs metadata, and downloads transparent PNG
 */
async function execute300DpiExport() {
  const currentSize = PRINT_SIZES[state.sizeOption];
  showToast(`Rendering 300 DPI master canvas (${currentSize.exportWidth} × ${currentSize.exportHeight} px)...`);

  // Small delay to let browser paint toast
  await new Promise(r => setTimeout(r, 60));

  try {
    // 1. Render true high-res 300 DPI canvas
    const exportCanvas = renderGraphic(state, true);

    // 2. Convert to raw PNG blob
    exportCanvas.toBlob(async (rawBlob) => {
      if (!rawBlob) {
        showToast('Export failed: Canvas buffer error');
        return;
      }

      try {
        // 3. Inject 300 DPI pHYs chunk into PNG binary
        const arrayBuffer = await rawBlob.arrayBuffer();
        const dpiBuffered = injectDpiIntoPng(arrayBuffer, 300);
        const finalBlob = new Blob([dpiBuffered], { type: 'image/png' });

        // 4. Download file
        const firstLine = (state.text || 'jersey').split('\n')[0].trim();
        const sanitized = firstLine.toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0, 20) || 'jersey';
        const filename = `${sanitized}_${currentSize.id}_${exportCanvas.width}x${exportCanvas.height}_300dpi.png`;

        const downloadUrl = URL.createObjectURL(finalBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        showToast(`Downloaded: ${filename} (300 DPI Transparent PNG)`);
      } catch (err) {
        console.error('DPI Injection error, falling back to direct blob:', err);
        const downloadUrl = URL.createObjectURL(rawBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `jersey_mesh_300dpi.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        showToast('Exported PNG (300 DPI direct canvas)');
      }
    }, 'image/png');

  } catch (err) {
    console.error('Rendering error:', err);
    showToast('Render error: See console log');
  }
}

/**
 * Toast Notification Helper
 */
function showToast(msg) {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = msg;
  toast.classList.add('toast-visible');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 3500);
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initColorControls();
  setupEventListeners();
  renderLineFontSizeControls();

  // Load custom fonts before initial canvas draw
  document.fonts.ready.then(() => {
    updatePreview();
  });
});
