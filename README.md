# JerseyGraphics Studio 

> **Athletic Perforated Typography & 300 DPI Transparent PNG Generator**  
> Designed for Direct-to-Film (DTF), Direct-to-Garment (DTG), and Sublimation Apparel Printing.

JerseyGraphics Studio is a lightweight web application that creates authentic jersey-style perforated mesh text graphics. It renders athletic collegiate typography with customizable varsity borders and physically punches 100% transparent alpha holes through the design—allowing the underlying fabric color to show through naturally when pressed onto a garment.

---

## 🌟 Key Features

- **True 300 DPI Ultra-High Resolution Output**:
  - Automatically calculates physical print dimensions at 300 DPI.
  - Injects the standard PNG `pHYs` metadata chunk (11,811 pixels/meter = 300 DPI) so software such as Adobe Photoshop, Illustrator, CorelDRAW, and DTF RIP software immediately recognize the physical inch dimensions upon import.
- **Two Standard Print Size Formats**:
  - **Chest / Banner**: `10.95" × 5.95"` (3,285 × 1,785 pixels @ 300 DPI)
  - **Full Front / Vertical**: `10.95" × 11.95"` (3,285 × 3,585 pixels @ 300 DPI)
- **Visual Print Boundary Guidelines**:
  - Exact outer bounding box outline with corner registration crop marks.
  - Live dimension badge displaying inches and pixel counts to help adjust font size, letter spacing, and line spacing to fit within the designated garment print area.
- **Multi-Line Varsity Typography with Per-Line Sizing**:
  - **Independent Per-Line Font Sizing**: Adjust font size for each line on the shirt individually, with support up to **1000px**.
  - **Typed & Slider Controls**: Every numeric sizing control (font size, letter spacing, line height, curve angle, outline thickness, mesh hole size/spacing) features both a smooth slider and a direct **typeable number input** with real-time bi-directional synchronization.
  - Multi-line text support with customizable line spacing / leading.
  - Text alignment controls: **Left**, **Center**, and **Right**.
  - **Concentric Arched Text Curve**: Arcs each line of text concentrically along a varsity curve (-45° inverted to +45° arch) with automated vertical collision avoidance across varying line font sizes.
  - Quick uppercase converter button (`Aa → AA`).
- **Full Custom Color Pickers**:
  - **Main Color (Text Fill)**: Interactive color picker, hex input, screen eye dropper tool, and classic varsity team swatches.
  - **Secondary Color (Outline / Stroke)**: Toggleable border, thickness slider (1–50 px with typed input), custom color picker, and optional "Punch holes through outline too" setting.
  - **Mock Garment Fabric Simulator**: Realistic preview on **Heather Dark fabric**, **Red fabric**, **Blue fabric**, **White fabric**, or any **Custom Fabric Color** via the dedicated garment color picker.
- **Perforated Jersey Mesh Control**:
  - **Honeycomb / Staggered** vs. **Regular Grid** arrangement.
  - **Circle Eyelets** vs. **Athletic Pill / Oval** hole geometry.
  - Sliders + direct typed inputs for hole size (1–20 px) and hole spacing (4–50 px).
  - Fixed horizontal perforation orientation (0°).
  - 100% alpha transparency cutouts (`destination-out`).

---


## 💻 Running Locally

To run the app locally on your machine:

1. Clone or download this repository.
2. Because this project uses ES6 JavaScript modules (`import` / `export`), serve the folder using any local HTTP server:
   ```bash
   # Using Python 3:
   python3 -m http.server 8000

   # Or using Node.js:
   npx serve .
   ```
3. Open `http://localhost:8000` in your web browser.

---

## 📁 Project Structure

```text
jersey-graphics/
├── index.html            # Main semantic application layout and markup
├── css/
│   └── style.css         # Dark theme varsity design system, layout, and components
├── js/
│   ├── app.js            # Application state management, event listeners, and UI bindings
│   ├── renderer.js       # Offscreen 2D canvas engine, multiline concentric arching, and mesh holes
│   └── png-metadata.js   # CRC-32 calculator and PNG pHYs chunk injector for 300 DPI
└── README.md             # Project documentation and specifications
```

---

## 🖨️ Print Specifications Reference

| Print Preset | Physical Inches | Width (px) | Height (px) | Resolution | Color Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chest / Banner** | 10.95" × 5.95" | 3,285 px | 1,785 px | 300 DPI | 32-bit RGBA (Alpha) |
| **Full Front** | 10.95" × 11.95" | 3,285 px | 3,585 px | 300 DPI | 32-bit RGBA (Alpha) |

---

## 📄 License

MIT License. Free for personal and commercial apparel printing projects.
