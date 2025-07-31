# S.T.E.P. Academy Student Attendance Tracker

This is a comprehensive, client-side web application for tracking student attendance for S.T.E.P. Academy. It's designed for educators and administrators to manage student rosters, record daily and weekly attendance, and project program completion dates. The application runs entirely in the browser and stores all data locally using `localStorage`, ensuring offline functionality and data privacy.

## About The Project

This tool was built to provide a modern, responsive, and user-friendly interface for attendance management.

**Key Features:**

*   **No Backend Needed:** Runs entirely in your browser.
*   **Offline Functionality:** All data is saved in your browser's local storage.
*   **Reporting & Analytics:** A dedicated dashboard with key metrics, attendance trend charts, and an "At-Risk" student report.
*   **Customizable Experience:** Set your theme (light/dark), default page, and date format from the new Settings page.
*   **Flexible Views:** Includes a Weekly View with week-by-week navigation, Daily View, and a powerful Roster view.
*   **Enhanced Student Profiles:** Add, edit, and view detailed student profiles, now including a photo, guardian, and emergency contact info.
*   **Visual Attendance Calendar:** A heat map on the student detail page provides an at-a-glance overview of attendance patterns.
*   **Holiday Tracking:** Manage non-school days which are automatically excluded from calculations.
*   **Custom Fields:** Extend the student profile with your own custom data fields.
*   **Data Portability:** Easily export your roster to CSV or back up all application data to JSON.
*   **Responsive Design:** Works on desktops, tablets, and mobile devices.

## Getting Started

There is no complex installation or build process required.

1.  Clone this repository or download the source files.
2.  Open the `index.html` file in a modern web browser like Chrome, Firefox, or Edge.

That's it! The application is ready to use.

## Pages Overview

### 1. Weekly View
This view provides a classic weekly grid to see and manage attendance.

*   **Functionality:**
    *   Navigate week-by-week using "Prev Week" and "Next Week" buttons.
    *   Jump to any specific week using the date picker.
    *   Quickly mark students as "Present" or "Absent" for any school day in the displayed week.
    *   Filter the student list by status (e.g., Active, All).
    *   Sort students by last name or first name.

### 2. Daily View
This page focuses on the attendance for a single, selected day.

*   **Functionality:**
    *   Use the date picker to select any day.
    *   View a list of all students eligible for attendance on that day.
    *   Mark students as "Present" or "Absent".
    *   Filter the list to quickly see who is present, absent, or pending.

### 3. Student Roster
A powerful table for viewing and managing all students in the system.

*   **Functionality:**
    *   View all students in a sortable, searchable table.
    *   **Export to CSV:** Download the current view of the roster as a CSV file.
    *   **Configure Columns:** Customize the table by choosing which columns to display and in what order.
    *   **Projected Release Date:** See an automatically calculated projected release date for each student.

### 4. Reporting & Analytics
A central hub for data analysis and reports.

*   **Functionality:**
    *   **Dashboard:** View key stats at a glance, such as Overall Attendance %, students with Perfect Attendance, and total Active Students.
    *   **Trend Chart:** A visual chart shows attendance trends (Present vs. Absent) over the last 30 days.
    *   **"At-Risk" Report:** Generate a list of students who have crossed a customizable absence threshold within a specific period. This report can also be exported to CSV.

### 5. Student Detail Page
This page gives a complete overview of a single student.

*   **Functionality:**
    *   **Enhanced Profile:** View and edit core information, including a new student photo, guardian contact, and emergency contact details.
    *   **Print Summary:** Generate a clean, printable summary of the student's profile.
    *   **Visual Attendance Calendar:** A heat map-style calendar gives a quick visual summary of the student's attendance for the past year.
    *   View key stats, comments, and all additional information in one place.

### 6. Holidays
Manage school holidays and other non-instructional days.

*   **Functionality:**
    *   Add new holidays by giving them a name and a date.
    *   View and delete existing holidays. Holidays are automatically excluded from calculations.

### 7. Data Management
Tools for managing the application's data structure and portability.

*   **Functionality:**
    *   **Custom Fields:** Create custom data fields (text, number, or date) for student profiles.
    *   **Export Data:** Download a full backup of all application data as a single JSON file.
    *   **Import Data:** Restore the application's state from a previously exported JSON file. **Warning:** This will overwrite all current data.

### 8. Settings & Help
Customize your experience and find information about the app.

*   **Functionality:**
    *   Set your theme, default landing page, and date format.
    *   View the app version and find links for feedback.

## Technology Stack

*   **React:** For building the user interface.
*   **TypeScript:** For type safety and better developer experience.
*   **React Router:** For client-side routing.
*   **Tailwind CSS:** For styling the application.
*   **Chart.js:** For rendering analytics charts.
*   **ES Modules:** The app uses native browser ES modules, requiring no build step.