# ApexGym Manager - Complete Offline-First Mobile Application

A high-performance, offline-first mobile application built for gym owners, personal trainers, and fitness coordinators. Designed with **Expo (React Native + TypeScript)**, **Expo SQLite**, **Zustand**, and a **nature-inspired emerald/forest green minimalist UI**.

---

## 🏗️ Architecture & Technology Stack

- **Framework:** React Native with Expo (TypeScript)
- **Local Relational Database:** Expo SQLite (`openDatabaseAsync`, WAL mode, foreign keys enabled)
- **State Management:** Zustand (`useGymStore`)
- **Navigation:** React Navigation Native Stack
- **PDF Generation & Sharing:** `expo-print` & `expo-sharing`
- **Device & Google Calendar:** `expo-calendar`
- **Biometric Security:** `expo-local-authentication`
- **Design System:** Minimalist luxury aesthetic inspired by nature/forest green (`#0A3622`), crisp surfaces, pill badges, and micro-interactions.

---

## 🗄️ Relational Database Schema

All data is strictly offline and stored locally:
1. `trainers`: Owner profile, security PIN, biometric authentication status.
2. `locations`: Gym branches (all client data is strictly scoped per location).
3. `members`: Client personal, emergency, and health info.
4. `custom_measurement_fields`: Dynamic trainer-defined tracking metrics per gym (e.g. Body Fat %, Left Thigh).
5. `measurements`: Time-series measurements with auto-calculated BMI and custom values stored as JSON.
6. `exercises`: Pre-populated exercise dictionary with 50+ exercises across all 13 muscle categories + custom trainer additions.
7. `workout_plans`: Routines with start/end dates, auto-expiry logic, and calendar references.
8. `plan_exercises`: Exercise details (sets, reps, rest time, target load, day).
9. `check_ins`: Member attendance log with visit timestamp.
10. `payments`: Monthly & yearly membership dues with paid/unpaid/pending status.

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
# or: npm start
```
- Press `a` to open on Android emulator or connect via Expo Go on physical device.
- Press `i` to open on iOS simulator.


clear db: 'Get-ChildItem -Path . -Filter "*.db*" -Recurse -Force'