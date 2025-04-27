from flask import Flask, jsonify, request
from flask_cors import CORS
from utils import get_operator_country_amount_by_range, get_list_of_manufacturers, get_number_of_accidents, get_number_of_accidents_per_year

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

@app.route('/manufacturers', methods=['GET'])
def get_manufacturers_list():
    return jsonify(get_list_of_manufacturers())

@app.route('/number_of_accidents_per_manufacturer', methods=['GET'])
def get_number_of_accidents_per_manufacturer():
    return get_number_of_accidents()

@app.route('/number_of_accidents_per_manufacturer_per_year', methods=['GET'])
def get_number_of_accidents_per_manufacturer_per_year():
    return get_number_of_accidents_per_year()

if __name__ == '__main__':
    app.run(debug=True)