/**
 * Jersey Mesh Graphics Renderer
 * Handles multi-line varsity typography, concentric arched text,
 * athletic outlines, and real-time alpha perforated mesh punching.
 */

export const PRINT_SIZES = {
  'chest': {
    id: 'chest',
    name: 'Chest / Banner (10.95" × 5.95")',
    widthInches: 10.95,
    heightInches: 5.95,
    dpi: 300,
    exportWidth: 3285,
    exportHeight: 1785,
    previewWidth: 1095,
    previewHeight: 595
  },
  'full': {
    id: 'full',
    name: 'Full Front / Vertical (10.95" × 11.95")',
    widthInches: 10.95,
    heightInches: 11.95,
    dpi: 300,
    exportWidth: 3285,
    exportHeight: 3585,
    previewWidth: 1095,
    previewHeight: 1195
  }
};

/**
 * Renders the graphic to an offscreen canvas at the requested scale.
 * 
 * @param {Object} state - Application state
 * @param {boolean} isExport - True if rendering for 300 DPI export
 * @returns {HTMLCanvasElement}
 */
export function renderGraphic(state, isExport = false) {
  const sizeConfig = PRINT_SIZES[state.sizeOption] || PRINT_SIZES['chest'];
  
  const width = isExport ? sizeConfig.exportWidth : sizeConfig.previewWidth;
  const height = isExport ? sizeConfig.exportHeight : sizeConfig.previewHeight;
  
  // Scale multiplier relative to the 1095px base preview width
  const scale = width / sizeConfig.previewWidth;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.scale(scale, scale);

  const previewW = sizeConfig.previewWidth;
  const previewH = sizeConfig.previewHeight;
  const centerX = previewW / 2;
  const centerY = previewH / 2;

  // Split text into lines
  const rawText = state.text || ' ';
  const lines = rawText.split('\n');

  const fontSize = state.fontSize;
  const fontStr = `bold ${fontSize}px ${state.font}`;

  if (state.punchStroke) {
    // 1. Draw outline stroke if enabled
    if (state.strokeEnabled && state.strokeWidth > 0) {
      drawMultilineTypography(ctx, lines, centerX, centerY, state, {
        isStroke: true,
        color: state.strokeColor,
        strokeWidth: state.strokeWidth * 2
      });
    }

    // 2. Draw text fill
    drawMultilineTypography(ctx, lines, centerX, centerY, state, {
      isStroke: false,
      color: state.fillColor
    });

    // 3. Punch holes through everything
    applyJerseyMeshHoles(ctx, previewW, previewH, state);

  } else {
    // Solid outline: holes only punch through the text fill
    const fillCanvas = document.createElement('canvas');
    fillCanvas.width = width;
    fillCanvas.height = height;
    const fCtx = fillCanvas.getContext('2d');
    fCtx.save();
    fCtx.scale(scale, scale);

    // Draw fill on auxiliary canvas
    drawMultilineTypography(fCtx, lines, centerX, centerY, state, {
      isStroke: false,
      color: state.fillColor
    });

    // Punch holes in fill
    applyJerseyMeshHoles(fCtx, previewW, previewH, state);
    fCtx.restore();

    // Draw solid stroke on main canvas
    if (state.strokeEnabled && state.strokeWidth > 0) {
      drawMultilineTypography(ctx, lines, centerX, centerY, state, {
        isStroke: true,
        color: state.strokeColor,
        strokeWidth: state.strokeWidth * 2
      });
    }

    // Composite perforated fill
    ctx.drawImage(fillCanvas, 0, 0, previewW, previewH);
  }

  ctx.restore();
  return canvas;
}

/**
 * Returns the font size for a specific line index
 */
function getLineFontSize(state, lineIdx) {
  if (Array.isArray(state.lineFontSizes) && state.lineFontSizes[lineIdx] !== undefined) {
    const val = Number(state.lineFontSizes[lineIdx]);
    if (!isNaN(val) && val > 0) return val;
  }
  return Number(state.fontSize) || 105;
}

/**
 * Draws multiline text either straight or arched concentrically,
 * with independent per-line font sizes and automatic collision avoidance.
 */
function drawMultilineTypography(ctx, lines, centerX, centerY, state, options) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;

  if (options.isStroke) {
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.strokeWidth;
  } else {
    ctx.fillStyle = options.color;
  }

  const arcDegrees = state.arcAngle;
  const lineCount = lines.length;
  const lineHeightMult = state.lineHeightMultiplier || 1.15;

  // Determine font size and height allocation for each line
  const lineFontSizes = lines.map((_, idx) => getLineFontSize(state, idx));
  const lineHeights = lineFontSizes.map(size => size * lineHeightMult);

  // Calculate cumulative baseline offsets to prevent overlap with varying font sizes
  const lineYOffsets = [0];
  for (let i = 1; i < lineCount; i++) {
    const prevH = lineHeights[i - 1];
    const currH = lineHeights[i];
    lineYOffsets.push(lineYOffsets[i - 1] + (prevH + currH) / 2);
  }

  const totalVerticalSpan = lineYOffsets[lineCount - 1] || 0;
  const midVerticalOffset = totalVerticalSpan / 2;

  if (Math.abs(arcDegrees) < 1) {
    // ==========================================
    // STRAIGHT MULTI-LINE TYPOGRAPHY
    // ==========================================
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Measure each line using its specific font size
    const lineMetrics = lines.map((line, lineIdx) => {
      const fontSize = lineFontSizes[lineIdx];
      ctx.font = `bold ${fontSize}px ${state.font}`;
      const chars = line.split('');
      const charWidths = chars.map(c => ctx.measureText(c).width);
      const totalWidth = charWidths.reduce((a, b) => a + b, 0) + 
        Math.max(0, chars.length - 1) * state.letterSpacing;
      return { chars, charWidths, totalWidth, fontSize };
    });

    const maxLineWidth = Math.max(...lineMetrics.map(m => m.totalWidth), 0);
    const blockLeftX = centerX - (maxLineWidth / 2);

    lineMetrics.forEach((metric, lineIdx) => {
      ctx.font = `bold ${metric.fontSize}px ${state.font}`;
      const relY = lineYOffsets[lineIdx] - midVerticalOffset;
      const lineCenterY = centerY + relY;
      let currentX;

      if (state.textAlign === 'left') {
        currentX = blockLeftX;
      } else if (state.textAlign === 'right') {
        currentX = blockLeftX + maxLineWidth - metric.totalWidth;
      } else {
        // Default center
        currentX = centerX - (metric.totalWidth / 2);
      }

      metric.chars.forEach((char, charIdx) => {
        const charW = metric.charWidths[charIdx];
        const charCenter = currentX + (charW / 2);

        if (options.isStroke) {
          ctx.strokeText(char, charCenter, lineCenterY);
        } else {
          ctx.fillText(char, charCenter, lineCenterY);
        }

        currentX += charW + state.letterSpacing;
      });
    });

  } else {
    // ==========================================
    // CONCENTRIC ARCHED MULTI-LINE TYPOGRAPHY
    // ==========================================
    const isUpwardArch = arcDegrees > 0;
    const baseRadius = 650 * (45 / Math.abs(arcDegrees));

    // Center of curvature circle
    const arcCenterY = isUpwardArch 
      ? centerY + baseRadius 
      : centerY - baseRadius;

    lines.forEach((line, lineIdx) => {
      const chars = line.split('');
      if (chars.length === 0) return;

      const fontSize = lineFontSizes[lineIdx];
      ctx.font = `bold ${fontSize}px ${state.font}`;

      const charWidths = chars.map(c => ctx.measureText(c).width + state.letterSpacing);
      const totalLineWidth = charWidths.reduce((a, b) => a + b, 0);

      // Vertical offset from block center
      const relY = lineYOffsets[lineIdx] - midVerticalOffset;

      // Concentric radius calculation for this line
      const lineRadius = isUpwardArch 
        ? baseRadius - relY
        : baseRadius + relY;

      if (lineRadius <= 15) return; // Guard against singularity

      const totalAngle = totalLineWidth / lineRadius;
      // Start from -totalAngle / 2 (left) and advance to +totalAngle / 2 (right)
      let currentPhi = -(totalAngle / 2);

      chars.forEach((char, charIdx) => {
        const charW = charWidths[charIdx];
        const charAngle = charW / lineRadius;
        const midPhi = currentPhi + (charAngle / 2);

        ctx.save();
        // x is always relative to centerX: negative phi is left, positive phi is right
        const x = centerX + lineRadius * Math.sin(midPhi);
        // Upward arch apex is at the top (-R cos(phi)), inverted arch nadir is at bottom (+R cos(phi))
        const y = isUpwardArch 
          ? arcCenterY - lineRadius * Math.cos(midPhi)
          : arcCenterY + lineRadius * Math.cos(midPhi);

        ctx.translate(x, y);
        // Tangent rotation angle along the curve
        const rotationAngle = isUpwardArch ? midPhi : -midPhi;
        ctx.rotate(rotationAngle);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (options.isStroke) {
          ctx.strokeText(char, 0, 0);
        } else {
          ctx.fillText(char, 0, 0);
        }
        ctx.restore();

        currentPhi += charAngle;
      });
    });
  }

  ctx.restore();
}

/**
 * Cuts out 100% transparent jersey mesh perforations using destination-out
 */
function applyJerseyMeshHoles(ctx, width, height, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';

  const spacing = state.holeSpacing;
  const size = state.holeSize;
  const shape = state.shape;
  const pattern = state.pattern;

  const rows = Math.ceil(height / spacing) + 2;
  const cols = Math.ceil(width / spacing) + 2;

  ctx.beginPath();

  for (let r = -1; r < rows; r++) {
    const y = r * spacing;
    // Stagger every other row for athletic honeycomb jersey mesh
    const xOffset = (pattern === 'staggered' && (r % 2 !== 0)) ? spacing / 2 : 0;

    for (let c = -1; c < cols; c++) {
      const x = c * spacing + xOffset;

      if (shape === 'circle') {
        ctx.moveTo(x + size, y);
        ctx.arc(x, y, size, 0, Math.PI * 2);
      } else if (shape === 'pill') {
        const pillW = size * 0.9;
        const pillH = size * 1.8;
        ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, pillW / 2);
      }
    }
  }

  ctx.fill();
  ctx.restore();
}
