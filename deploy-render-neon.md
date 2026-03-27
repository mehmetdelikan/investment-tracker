# Render & Neon Deployment Plan

## 1. ANALYSIS & PLANNING
- **Objective:** Deploy Flask application to Render and use Neon Serverless PostgreSQL for online data storage. Also, migrate existing local `sqlite:///db.sqlite` data to Neon.
- **Current Stack:** Flask, SQLAlchemy, SQLite, Render configuration (`render.yaml`).
- **Changes Needed:**
  1. Update `app.config['SQLALCHEMY_DATABASE_URI']` to support `DATABASE_URL` from the environment.
  2. Add `psycopg2-binary` to `requirements.txt` to support PostgreSQL connections.
  3. Optionally add `python-dotenv` for local `.env` loading.
  4. Write a custom Python script to migrate data from `db.sqlite` to the Neon PostgreSQL database.
  5. Update `render.yaml` to ensure environment variables like `DATABASE_URL` and `SECRET_KEY` are expected in Render.

## 2. SOLUTIONING
- **Code Modifications:**
  - In `app.py`, change:
    ```python
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///db.sqlite')
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    ```
  - In `requirements.txt`, append `psycopg2-binary`.
- **Data Migration Strategy:**
  - Create `migrate_to_neon.py` that will connect to both SQLite and PostgreSQL. It will extract Users, Portfolios, and Investments from SQLite and insert them into Neon.

## 3. IMPLEMENTATION (Next Steps)
- Programmatically apply the code updates.
- Create `migrate_to_neon.py`.
- After coding, the user needs to provide their Neon `DATABASE_URL` locally via a `.env` file to trigger the migration.
- Push the changes to GitHub so Render can auto-deploy.

---
*Created by: project-planner agent*
