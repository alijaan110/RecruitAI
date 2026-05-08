# 🚂 Railway Deployment Guide for RecruitAI

This guide provides a step-by-step process for deploying the RecruitAI monorepo to Railway. Since the project contains both a **FastAPI Backend** and a **Next.js Frontend**, we will deploy them as two separate services.

## Prerequisites
- A [Railway](https://railway.app/) account.
- Your project pushed to a GitHub repository.

---

## 1. Deploy the Backend Service

1.  **Create New Project**: On the Railway dashboard, click **New Project** > **Deploy from GitHub repo**.
2.  **Select Repo**: Choose your `RecruitAI` repository.
3.  **Setup Service**: Once the service is created, click on it and go to **Settings**.
4.  **Set Root Directory**:
    *   Find the **General** section.
    *   Set **Root Directory** to `backend/`.
5.  **Force Dockerfile Builder**:
    *   Go to the **Build** section.
    *   Find **Builder**. If it says "Railpack", click **Change** and select **Dockerfile**.
    *   Ensure the **Dockerfile Path** is set to `./Dockerfile`.
6.  **Add Domain**:
    *   Go to the **Settings** tab.
    *   Click **Generate Domain** to get your backend URL (e.g., `backend-production.up.railway.app`).

---

## 2. Deploy the Frontend Service

1.  **Add New Service**: In the same project, click **New** > **GitHub Repo**.
2.  **Select Same Repo**: Choose the `RecruitAI` repository again.
3.  **Setup Service**: Click on the new service and go to **Settings**.
4.  **Set Root Directory**:
    *   Set **Root Directory** to `frontend/`.
5.  **Force Dockerfile Builder**:
    *   Go to the **Build** section.
    *   Set **Builder** to **Dockerfile**.
    *   Ensure **Dockerfile Path** is set to `./Dockerfile`.
6.  **Add Domain**:
    *   Generate a domain for the frontend.

---

## 3. Provision the Database (PostgreSQL)

1.  **Add Database**: Click **New** > **Database** > **Add PostgreSQL**.
2.  **Wait for provision**: Railway will automatically create the database.
3.  **Connect to Backend**: 
    *   Railway will automatically inject a `DATABASE_URL` variable into the project.
    *   Ensure the **Backend service** has access to it (Railway usually shares variables across a project if configured, or you can copy the `DATABASE_URL` from the Postgres service).

---

## 4. Required Environment Variables

### Backend Service
Add these in the **Variables** tab of your Backend service:
| Variable | Value |
| :--- | :--- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (or your Postgres connection string) |
| `ALLOWED_ORIGINS` | `["https://your-frontend-url.up.railway.app"]` |
| `JWT_SECRET_KEY` | `your-long-random-secret` |
| `ADMIN_SECRET_KEY` | `your-secret-admin-key` |
| `OPENAI_API_KEY` | `your-key-here` (if using OpenAI) |

### Frontend Service
Add these in the **Variables** tab of your Frontend service:
| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.up.railway.app` |

---

## 5. Troubleshooting

*   **Build fails with "start.sh not found"**: This means the **Root Directory** is not set. Go back to Step 1.4 or 2.4.
*   **Build fails on Dependencies**: Ensure you changed the **Builder** to **Dockerfile**.
*   **CORS Errors**: Ensure `ALLOWED_ORIGINS` in the backend includes your exact frontend URL.

---

*Generated for RecruitAI - Deployment Made Simple.*
