# Application Architecture

This document outlines the key architectural decisions for the AI Financial CPA Dashboard project.

## V1 Prototype Architecture (Historical)

The initial V1 application was a **High-Fidelity Functional Prototype** designed for rapid development and user experience validation. It ran entirely client-side, used `localStorage` for data, and called the Gemini API directly from the browser. This architecture has been deprecated and replaced.

## V2 Production Architecture (Current)

The current architecture is a secure, scalable, and monetizable platform built on a modern client-server model.

*   **Full-Stack Application:**
    *   **Frontend:** The React application serves as the user interface. It makes secure API calls to our backend and does not contain any sensitive logic or keys.
    *   **Backend:** A Node.js/Express server deployed on **Google Cloud Run**. This server is the core of our application and handles:
        *   Secure management of the Google Gemini API key via **Google Secret Manager**. All AI calls originate from the server.
        *   All business logic for parsing, analysis, and scoring.
        *   Secure connections to our database.
        *   A secure RESTful API for the frontend.
*   **Database:** A **Google Cloud SQL (PostgreSQL)** instance stores all user accounts, client profiles, and financial data permanently and securely.
*   **Security & Compliance:**
    *   **Identity & Access Management (IAM):** A dedicated service account with the principle of least privilege is used by Cloud Run to access other Google Cloud services.
    *   **Authentication (Future):** The groundwork is laid for a robust, server-side authentication system, including secure password hashing (`bcrypt`), JSON Web Tokens (JWTs) for session management, and **Two-Factor Authentication (2FA)** via email.
    *   **Data Encryption:** All data is encrypted in transit (HTTPS/SSL provided by Cloud Run) and at rest (in the Cloud SQL database).
*   **Subscription Management (Future):** The architecture is prepared for integration with Stripe for secure payment processing and subscription management.

## Unified Platform Strategy

The application is architected as a **Unified Financial Services Platform**.

*   **Single Entry Point:** The entire application will live at one primary domain: **`vfin.nwtfi.com`**.
*   **Modular Services via URL Paths:** Different services will be accessed via URL paths (e.g., `vfin.nwtfi.com/vcpa`, `vfin.nwtfi.com/vcfo`).
*   **Shared Components:** This unified approach allows for a single user account system, a shared UI shell, and the reuse of core backend services.

## Domain & DNS Structure

*   **Main Business Site:** `www.nwtfi.com`
*   **Marketing Hub:** `aiapp.nwtfi.com`
*   **Application Hub:** `vfin.nwtfi.com` (the secure web application itself)
