from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os
from collections import defaultdict

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes and origins
app.secret_key = 'your_secret_key_here'

# SQLite Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///everydollar.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Transaction Model
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 'income' or 'expense'
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    description = db.Column(db.String(200))
    
    user = db.relationship('User', backref='transactions')

# Initialize database
with app.app_context():
    db.create_all()

# Authentication Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token.split()[1], app.secret_key, algorithms=["HS256"])
            current_user = data['user']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# User Registration
@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        
        if not username or not password or not confirm_password:
            return jsonify({'message': 'All fields are required'}), 400
            
        if password != confirm_password:
            return jsonify({'message': 'Passwords do not match'}), 400
            
        # Check if username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'message': 'Username already exists'}), 400
            
        # Hash the password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create new user
        new_user = User(username=username, password=hashed.decode('utf-8'))
        db.session.add(new_user)
        db.session.commit()
        
        # Generate JWT token
        token = jwt.encode({
            'user': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.secret_key)
        
        return jsonify({
            'message': 'User created successfully',
            'token': token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")  # Print error for debugging
        return jsonify({
            'message': 'Registration failed',
            'error': str(e)
        }), 400

# User Login
@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'message': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            token = jwt.encode({
                'user': username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.secret_key)
            return jsonify({'token': token}), 200
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Login error: {str(e)}")  # Print error for debugging
        return jsonify({'message': 'Login failed', 'error': str(e)}), 400

# Protected Suggestions Endpoint
@app.route('/suggestions', methods=['POST'])
@token_required
def get_savings_suggestion(current_user):
    data = request.json
    income = data.get('income', 0)
    expenses = data.get('expenses', 0)

    if income == 0:
        return jsonify({"suggestion": "No income data available for savings suggestions."})

    savings_rate = (income - expenses) / income

    if savings_rate >= 0.2:
        suggestion = "Great job! You're saving more than 20% of your income."
    elif savings_rate >= 0.1:
        suggestion = "Good progress! Try increasing savings to 20% of income."
    elif savings_rate > 0:
        suggestion = "Consider saving at least 10% of your income."
    else:
        suggestion = "Warning: You're spending more than you earn. Review expenses."

    return jsonify({"suggestion": suggestion, "user": current_user})

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/budget')
def serve_budget():
    token = request.headers.get('Authorization')
    if not token:
        return send_from_directory('.', 'index.html')
    
    try:
        token = token.split()[1]  # Remove 'Bearer ' prefix
        data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return send_from_directory('.', 'budget.html')
    except:
        return send_from_directory('.', 'index.html')

@app.route('/dashboard')
def serve_dashboard():
    token = request.headers.get('Authorization')
    if not token:
        return send_from_directory('.', 'index.html')
    
    try:
        token = token.split()[1]  # Remove 'Bearer ' prefix
        data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return send_from_directory('.', 'dashboard.html')
    except:
        return send_from_directory('.', 'index.html')

@app.route('/transactions')
def serve_transactions():
    token = request.headers.get('Authorization')
    if not token:
        return send_from_directory('.', 'index.html')
    
    try:
        token = token.split()[1]  # Remove 'Bearer ' prefix
        data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return send_from_directory('.', 'transactions.html')
    except:
        return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Add these new API endpoints
@app.route('/api/transactions', methods=['GET', 'POST'])
@token_required
def transactions(current_user):
    if request.method == 'GET':
        # Get all transactions for current user
        user_transactions = Transaction.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'id': t.id,
            'type': t.type,
            'amount': t.amount,
            'category': t.category,
            'date': t.date.isoformat(),
            'description': t.description
        } for t in user_transactions])
    
    elif request.method == 'POST':
        # Add new transaction
        data = request.json
        new_transaction = Transaction(
            user_id=current_user.id,
            type=data['type'],
            amount=data['amount'],
            category=data['category'],
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            description=data.get('description', '')
        )
        db.session.add(new_transaction)
        db.session.commit()
        return jsonify({'message': 'Transaction added successfully'}), 201

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
@token_required
def delete_transaction(current_user, transaction_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=current_user.id).first()
    if not transaction:
        return jsonify({'message': 'Transaction not found'}), 404
    
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'message': 'Transaction deleted successfully'})

@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    # Get transactions for current month
    now = datetime.utcnow()
    start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_date = (start_date + timedelta(days=32)).replace(day=1)
    
    transactions = Transaction.query.filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).all()
    
    # Calculate analytics
    income = sum(t.amount for t in transactions if t.type == 'income')
    expenses = sum(t.amount for t in transactions if t.type == 'expense')
    balance = income - expenses
    
    # Category breakdown
    income_categories = defaultdict(float)
    expense_categories = defaultdict(float)
    
    for t in transactions:
        if t.type == 'income':
            income_categories[t.category] += t.amount
        else:
            expense_categories[t.category] += t.amount
    
    return jsonify({
        'summary': {
            'income': income,
            'expenses': expenses,
            'balance': balance
        },
        'income_categories': dict(income_categories),
        'expense_categories': dict(expense_categories)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
