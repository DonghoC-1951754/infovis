import pandas as pd

def add_operator_country(main_csv):
    prefix_df = pd.read_csv("./planecrash_data/registration_prefixes.csv")

    for index, row in main_csv.iterrows():
        registration = row['Registration']
        year = int(row['Year'])

        for prefix_index, prefix_row in prefix_df.iterrows():
            period = 0
            if not pd.isna(prefix_row['Period']):
                period = int(str(prefix_row['Period']).rstrip('-'))

            if year >= period and registration.startswith(str(prefix_row['Current Prefix'])):
                main_csv.at[index, 'Operator Country'] = prefix_row['Country Name']
                print(f"Row {index}: Registration = {row['Registration']}, Year = {row['Year']}, Country = {prefix_row['Country Name']}")
                break
            elif year < period and registration.startswith(str(prefix_row['Old Prefix'])):
                main_csv.at[index, 'Operator Country'] = prefix_row['Country Name']
                print(f"Row {index}: Registration = {row['Registration']}, Year = {row['Year']}, Country = {prefix_row['Country Name']}")
                break
    main_csv.to_csv("./planecrash_data/planecrash_dataset_with_operator_country.csv", index=False)

def add_aircraft_manufacturer(main_csv):
    accidents_df = pd.read_csv("./planecrash_data/planecrash_dataset.csv")
    manufacturer_df = pd.read_csv("./planecrash_data/aircraft_and_manufacturers.csv")

    manufacturers = pd.concat([
    manufacturer_df['Aircraft_Manufacturer'],
    manufacturer_df['Manufacturer']
    ])

    # Drop missing, split comma-separated names, strip whitespace, lowercase, deduplicate
    manufacturers = manufacturers.dropna()
    manufacturers = manufacturers.str.split(',', expand=True).stack().str.strip().str.lower().drop_duplicates()

    # Save the cleaned manufacturer list to CSV
    manufacturer_list_df = pd.DataFrame(manufacturers.sort_values().str.title(), columns=["Manufacturer"])
    manufacturer_list_df.to_csv("./planecrash_data/manufacturer_list.csv", index=False)
    print("Manufacturer list saved to 'manufacturer_list.csv'")

    # Clean 'AC Type' and 'Operator' columns for text matching
    accidents_df['AC Type Clean'] = accidents_df['AC Type'].fillna('').str.lower()
    accidents_df['Operator Clean'] = accidents_df['Operator'].fillna('').str.lower()

    # Matching function — checks if any manufacturer appears in AC Type or Operator (or vice versa)
    def find_manufacturer(ac_type, operator):
        for m in manufacturers:
            if m in ac_type or ac_type in m or m in operator or operator in m:
                return m.title()  # Capitalized nicely
        return 'Unknown'

    # Apply the matching logic to each row
    accidents_df['Manufacturer'] = accidents_df.apply(
        lambda row: find_manufacturer(row['AC Type Clean'], row['Operator Clean']),
        axis=1
    )

    # Drop helper columns
    accidents_df.drop(columns=['AC Type Clean', 'Operator Clean'], inplace=True)

    # Save final CSV with added Manufacturer column
    accidents_df.to_csv("./planecrash_data/planecrash_dataset_with_manufacturers.csv", index=False)
    print("Done! Final data saved to 'accidents_with_manufacturers.csv'")

def main():
    main_csv = pd.read_csv("./planecrash_data/planecrash_dataset.csv")

    # add_operator_country(main_csv)
    add_aircraft_manufacturer(main_csv)
    
    return

if __name__ == "__main__":
    main()