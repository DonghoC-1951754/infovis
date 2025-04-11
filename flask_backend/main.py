from flask import Flask, jsonify, request
from flask_cors import CORS
from utils import get_operator_country_amount_by_range

app = Flask(__name__)
CORS(app)  # This allows your React frontend to make requests to the Flask backend

@app.route('/hello', methods=['GET'])
def get_data():
    return jsonify({"message": "Hello from Flask!"})

@app.route('/operator-country', methods=['GET'])
def get_operator_country():
    # http://127.0.0.1:5000/operator-country?start_date=2020-01-01&end_date=2025-04-10
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date are required"}), 400
    
    result = get_operator_country_amount_by_range(start_date, end_date)
    return result

if __name__ == '__main__':
    app.run(debug=True)