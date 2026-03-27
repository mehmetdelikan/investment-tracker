import sqlite3
import os

DB_PATH = 'instance/db.sqlite'

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Create Portfolio table
        print("Creating portfolio table...")
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100),
            user_id INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )
        ''')

        # 2. Get all users
        print("Fetching users...")
        cursor.execute("SELECT id, username FROM user")
        users = cursor.fetchall()
        
        user_portfolios = {}

        # 3. Create default portfolio for each user
        print("Creating default portfolios...")
        for user_id, username in users:
            # Check if user already has a portfolio
            cursor.execute("SELECT id FROM portfolio WHERE user_id = ?", (user_id,))
            existing = cursor.fetchone()
            
            if existing:
                portfolio_id = existing[0]
                print(f"User {username} already has portfolio {portfolio_id}")
            else:
                cursor.execute("INSERT INTO portfolio (name, user_id) VALUES (?, ?)", ('Ana Portföy', user_id))
                portfolio_id = cursor.lastrowid
                print(f"Created 'Ana Portföy' for {username} (ID: {portfolio_id})")
            
            user_portfolios[user_id] = portfolio_id

        # 4. Add portfolio_id to investment
        print("Checking investment table schema...")
        cursor.execute("PRAGMA table_info(investment)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'portfolio_id' not in columns:
            print("Adding portfolio_id to investment table...")
            cursor.execute("ALTER TABLE investment ADD COLUMN portfolio_id INTEGER REFERENCES portfolio(id)")
        else:
            print("portfolio_id column already exists.")

        # 5. Link existing investments
        print("Linking investments to default portfolios...")
        cursor.execute("SELECT id, user_id, portfolio_id FROM investment")
        investments = cursor.fetchall()
        
        for inv_id, user_id, port_id in investments:
            if not port_id or port_id is None:
                target_portfolio_id = user_portfolios.get(user_id)
                if target_portfolio_id:
                    cursor.execute("UPDATE investment SET portfolio_id = ? WHERE id = ?", (target_portfolio_id, inv_id))
                    print(f"Linked investment {inv_id} to portfolio {target_portfolio_id}")

        conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
