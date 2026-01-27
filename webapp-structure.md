# Formulation Pro - Web Application Structure & Functionality

## 1. Project Overview
**Formulation Pro** is a high-end, premium-designed management system for chemical and product formulations. It facilitates a streamlined workflow between **Bosses/Chemists** (who request and approve formulas) and **Formulators** (who design and submit them).

---

## 2. Core Modules & Functions

### 🟢 Dashboard (Home)
*   **Analytics Overview**: Visual summary of Total Formulations, Approved, Drafts, and Obsolete items.
*   **Quick Actions**: Hotlinks to create new formulations based on categories.
*   **Activity Feed**: View pending requests and recently approved formulas.

### 🔍 Database & Browse
*   **Unified Search**: Search through the entire formula repository by name, LOT number, or type.
*   **Categorized Tables**: Dedicated views for Cosmetics, Perfume, and Food Supplements.
*   **Status Management**: Filter formulations by "Official", "Draft", or "Pending".

### ⚖️ Comparison Engine
*   **Side-by-Side Analysis**: Select two formulas to compare ingredient percentages.
*   **Smart Highlighting**: Automatically detects and highlights differences (Increases in Green, Decreases in Red).
*   **Version Control**: Compare different LOT versions of the same product.

### 🧪 Formulation Creation (Excel-Integrated)
*   **Excel Paste Integration**: Direct copy-paste functionality from Microsoft Excel to the web table.
*   **Phase Management**: Logical grouping of ingredients (Phase A, Phase B, etc.).
*   **Automatic Calculations**: Live weight calculations based on total target weight and percentage.
*   **Decimal & Rounding Control**: Customizable decimal precision and rounding/truncating modes for precise lab work.
*   **Existing Weight Toggle**: Ability to include pre-existing weights in total calculations.

### 💼 Boss Workflow (Request & Review)
*   **Request Creation**: Form to send target specifications, priority, and deadlines to formulators.
*   **Review System**: Centralized hub for Bosses to View, Approve, or Reject pending submissions.
*   **Promotion to Official**: Capability to mark approved formulas as "Official" (Gold Status).

---

## 3. Project Structure (File Organization)

```text
/Formulation Pro
├── index.html            # Dashboard / Home Page
├── browse.html           # Unified Formulation Database
├── compare.html          # Comparison Engine
├── boss-request.html     # Boss Request & Approval Hub
├── settings.html         # User Management & Settings
├── login.html            # Authentication Page
├── cosmetics.html        # Formulation categories
├── perfume.html
├── food-supplement.html
├── s-cosmetics.html      # Sample categories
├── s-perfume.html
├── s-food-supplement.html
├── create-cosmetics.html # Interactive tools
├── create-perfume.html
├── create-food-supplement.html
├── compounding-dashboard.html # Production Dashboards
├── compounding-execution.html
├── chat-app/             # Enterprise Chat Module (React + Tailwind)
│   ├── src/              # Components, Hooks, and Services
│   ├── dist/             # Built production files for the widget
│   └── README.md         # Setup and configuration guide
├── chat-schema.sql       # Database schema for the chat system
├── chat-widget.js        # Global floating chat launcher
├── app.js                # Core Logic (Calculations, Toggles, Filters)
├── style.css             # Premium UI/UX (Animations, 3D Cube, Neon Effects)
├── logo.png              # Official Brand Asset
└── user_avatar.png       # User Identity Asset
```

---

## 4. Technical Stack
*   **Frontend**: Native HTML5 & Vanilla JavaScript (optimized for performance).
*   **Styling**: Modern CSS3 featuring:
    *   **3D Cube Engine**: CSS-powered rotating cube for branding.
    *   **Neon Aesthetics**: Gold-themed UI components for a luxury feel.
    *   **Responsive Engine**: Adaptive layouts for Mobile, Tablet, and Desktop.
*   **Data Handling**: Interactive tables with real-time calculation logic.

---

## 5. User Roles
1.  **Boss / Head Chemist**:
    *   Creates requests.
    *   Reviews submitted formulas.
    *   Finalizes "Official" product versions.
2.  **Formulator**:
    *   Receives requests.
    *   Uses Creation tools to design formulas.
    *   Submits formulas for review.
