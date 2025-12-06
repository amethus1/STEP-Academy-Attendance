# S.T.E.P. Academy Student Attendance Tracker

A **Tauri desktop application** for tracking student attendance at S.T.E.P. Academy. Designed for educators and administrators to manage student rosters, record daily and weekly attendance, and project program completion dates.

## Key Features

- **Desktop App**: Native cross-platform application built with Tauri (macOS, Windows, Linux).
- **SQLite Database**: All data stored locally in a robust, embedded database.
- **Offline First**: Works entirely offline with no backend required.
- **Reporting & Analytics**: Dashboard with key metrics, attendance trend charts, and "At-Risk" student reports.
- **Flexible Views**: Weekly View, Daily View, and a powerful Roster table.
- **Student Profiles**: Detailed profiles with photos, guardian/emergency contacts, and custom fields.
- **Visual Attendance Calendar**: Heat map calendar on student detail page.
- **Holiday Tracking**: Manage non-school days, automatically excluded from calculations.
- **Data Portability**: Export roster to CSV, full JSON backup/restore.
- **Year-End Rollover**: Automated wizard to promote students to the next school year.
- **Dark Mode**: System-aware or manual theme selection.

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Rust** (for Tauri) - Install via [rustup.rs](https://rustup.rs)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd STEP-Academy-Attendance

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Building for Production

```bash
# Build the distributable app
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Pages Overview

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with key stats and attendance trends |
| **Weekly View** | Attendance grid for navigating week-by-week |
| **Daily View** | Focus on a single day's attendance |
| **Student Roster** | Sortable, searchable table with CSV export |
| **Student Detail** | Full profile with attendance calendar |
| **Reports** | Analytics dashboard and At-Risk student report |
| **Holidays** | Manage non-instructional days |
| **Data Management** | Import/export data, custom fields |
| **Settings** | Theme, default view, school year dates |

## Technology Stack

- **Tauri** - Rust-based framework for native desktop apps
- **React** + **TypeScript** - UI framework
- **TanStack Query** - Data fetching and caching
- **SQLite** - Embedded database via Tauri SQL plugin
- **Zod** - Runtime data validation
- **Tailwind CSS** - Styling
- **Chart.js** - Analytics charts
- **React Router** - Client-side routing

## Data Storage

Data is stored in a local SQLite database file (`step_academy.db`) in the app's data directory. The database uses a relational schema:

- `students` - Student profiles
- `enrollments` - Year-specific enrollment records
- `attendance` - Daily attendance records
- `holidays` - Non-school days

## Backup & Restore

1. Go to **Data Management** page
2. Click **Export Data** to download a JSON backup
3. To restore, click **Import Data** and select your backup file

## License

MIT