import pandas as pd
import csv
import json
import os
import sys
import numpy as np
import math
import re
from flask import request, jsonify
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from aviation.scripts.summary_clustering import clustering_main

def get_operator_country_amount_by_range(start_date, end_date):
    df = pd.read_csv('../planecrash_data/planecrash_dataset_with_operator_country.csv')
    df['Date'] = pd.to_datetime(df['Date'], format='%B %d, %Y')

    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)

    filtered_df = df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]

    country_counts = filtered_df['Operator Country'].value_counts().reset_index()
    country_counts.columns = ['Operator Country', 'Count']
    country_counts = country_counts.sort_values(by="Count", ascending=False)
    
    result_json = country_counts.to_json(orient='records')
    return result_json

def get_list_of_manufacturers():
    manufacturers = []

    with open('../planecrash_data/manufacturer_list.csv', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)
        for row in reader:
            manufacturers.append(row[0])
    return manufacturers

def get_number_of_accidents():
    accidents_df = pd.read_csv('../planecrash_data/planecrash_dataset_with_manufacturers.csv')
    manufacturers_df = pd.read_csv('../planecrash_data/manufacturer_list.csv')
    accidents_df = accidents_df.dropna(subset=['Year', 'Manufacturer'])
    accidents_df['Year'] = accidents_df['Year'].astype(int)
    accidents_df['5_year_group'] = (accidents_df['Year'] // 5) * 5
    all_manufacturers = manufacturers_df['Manufacturer'].dropna().unique()
    grouped = accidents_df.groupby(['5_year_group', 'Manufacturer']).size().unstack(fill_value=0)

    for manufacturer in all_manufacturers:
        if manufacturer not in grouped.columns:
            grouped[manufacturer] = 0

    grouped = grouped[sorted(grouped.columns)]
    grouped = grouped.reset_index().rename(columns={'5_year_group': 'year'})
    result = grouped.to_dict(orient='records')
    json_result = json.dumps(result, indent=4)
    return json_result

def get_number_of_accidents_per_year():
    crashes_df = pd.read_csv("../planecrash_data/planecrash_dataset_with_manufacturers.csv")
    manufacturers_df = pd.read_csv("../planecrash_data/manufacturer_list.csv")
    
    # Get list of all unique manufacturers
    all_manufacturers = manufacturers_df['Manufacturer'].tolist()
    
    # Get list of all years in the crashes data
    all_years = crashes_df['Year'].unique()
    
    result = []
    
    # For each year, count occurrences of each manufacturer
    for year in sorted(all_years):
        year_data = {"year": int(year)}
        
        year_crashes = crashes_df[crashes_df['Year'] == year]
        
        # Count each manufacturer
        for manufacturer in all_manufacturers:
            count = len(year_crashes[year_crashes['Manufacturer'] == manufacturer])
            year_data[manufacturer] = count
        
        result.append(year_data)
    
    return json.dumps(result, indent=2)

def get_cluster_data():
    print("testing")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.abspath(os.path.join(base_dir, '..', 'planecrash_data'))

    input_file = os.path.join(data_dir, 'planecrash_dataset_with_operator_country.csv')
    clustered_csv_file = os.path.join(data_dir, 'aircraft_crashes_clustered.csv')
    output_json_file = os.path.join(data_dir, 'clustering_output.json')
    
    # Check if the clustering output files exist
    regenerate = request.args.get('regenerate', 'false').lower() == 'true'
    missing_output = not (os.path.exists(clustered_csv_file) and os.path.exists(output_json_file))
    
    if regenerate or missing_output:
        if not os.path.exists(input_file):
            return jsonify({"error": f"Input file not found: {input_file}"}), 404
        try:
            clustering_main(input_file, output_json_file)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Error generating clustering data: {str(e)}"}), 500
    try:
        # Load clustered output
        with open(output_json_file, 'r') as f:
            cluster_data = json.load(f)

        df = pd.read_csv(clustered_csv_file)

        points = []
        for _, row in df.iterrows():
            points.append({
                "x": float(row.get('x', 0)),
                "y": float(row.get('y', 0)),
                "kmeans_cluster": int(row.get('kmeans_cluster', 0)),
                "kmeans_interpretation": row.get('kmeans_cluster_interpretation', "Unknown"),
                "summary": row.get('Summary', ""),
                "Year": int(row.get('Year', 0)) if pd.notna(row.get('Year')) else None,
                "Date": str(row.get('Date', "")) if pd.notna(row.get('Date')) else None,
                "location": str(row.get('Location', "")) if pd.notna(row.get('Location')) else None,
                "aircraft_type": str(row.get('AC Type', "")) if pd.notna(row.get('AC Type')) else None,
                "fatalities": int(row.get('Fatalities', 0)) if pd.notna(row.get('Fatalities')) and str(row.get('Fatalities')).isdigit() else None,
                "operator": str(row.get('Operator', "")) if pd.notna(row.get('Operator')) else None,
                "operator_country": str(row.get('Operator Country', "")) if pd.notna(row.get('Operator Country')) else "Unknown",
                "date": str(row.get('Date', "")) if pd.notna(row.get('Date')) else None
            })

        distribution = df['kmeans_cluster_interpretation'].value_counts().to_dict()

        cluster_data["points"] = points
        cluster_data["kmeans"]["distribution"] = distribution

        return jsonify(cluster_data)

    except FileNotFoundError:
        return jsonify({"error": "Clustering data not found"}), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error reading clustering data: {str(e)}"}), 500

def get_aircraft_specs():
    df = pd.read_csv('../planecrash_data/accidents_with_specs.csv')
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    # print(f"Number of records with Similarity_Score >= 75: {len(filtered_df)}")

    columns_to_keep = [
        'ICAO_Code', 'FAA_Designator', 'Manufacturer', 'Model_FAA', 'Model_BADA',
        'Physical_Class_Engine', 'Num_Engines', 'AAC', 'AAC_minimum', 'AAC_maximum',
        'ADG', 'TDG', 'Approach_Speed_knot', 'Approach_Speed_minimum_knot',
        'Approach_Speed_maximum_knot', 'Wingspan_ft_without_winglets_sharklets',
        'Wingspan_ft_with_winglets_sharklets', 'Length_ft', 'Tail_Height_at_OEW_ft',
        'Wheelbase_ft', 'Cockpit_to_Main_Gear_ft', 'Main_Gear_Width_ft', 'MTOW_lb',
        'MALW_lb', 'Main_Gear_Config', 'ICAO_WTC', 'Parking_Area_ft2', 'Class',
        'FAA_Weight', 'CWT', 'One_Half_Wake_Category', 'Two_Wake_Category_Appx_A',
        'Two_Wake_Category_Appx_B', 'Rotor_Diameter_ft', 'SRS', 'LAHSO', 'FAA_Registry',
        'Registration_Count', 'TMFS_Operations_FY24', 'Remarks', 'LastUpdate',
        'Matched_Model_BADA', 'Similarity_Score'
    ]

    filtered_df = filtered_df.reindex(columns=columns_to_keep)
    return filtered_df.to_json(orient='records', force_ascii=False)

def get_accident_rate_per_engine_amount():
    df = pd.read_csv('../planecrash_data/accidents_with_specs.csv')
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    amount = filtered_df['Num_Engines'].value_counts()

    amount_json = json.dumps(amount.to_dict(), indent=2)

    return amount_json

def get_accident_rate_per_weight_class():
    df = pd.read_csv('../planecrash_data/accidents_with_specs.csv')
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    weights = filtered_df['MTOW_lb'].dropna()

    # Define weight classes based on your criteria
    def classify_weight(w):
        if w > 255000:
            return "Heavy"
        elif w > 41000:
            return "Large"
        elif w > 12500:
            return "Medium"
        else:
            return "Small"

    # Classify each weight
    weight_classes = weights.apply(classify_weight)

    # Count the number of occurrences in each class
    counts = weight_classes.value_counts().to_dict()

    # Make sure all classes appear in the output, even if count is zero
    all_classes = ["Small", "Medium", "Large", "Heavy"]
    result = {cls: counts.get(cls, 0) for cls in all_classes}

    return json.dumps(result, indent=2)


def get_accident_rate_per_wingspan_bin():
    df = pd.read_csv("../planecrash_data/accidents_with_specs.csv")
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    wingspans = filtered_df["Wingspan_ft_without_winglets_sharklets"].fillna(
        filtered_df["Wingspan_ft_with_winglets_sharklets"]
    ).dropna().astype(float)

    bin_width = 10

    data_min = math.floor(wingspans.min() / bin_width) * bin_width
    data_max = math.ceil(wingspans.max() / bin_width) * bin_width

    bins = np.arange(data_min, data_max + bin_width, bin_width)

    bin_counts, bin_edges = np.histogram(wingspans, bins=bins)

    histogram_json = [
        {
            "bin_start": int(bin_edges[i]),
            "bin_end": int(bin_edges[i + 1]),
            "accident_count": int(bin_counts[i])
        }
        for i in range(len(bin_counts))
    ]

    json_output = json.dumps(histogram_json, indent=2)
    return json_output

def get_all_accident_data_without_summaries():
    df = pd.read_csv('../planecrash_data/planecrash_dataset_with_operator_country.csv')
    
    columns_to_keep = [
        'AC Type',
        'Aboard',
        'Date',
        'Fatalities',
        'Flight #',
        'Ground',
        'Location',
        'Operator',
        'Registration',
        'Route',
        'Time',
        'Year',
        'cn / ln',
        'Operator Country'
    ]
    
    available_columns = [col for col in columns_to_keep if col in df.columns]
    filtered_df = df[available_columns]
    
    result_json = filtered_df.to_json(orient='records', force_ascii=False)
    return result_json


def get_passenger_crew_aboard_boxplot():
    df = pd.read_csv('../planecrash_data/accidents_with_specs.csv')
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    def classify_weight(w):
        if w > 255000:
            return "Heavy"
        elif w > 41000:
            return "Large"
        elif w > 12500:
            return "Medium"
        else:
            return "Small"

    filtered_df = filtered_df.dropna(subset=['MTOW_lb'])
    filtered_df['Weight_Class'] = filtered_df['MTOW_lb'].apply(classify_weight)

    filtered_df = filtered_df.dropna(subset=['MTOW_lb'])
    filtered_df['Weight_Class'] = filtered_df['MTOW_lb'].apply(classify_weight)

    def parse_aboard(aboard_str):
        passengers, crew = np.nan, np.nan
        if isinstance(aboard_str, str):
            match_passengers = re.search(r"passengers:\s*(\d+|\?)", aboard_str)
            match_crew = re.search(r"crew:\s*(\d+|\?)", aboard_str)
            if match_passengers:
                val = match_passengers.group(1)
                passengers = int(val) if val.isdigit() else np.nan
            if match_crew:
                val = match_crew.group(1)
                crew = int(val) if val.isdigit() else np.nan
        return pd.Series({"Passengers": passengers, "Crew": crew})

    parsed = filtered_df['Aboard'].apply(parse_aboard)
    filtered_df = pd.concat([filtered_df, parsed], axis=1)

    filtered_df = filtered_df.dropna(subset=['Passengers', 'Crew'], how='all')

    output_data = {
        "passengers": {},
        "crew": {}
    }

    for wc in ['Small', 'Medium', 'Large', 'Heavy']:
        df_wc = filtered_df[filtered_df['Weight_Class'] == wc]
        output_data['passengers'][wc] = df_wc['Passengers'].dropna().astype(int).tolist()
        output_data['crew'][wc] = df_wc['Crew'].dropna().astype(int).tolist()

    return output_data


def get_accident_rate_per_wingspan_bin():
    df = pd.read_csv("../planecrash_data/accidents_with_specs.csv")
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    wingspans = filtered_df["Wingspan_ft_without_winglets_sharklets"].fillna(
        filtered_df["Wingspan_ft_with_winglets_sharklets"]
    ).dropna().astype(float)

    bin_width = 10

    data_min = math.floor(wingspans.min() / bin_width) * bin_width
    data_max = math.ceil(wingspans.max() / bin_width) * bin_width

    bins = np.arange(data_min, data_max + bin_width, bin_width)

    bin_counts, bin_edges = np.histogram(wingspans, bins=bins)

    histogram_json = [
        {
            "bin_start": int(bin_edges[i]),
            "bin_end": int(bin_edges[i + 1]),
            "accident_count": int(bin_counts[i])
        }
        for i in range(len(bin_counts))
    ]

    json_output = json.dumps(histogram_json, indent=2)
    return json_output


def get_accident_rate_per_length_bin():
    df = pd.read_csv("../planecrash_data/accidents_with_specs.csv")
    df['Similarity_Score'] = pd.to_numeric(df['Similarity_Score'], errors='coerce')
    filtered_df = df[df['Similarity_Score'] >= 75]

    lengths = filtered_df["Length_ft"].dropna().astype(float)

    bin_width = 10

    data_min = math.floor(lengths.min() / bin_width) * bin_width
    data_max = math.ceil(lengths.max() / bin_width) * bin_width

    bins = np.arange(data_min, data_max + bin_width, bin_width)

    bin_counts, bin_edges = np.histogram(lengths, bins=bins)

    histogram_json = [
        {
            "bin_start": int(bin_edges[i]),
            "bin_end": int(bin_edges[i + 1]),
            "accident_count": int(bin_counts[i])
        }
        for i in range(len(bin_counts))
    ]

    json_output = json.dumps(histogram_json, indent=2)
    return json_output
