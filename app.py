from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
import requests
from bs4 import BeautifulSoup
import re
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import csv
import io
from flask import Response

load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'gizli-anahtar-degistirilecek')

database_url = os.environ.get('DATABASE_URL', 'sqlite:///db.sqlite')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(255))
    name = db.Column(db.String(1000))

class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    investments = db.relationship('Investment', backref='portfolio', lazy=True, cascade="all, delete-orphan")

class Investment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolio.id'), nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    buy_price = db.Column(db.Float, nullable=False)
    fee = db.Column(db.Float, default=0.0)
    date = db.Column(db.String(50), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))




with app.app_context():
    db.create_all()
    try:
        if not User.query.filter_by(username='admin').first():
            new_user = User(
                username='admin',
                password=generate_password_hash('admin', method='pbkdf2:sha256'),
                name='Yönetici'
            )
            db.session.add(new_user)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("Warning: Could not create default admin user:", e)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()

        if not user or not check_password_hash(user.password, password):
            flash('Lütfen kullanıcı adı ve şifrenizi kontrol ediniz.')
            return redirect(url_for('login'))

        login_user(user)
        return redirect(url_for('index'))

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html', name=current_user.name)

@app.route('/api/rates')
@login_required
def get_rates():
    url = "https://dunyakatilim.com.tr/gunluk-kurlar"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        rates = {}
        
        def extract_rate(currency_name):
            # Find the text node containing the currency name
            element = soup.find(string=re.compile(re.escape(currency_name)))
            if element:
                # Find the next text node (Buy Price)
                buy_node = element.find_next(string=True)
                while buy_node and not buy_node.strip():
                    buy_node = buy_node.find_next(string=True)
                
                # Find the next text node after Buy Price (Sell Price)
                sell_node = None
                change_node = None
                
                if buy_node:
                    sell_node = buy_node.find_next(string=True)
                    while sell_node and not sell_node.strip():
                        sell_node = sell_node.find_next(string=True)
                
                # Find the next text node after Sell Price (Change)
                if sell_node:
                    change_node = sell_node.find_next(string=True)
                    while change_node and not change_node.strip():
                        change_node = change_node.find_next(string=True)

                if buy_node and sell_node:
                    return {
                        'buy': buy_node.strip(),
                        'sell': sell_node.strip(),
                        'change': change_node.strip() if change_node else '-'
                    }
            return None

        # The names identified in browser analysis
        rates['USD'] = extract_rate("Amerikan doları (USD)")
        rates['EUR'] = extract_rate("Euro (EUR)")
        rates['GOLD'] = extract_rate("Altın (XAU)")
        rates['SILVER'] = extract_rate("Gümüş (XAG)")
        
        return jsonify(rates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/investments', methods=['GET'])
@login_required
def get_investments():
    
    # Get portfolio_id from query params, optional
    portfolio_id = request.args.get('portfolio_id')
    
    query = Investment.query.filter_by(user_id=current_user.id)
    if portfolio_id:
        query = query.filter_by(portfolio_id=portfolio_id)
        
    investments = query.order_by(Investment.id.desc()).all()
    return jsonify([{
        'id': inv.id,
        'currency': inv.currency,
        'amount': inv.amount,
        'buyPrice': inv.buy_price,
        'fee': inv.fee,
        'fee': inv.fee,
        'date': inv.date,
        'portfolio_id': inv.portfolio_id
    } for inv in investments])

@app.route('/api/portfolios', methods=['GET'])
@login_required
def get_portfolios():
    portfolios = Portfolio.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': p.id,
        'name': p.name
    } for p in portfolios])

@app.route('/api/portfolios', methods=['POST'])
@login_required
def add_portfolio():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
        
    new_portfolio = Portfolio(name=name, user_id=current_user.id)
    db.session.add(new_portfolio)
    db.session.commit()
    return jsonify({'message': 'Portfolio added', 'id': new_portfolio.id, 'name': new_portfolio.name}), 201

@app.route('/api/investments', methods=['POST'])
@login_required
def add_investment():
    data = request.json
    new_investment = Investment(
        user_id=current_user.id,
        portfolio_id=data['portfolio_id'],
        currency=data['currency'],
        amount=float(data['amount']),
        buy_price=float(data['buyPrice']),
        fee=float(data.get('fee', 0)),
        date=data['date']
    )
    db.session.add(new_investment)
    db.session.commit()
    return jsonify({'message': 'Investment added successfully', 'id': new_investment.id}), 201

@app.route('/api/investments/<int:id>', methods=['PUT'])
@login_required
def update_investment(id):
    investment = Investment.query.get_or_404(id)
    if investment.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    
    # If portfolio_id changes, verify ownership
    if 'portfolio_id' in data and data['portfolio_id'] != investment.portfolio_id:
        portfolio = Portfolio.query.get(data['portfolio_id'])
        if not portfolio or portfolio.user_id != current_user.id:
             return jsonify({'error': 'Invalid portfolio'}), 400
        investment.portfolio_id = data['portfolio_id']

    investment.currency = data['currency']
    investment.amount = float(data['amount'])
    investment.buy_price = float(data['buyPrice'])
    investment.fee = float(data.get('fee', 0))
    investment.date = data['date']
    
    db.session.commit()
    return jsonify({'message': 'Investment updated successfully'})

@app.route('/api/investments/<int:id>', methods=['DELETE'])
@login_required
def delete_investment(id):
    investment = Investment.query.get_or_404(id)
    if investment.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(investment)
    db.session.commit()
    db.session.delete(investment)
    db.session.commit()
    return jsonify({'message': 'Investment deleted successfully'})

@app.route('/api/export_csv')
@login_required
def export_csv():
    # Helper to clean currency string
    def clean_curr(c):
        return c.replace('USD', 'Dolar').replace('EUR', 'Euro').replace('GOLD', 'Altın').replace('SILVER', 'Gümüş')

    si = io.StringIO()
    cw = csv.writer(si)
    
    # Headers
    cw.writerow(['Portföy', 'Döviz', 'Miktar', 'Alış Fiyatı', 'Komisyon', 'Tarih'])
    
    # Check if a specific portfolio is requested, otherwise export all
    portfolio_id = request.args.get('portfolio_id')
    query = Investment.query.filter_by(user_id=current_user.id)
    
    if portfolio_id and portfolio_id != 'null': # JS might send string 'null'
         query = query.filter_by(portfolio_id=portfolio_id)
         
    investments = query.order_by(Investment.date.desc()).all()
    
    for inv in investments:
        port_name = inv.portfolio.name if inv.portfolio else '-'
        cw.writerow([port_name, clean_curr(inv.currency), inv.amount, inv.buy_price, inv.fee, inv.date])
        
    output = si.getvalue()
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=yatirimlar.csv"}
    )


@app.route('/api/import_csv', methods=['POST'])
@login_required
def import_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are allowed'}), 400

    try:
        # Helper to map currency names back to codes
        curr_map = {
            'Dolar': 'USD', 'USD': 'USD',
            'Euro': 'EUR', 'EUR': 'EUR',
            'Altın': 'GOLD', 'GOLD': 'GOLD',
            'Gümüş': 'SILVER', 'SILVER': 'SILVER'
        }
        
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        # Check headers
        required_headers = ['Portföy', 'Döviz', 'Miktar', 'Alış Fiyatı', 'Komisyon', 'Tarih']
        if not set(required_headers).issubset(set(csv_input.fieldnames)):
             return jsonify({'error': 'Invalid CSV format. Missing headers.'}), 400
             
        count = 0
        
        # Cache portfolios to minimize DB hits
        user_portfolios = {p.name: p.id for p in Portfolio.query.filter_by(user_id=current_user.id).all()}
        
        for row in csv_input:
            port_name = row['Portföy']
            
            # Find or Create Portfolio
            port_id = user_portfolios.get(port_name)
            if not port_id:
                # Create if not exists (or use default if empty/dash?)
                # Assuming creation is better
                if not port_name or port_name == '-': 
                     # Fallback to current user's first portfolio or create 'Default'
                     default = Portfolio.query.filter_by(user_id=current_user.id).first()
                     if default: port_id = default.id
                     else:
                         new_p = Portfolio(name='Ana Portföy', user_id=current_user.id)
                         db.session.add(new_p)
                         db.session.commit()
                         port_id = new_p.id
                         user_portfolios[new_p.name] = new_p.id
                else:
                    new_p = Portfolio(name=port_name, user_id=current_user.id)
                    db.session.add(new_p)
                    db.session.commit()
                    port_id = new_p.id
                    user_portfolios[port_name] = port_id
            
            # Create Investment
            curr_code = curr_map.get(row['Döviz'], 'USD') # Default to USD if unknown
            
            inv = Investment(
                user_id=current_user.id,
                portfolio_id=port_id,
                currency=curr_code,
                amount=float(row['Miktar']),
                buy_price=float(row['Alış Fiyatı']),
                fee=float(row['Komisyon'] or 0),
                date=row['Tarih']
            )
            db.session.add(inv)
            count += 1
            
        db.session.commit()
        return jsonify({'message': 'Import successful', 'count': count})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
