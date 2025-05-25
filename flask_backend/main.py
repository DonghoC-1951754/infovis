from flask import Flask, jsonify, request
from flask_cors import CORS
from utils import get_operator_country_amount_by_range, get_list_of_manufacturers, get_number_of_accidents, get_accident_rate_per_wingspan_bin, get_all_accident_data_without_summaries, get_passenger_crew_aboard_boxplot, get_accident_rate_per_length_bin
from utils import get_crash_locations_data_optimized, get_flight_routes_data_optimized, get_number_of_accidents_per_year, get_cluster_data, get_aircraft_specs, get_accident_rate_per_engine_amount, get_accident_rate_per_weight_class
from utils import init_app

app = Flask(__name__)
CORS(app)

# Initialize the geocoding cache when the app starts
print("Loading geocoding cache...")
init_app()
print("Geocoding cache loaded successfully!")

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

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Welcome to the Aircraft Data API!"})

@app.route('/api/cluster-data', methods=['GET'])
def get_cluster_data_all():
    return get_cluster_data()

@app.route('/get_aircraft_specs', methods=['GET'])
def get_aircraft_specs_75_similarity():
    return get_aircraft_specs()

@app.route('/get_accident_rate_engine_amount', methods=['GET'])
def get_accident_rate_per_engine_amount_api():
    return get_accident_rate_per_engine_amount()

@app.route('/get_accident_rate_weight_amount', methods=['GET'])
def get_accident_rate_per_weight_class_api():
    return get_accident_rate_per_weight_class()

@app.route('/get_accident_rate_wingspan_bin', methods=['GET'])
def get_accident_rate_per_wingspan_bin_api():
    return get_accident_rate_per_wingspan_bin()

@app.route('/accident-data', methods=['GET'])
def get_accident_data():
    return get_all_accident_data_without_summaries()

@app.route('/get_passenger_crew_aboard', methods=['GET'])
def get_passenger_crew_aboard_boxplot_api():
    return get_passenger_crew_aboard_boxplot()

@app.route('/get_accident_rate_length_bin', methods=['GET'])
def get_accident_rate_per_length_bin_api():
    return get_accident_rate_per_length_bin()

@app.route('/crash-locations', methods=['GET'])
def get_crash_locations():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date are required"}), 400
    
    result = get_crash_locations_data_optimized(start_date, end_date)
    return result

@app.route('/flight-routes', methods=['GET'])
def get_flight_routes():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date are required"}), 400
    
    result = get_flight_routes_data_optimized(start_date, end_date)
    return result

if __name__ == '__main__':
    app.run(debug=True)