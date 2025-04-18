from flask import Flask, jsonify, request
from flask_cors import CORS
from utils import get_operator_country_amount_by_range

app = Flask(__name__)
CORS(app)

@app.route('/hello', methods=['GET'])
def get_data():
    return jsonify({"message": "Hello from Flask!"})

@app.route('/operator-country', methods=['GET'])
def get_operator_country():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date are required"}), 400
    
    result = get_operator_country_amount_by_range(start_date, end_date)
    return result

if __name__ == '__main__':
    app.run(debug=True)