import requests
import sys

BASE_URL = "http://127.0.0.1:5001"
SESSION = requests.Session()

def login():
    print("Logging in...")
    # Get login page to get CSRF token if needed (not needed here as not using WTF-CSRF explicitly in form, just simple post)
    res = SESSION.post(f"{BASE_URL}/login", data={'username': 'admin', 'password': 'admin'})
    if res.url == f"{BASE_URL}/":
        print("Login successful")
        return True
    else:
        print("Login failed")
        return False

def verify_portfolios():
    print("\n--- Testing Portfolios API ---")
    
    # 1. Get Portfolios
    res = SESSION.get(f"{BASE_URL}/api/portfolios")
    portfolios = res.json()
    print(f"Current Portfolios: {portfolios}")
    
    if len(portfolios) == 0:
        print("FAIL: No portfolios found (should have at least default)")
        return
    
    default_portfolio_id = portfolios[0]['id']
    
    # 2. Create New Portfolio
    new_name = "Test Portföy"
    res = SESSION.post(f"{BASE_URL}/api/portfolios", json={'name': new_name})
    if res.status_code == 201:
        new_portfolio = res.json()
        print(f"Created Portfolio: {new_portfolio}")
        new_portfolio_id = new_portfolio['id']
    else:
        print(f"FAIL: Could not create portfolio: {res.text}")
        return

    # 3. Add Investment to New Portfolio
    print("\n--- Testing Investments API ---")
    investment_data = {
        'portfolio_id': new_portfolio_id,
        'currency': 'USD',
        'amount': 100,
        'buyPrice': 30.0,
        'fee': 0,
        'date': '2023-10-27'
    }
    res = SESSION.post(f"{BASE_URL}/api/investments", json=investment_data)
    if res.status_code == 201:
        print("Added investment to new portfolio")
    else:
        print(f"FAIL: Could not add investment: {res.text}")
        return

    # 4. Filter Investments (New Portfolio)
    res = SESSION.get(f"{BASE_URL}/api/investments", params={'portfolio_id': new_portfolio_id})
    invs = res.json()
    print(f"Investments in new portfolio: {len(invs)}")
    if len(invs) != 1:
        print("FAIL: Expected 1 investment in new portfolio")
    else:
        print("PASS: Verified investment in new portfolio")

    # 5. Filter Investments (Default Portfolio)
    res = SESSION.get(f"{BASE_URL}/api/investments", params={'portfolio_id': default_portfolio_id})
    invs_default = res.json()
    print(f"Investments in default portfolio: {len(invs_default)}")
    
    # Check if the new investment leaked (it shouldn't)
    leaked = [i for i in invs_default if i.get('portfolio_id') == new_portfolio_id]
    if leaked:
        print("FAIL: New investment leaked into default portfolio list")
    else:
        print("PASS: Portfolios are isolated")

if __name__ == "__main__":
    try:
        if login():
            verify_portfolios()
    except Exception as e:
        print(f"Error: {e}")
