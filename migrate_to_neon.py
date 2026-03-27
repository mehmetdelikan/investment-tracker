import sqlite3
import os
from app import app, db, User, Portfolio, Investment

def migrate_data():
    local_db_path = 'instance/db.sqlite'
    if not os.path.exists(local_db_path):
        print("db.sqlite not found. Nothing to migrate.")
        return

    # Check if DATABASE_URL is set, if not it's just connecting to the local one again
    if not os.environ.get('DATABASE_URL') or 'sqlite' in os.environ.get('DATABASE_URL', ''):
        print("DATABASE_URL is not set or refers to sqlite. Please set it to connect to Neon PostgreSQL in your .env file.")
        return
        
    print(f"Migrating data to: {app.config['SQLALCHEMY_DATABASE_URI']}")

    with app.app_context():
        # Target database tables creation
        db.create_all()

        conn = sqlite3.connect(local_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Migrate Users
        print("Migrating users...")
        users = cursor.execute("SELECT id, username, password, name FROM user").fetchall()
        for u in users:
            existing = User.query.get(u['id'])
            if not existing:
                new_user = User(id=u['id'], username=u['username'], password=u['password'], name=u['name'])
                db.session.add(new_user)
        
        # Migrate Portfolios
        print("Migrating portfolios...")
        portfolios = cursor.execute("SELECT id, name, user_id FROM portfolio").fetchall()
        for p in portfolios:
            existing = Portfolio.query.get(p['id'])
            if not existing:
                new_port = Portfolio(id=p['id'], name=p['name'], user_id=p['user_id'])
                db.session.add(new_port)
                
        # Migrate Investments
        print("Migrating investments...")
        investments = cursor.execute("SELECT id, user_id, portfolio_id, currency, amount, buy_price, fee, date FROM investment").fetchall()
        for i in investments:
            existing = Investment.query.get(i['id'])
            if not existing:
                new_inv = Investment(
                    id=i['id'], user_id=i['user_id'], portfolio_id=i['portfolio_id'], 
                    currency=i['currency'], amount=i['amount'], buy_price=i['buy_price'],
                    fee=i['fee'], date=i['date']
                )
                db.session.add(new_inv)

        try:
            db.session.commit()
            print("Migration successful!")
            
            # Reset sequences in Postgres to match explicitly provided IDs
            if 'postgres' in app.config['SQLALCHEMY_DATABASE_URI']:
                print("Syncing PostgreSQL ID sequences...")
                db.session.execute(db.text("SELECT setval(pg_get_serial_sequence('\"user\"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM \"user\";"))
                db.session.execute(db.text("SELECT setval(pg_get_serial_sequence('portfolio', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM portfolio;"))
                db.session.execute(db.text("SELECT setval(pg_get_serial_sequence('investment', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM investment;"))
                db.session.commit()
                print("Sequences reset successfully.")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error during migration: {e}")
        finally:
            conn.close()

if __name__ == '__main__':
    migrate_data()
