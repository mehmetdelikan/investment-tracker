from flask import Flask, jsonify, render_template
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/rates')
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
