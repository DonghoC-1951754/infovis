import pandas as pd
import csv
import json

def get_operator_country_amount_by_range(start_date, end_date):
    df = pd.read_csv('../planecrash_data/planecrash_dataset_with_operator_country.csv')
    df['Date'] = pd.to_datetime(df['Date'], format='%B %d, %Y')

    # Define start and end dates
    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)

    filtered_df = df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]

    country_counts = filtered_df['Operator Country'].value_counts().reset_index()
    country_counts.columns = ['Operator Country', 'Count']
    country_counts = country_counts.sort_values(by="Count", ascending=False)
    # Convert the result to JSON format
    result_json = country_counts.to_json(orient='records')
    return result_json

def get_list_of_manufacturers():
    manufacturers = []

    with open('../planecrash_data/manufacturer_list.csv', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip header
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
