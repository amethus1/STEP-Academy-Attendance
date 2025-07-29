# Attendance Tracker

This project is a desktop application built with **React**, **TypeScript**, **Electron** and **Tailwind CSS**. It provides an easy way to record daily attendance for a roster of students, track their progress over time and export reports.

## Directory layout

```
.
├── electron/       # Main Electron process files
│   ├── main.ts     # Creates the window, handles IPC and PDF/CSV exports
│   ├── preload.ts  # Exposes safe APIs to the renderer
│   └── backup.ts   # Optional scheduled JSON backup script
├── src/            # Front‑end code (React components and pages)
│   ├── components/ # Shared UI components like Button, Modal and icons
│   ├── context/    # React context that stores attendance data
│   ├── pages/      # Different screens of the app
│   ├── utils/      # Helper functions (date utilities, etc.)
│   ├── constants.ts# Initial demo data
│   ├── types.ts    # TypeScript type definitions
│   └── index.tsx   # React entry point
├── index.html      # HTML shell loaded by Vite/Electron
├── package.json    # Project metadata and scripts
├── tailwind.config.js
└── vite.config.ts  # Vite + Electron build configuration
```

## What the app does

The application keeps a list of students and allows you to mark them **present** or **absent** each day. Attendance information is stored locally (in `localStorage`) and can be exported or imported as needed. The app also knows about holidays so projected release dates skip those days.

### Main pages

- **Weekly View (`/`)** – Shows every student with action buttons for each weekday. Students can be filtered by status or whether they have been marked present/absent today.
- **Daily View (`/daily-dashboard`)** – Focuses on a single day. Quickly mark attendance for all students for a chosen date.
- **Roster (`/roster`)** – A sortable list of all students. You can search, add new students or edit existing ones. The page also displays projected release dates based on attendance so far.
- **Student Detail (`/student/:id`)** – Displays an individual student summary with attendance history. From here you can edit student information or adjust past attendance logs.
- **Holidays (`/holidays`)** – Manage a list of holiday dates that are skipped when calculating projected release dates.
- **Data Management (`/data-management`)** – Export a backup of all data (JSON) or the attendance log (CSV). You can also import a previously exported JSON file which replaces current data.
- **Reporting (`/reporting`)** – Generates a PDF summary for each student with their recent attendance and comments.

### Other features

- **Persistent data** – All records are saved to `localStorage`, so they remain after closing the app.
- **Electron integrations** – CSV and PDF exports are handled via IPC to the Electron main process. A daily JSON backup is also created in the user data directory.
- **Tailwind styles** – The UI uses Tailwind CSS for layout and dark mode support.

To start the application in development mode run `npm run dev`. Production builds package the React app and Electron together.

