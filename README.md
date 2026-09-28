# ScamGuard 🛡️

A privacy-first, client-side digital safety assistant designed to help elderly citizens identify and avoid scams, fraud, and suspicious messages instantly.

**🔗 Live Demo:** [https://sanjaytechhub.github.io/Scam-Guard/](https://sanjaytechhub.github.io/Scam-Guard/)

## 📌 Problem Statement
Elderly citizens are increasingly becoming targets of cyber frauds like fake KYC alerts, electricity bill scams, digital arrests, and reward QR codes. They often lack the technical knowledge to identify these threats, and existing tools are too complex for them to use.

## 💡 Our Solution
ScamGuard provides a simple, one-click solution. Users can paste a message, upload a screenshot, scan a QR code, or use voice input. The app analyzes it locally and gives a clear **HIGH RISK** or **SAFE** verdict with simple steps to follow.

## ✨ Key Features
- **Real-time Scam Detection:** Analyzes SMS, links, QR codes, and call transcripts using an advanced heuristic engine (supports both English and Hindi).
- **Screenshot OCR:** Uses Tesseract.js to extract text from uploaded screenshots directly in the browser.
- **QR Code Scanner:** Uses jsQR to scan QR codes from images without needing camera permissions.
- **Voice Input:** Uses Web Speech API to let users speak their message instead of typing.
- **Text-to-Speech:** "Read Aloud" feature for better accessibility.
- **Scan History:** Saves the last 5 scans locally using browser `localStorage`.
- **Privacy-First:** 100% client-side processing. No data is ever sent to a server or stored in the cloud.
- **Bilingual Support:** Available in both English and Hindi.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Libraries:** Tesseract.js (OCR), jsQR (QR Scanning), Lucide React (Icons)
- **Deployment:** GitHub Pages

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SanjayTechHub/Scam-Guard.git
