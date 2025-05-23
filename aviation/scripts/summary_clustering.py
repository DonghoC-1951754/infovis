import pandas as pd
import numpy as np
import re
import nltk
import os
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import silhouette_score
import sys
import json

# Your existing preprocessing code stays the same
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

# Keep your custom stopwords
unnecessary_words = ["crashed", "aircraft", "plane", "pilot", "crew", "flight", "runway", "approach", "taking", "mile",
                     "attempting", "route", "en", "ft", "due", "foot", "left", "right", "shortly", "two", "one",
                     "short", "minute", "caused", "procedure", "cause", "caused", "procedure", "airplane", "turn", "km", "resulted",
                     "went", "minimum", "maintain", "causing", "contributing", "final", "second", "factor", "take", "took",
                     "first", "resulting", "three", "named", "could", "later", "making", "possible", "north", "may", "decided",
                     "four", "began", "also", "il", "west", "several", "hour", "onto", "fl", "day", "u", "san", "de", "la",
                     "instead", "airport"]

generic_words = ["get", "came", "going", "became", "started", "many", "moment", "time", "day", "way", "part", "place",
                 "used", "use", "around", "area", "back", "front", "top", "point", "hand", "among", "along", "next",
                 "across", "already", "early", "late", "approximately", "eventually", "later", "long",
                 "shortly", "still", "suddenly", "sooner", "thereafter", "never", "before", "since", "after", "past", "soon",
                 "within"]

unrelated_words = ["singer", "soccer", "boy", "girl", "george", "john", "man", "woman", "son", "daughter", "home",
                   "town", "city", "island", "state", "district", "fort", "neighborhood", "stadium"]

people_words = ["president", "instructor", "trainee", "worker", "team",
                "survivor", "student", "official"]

filler_words = ["good", "bad", "hard", "soft", "strong", "weak", "large", "small", "full", "half", "several", "another",
                "both", "few", "one", "two", "three", "four", "five", "six", "seven", "eight", "ten", "hundred", "some",
                "any", "every", "most", "more", "less"]

abstract_words = ["try", "tried", "trying", "get", "getting", "go", "going", "come", "came", "became", "become",
                  "allow", "allowed", "ensuring",  "ensure", "cause", "caused", "causing",
                  "continue", "continued", "continued", "continuing"]

other_domain_words = ["singer", "soccer", "patient", "rice", "george", "john", "maria",
                    "paris", "france", "rome", "london", "moscow", "tokyo"]

ambiguous_words = ["thing", "something", "nothing", "everything", "stuff", "issue", "result", "factor", "reason"]

misc_words = ["called", "named", "told", "said", "asked", "heard", "seen", "seeing", "showed", "showing", "seen",
              "visible", "visibly", "invisible", "hidden", "show", "showing", "looked"]

custom_stopwords = set(
    unnecessary_words +
    generic_words +
    unrelated_words +
    people_words +
    filler_words +
    abstract_words +
    other_domain_words +
    ambiguous_words +
    misc_words
)

#Create comprehensive patterns for each category
patterns = {
    'Weather-related': {
        'keywords': ['storm', 'weather', 'lightning', 'thunderstorm', 'fog', 'rain', 'downdraft', 'wind',
                        'turbulence', 'icing', 'snow', 'hail', 'struck', 'severe', 'cloud', 'visibility'],
        'phrases': ['into a thunderstorm', 'struck by lightning', 'severe downdraft', 'weather conditions', 'unable to land because of clouds']
    },
    'Shot down/Military action': {
        'keywords': ['shot', 'fire', 'british', 'german', 'navy', 'army', 'military', 'aircraft', 'anti-aircraft',
                        'enemy', 'attack', 'combat', 'hit'],
        'phrases': ['shot down', 'hit by', 'anti-aircraft fire', 'by british aircraft', 'by aircraft fire']
    },
    'Terrorism': {
        'keywords': [
            'bomb', 'terrorist', 'explosive', 'device', 'detonated', 'hijack', 'hijacked',
            'sabotage', 'militant', 'extremist', 'terror', 'planted', 'exploded'
        ],
        'phrases': [
            'explosive device', 'planted bomb', 'detonated a bomb', 'hijacked the aircraft',
            'suspected terrorist attack', 'act of terrorism'
        ]
    },
    'Explosion/Fire': {
        'keywords': ['explode', 'explosion', 'fire', 'burn', 'flame', 'ignite', 'blast', 'caught'],
        'phrases': ['exploded and', 'caught fire', 'burst into flames', 'ignited causing']
    },
    'Combustible gas failure': {
        'keywords': ['hydrogen', 'gas', 'vented', 'ignited', 'sucked', 'combustible'],
        'phrases': ['hydrogen gas', 'gas vented', 'vented was', 'sucked into', 'gas ignited']
    },
    'Fuel-related': {
        'keywords': ['fuel', 'exhaustion', 'starvation', 'ran out'],
        'phrases': ['ran out of fuel', 'fuel exhaustion', 'fuel starvation']
    },
    'Control loss': {
        'keywords': ['control', 'lost', 'nose', 'dive', 'altitude', 'stall', 'spin', 'jambed', 'loss'],
        'phrases': ['lost control', 'nose-dived', 'loss of control', 'controls jambed', 'dive into']
    },
    'Mechanical failure': {
        'keywords': ['propeller', 'mechanical', 'failure', 'wire', 'structure', 'loose', 'separated', 'engine',
                        'broke', 'malfunction', 'tearing'],
        'phrases': ['propeller separated', 'mechanical failure', 'engine failure', 'structural failure',
                    'tearing loose']
    },
    'Pilot error': {
        'keywords': ['error', 'attempt', 'landing', 'reposition', 'maneuver', 'mistake', 'judgment', 'trying', 'navigational'],
        'phrases': ['pilot error', 'pilot tried', 'attempting to land', 'tried to reposition', 'landing attempt']
    },
    'Test/Demonstration flight': {
        'keywords': ['demonstration', 'test', 'show', 'display', 'experimental', 'prototype'],
        'phrases': ['demonstration flight', 'test flight', 'air show', 'during a demonstration']
    },
    'Terrain collision': {
        'keywords': ['mountain', 'ridge', 'hill', 'terrain', 'elevation', 'summit', 'cfit'],
        'phrases': ['crashed into a mountain', 'into terrain', 'crashed into a ridge', 'controlled flight into terrain']
    },
    'Cargo mishandling': {
        'keywords': ['cargo', 'improperly loaded', 'overloaded', 'shifted'],
        'phrases': ['improperly loaded cargo', 'cargo shifted']
    },
    'Infrastructure collision': {
        'keywords': ['house', 'building', 'shop', 'village', 'urban', 'structure', 'rooftop'],
        'phrases': ['crashed into a village', 'into a building', 'into a shop', 'crashed into a house', 'into the roof']
    }
}

CATEGORY_PRIORITY = [
    'Weather-related',
    'Mechanical failure',
    'Fuel-related',
    'Combustible gas failure',
    'Shot down/Military action',
    'Pilot error',
    'Control loss',
    'Terrorism',
    'Terrain collision',
    'Infrastructure collision',
    'Cargo mishandling',
    'Explosion/Fire',
    'Test/Demonstration flight',
    'Unclear cause'
]

stop_words = set(stopwords.words('english')).union(custom_stopwords)


def calculate_category_scores(text, patterns):
    """Calculate score for each category based on keywords and phrases"""
    text_lower = text.lower()
    scores = {}

    for category, pattern_dict in patterns.items():
        score = 0

        # Score keywords (weight: 1)
        for keyword in pattern_dict['keywords']:
            if keyword in text_lower:
                score += 1

        # Score phrases (weight: 2 - more important)
        for phrase in pattern_dict['phrases']:
            if phrase in text_lower:
                score += 2

        scores[category] = score

    return scores


def hybrid_clustering_approach(df, summary_column):
    """Combine rule-based categorization with clustering validation"""

    # Step 1: Rule-based initial categorization
    def categorize_by_rules(text):
        scores = calculate_category_scores(text, patterns)

        # Filter only categories with a non-zero score
        matched_categories = {cat: score for cat, score in scores.items() if score > 0}

        if not matched_categories:
            return "Unclear cause"
        
        # Get the maximum score
        max_score = max(matched_categories.values())

        # Get all categories with the max score
        tied_categories = [cat for cat, score in matched_categories.items() if score == max_score]

        # Break tie with category priority
        sorted_tied = sorted(tied_categories, key=lambda cat: CATEGORY_PRIORITY.index(cat))
        return sorted_tied[0]


    df['rule_based_category'] = df[summary_column].apply(categorize_by_rules)

    # Step 2: TF-IDF clustering for validation/refinement
    def preprocess_text(text):
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        tokens = word_tokenize(text)
        tokens = [word for word in tokens if word not in stop_words and len(word) > 2]
        lemmatizer = WordNetLemmatizer()
        tokens = [lemmatizer.lemmatize(word) for word in tokens]
        return ' '.join(tokens)

    df['processed_summary'] = df[summary_column].apply(preprocess_text)
    df = df[df['processed_summary'].str.strip() != ""].reset_index(drop=True)

    # Create TF-IDF vectors
    tfidf_vectorizer = TfidfVectorizer(max_features=1000, min_df=1, max_df=0.95)
    tfidf_matrix = tfidf_vectorizer.fit_transform(df['processed_summary'])
    tfidf_norm = normalize(tfidf_matrix)

    # Dimensionality reduction
    n_components = min(20, tfidf_norm.shape[1] - 1, tfidf_norm.shape[0] - 1)
    svd = TruncatedSVD(n_components=n_components)
    reduced_features = svd.fit_transform(tfidf_norm)

    # Save coordinates for visualization
    df['x'] = reduced_features[:, 0]
    df['y'] = reduced_features[:, 1]

    # Step 3: K-means with 8 clusters to validate rule-based approach
    kmeans = KMeans(n_clusters=8, random_state=42, n_init=10)
    df['kmeans_cluster'] = kmeans.fit_predict(reduced_features)

    # Step 4: Create hybrid categories
    def create_hybrid_category(row):
        rule_cat = row['rule_based_category']
        cluster_id = row['kmeans_cluster']

        if rule_cat != "Unclear cause":
            return rule_cat

        cluster_mask = df['kmeans_cluster'] == cluster_id
        cluster_rule_cats = df.loc[cluster_mask, 'rule_based_category']
        clear_cats = cluster_rule_cats[cluster_rule_cats != "Unclear cause"]

        if len(clear_cats) > 0:
            # Select the category with highest priority (lowest index)
            sorted_cats = sorted(clear_cats, key=lambda cat: CATEGORY_PRIORITY.index(cat))
            return sorted_cats[0]

        return "Unclear cause"

    df['hybrid_category'] = df.apply(create_hybrid_category, axis=1)
    
    # Add the interpretation column for compatibility
    df['kmeans_cluster_interpretation'] = df['hybrid_category']

    return df, tfidf_matrix, tfidf_vectorizer


def analyze_cluster_quality(df):
    """Analyze the quality of categorization"""
    print("=== CATEGORIZATION ANALYSIS ===")

    # Rule-based results
    rule_counts = df['rule_based_category'].value_counts()
    print(f"\nRule-based categorization:")
    for cat, count in rule_counts.items():
        print(f"  {cat}: {count} ({count / len(df) * 100:.1f}%)")

    # Hybrid results
    hybrid_counts = df['hybrid_category'].value_counts()
    print(f"\nHybrid categorization:")
    for cat, count in hybrid_counts.items():
        print(f"  {cat}: {count} ({count / len(df) * 100:.1f}%)")

    # Print some examples if necessary
    # print(f"\n=== SAMPLE CATEGORIZATIONS ===")
    # for category in df['hybrid_category'].unique():
    #     if category != "Unclear cause":
    #         samples = df[df['hybrid_category'] == category].head(2)
    #         print(f"\n{category.upper()}:")
    #         for _, row in samples.iterrows():
    #             print(f"  • {row['Summary'][:150]}...")


def clustering_main(input_file, output_file):
    try:
        df = pd.read_csv(input_file, delimiter=',')
    except:
        try:
            df = pd.read_csv(input_file, delimiter='\t')
        except:
            df = pd.read_csv(input_file, delimiter=None, engine='python')

    if 'Summary' not in df.columns:
        possible_columns = [col for col in df.columns if 'summ' in col.lower() or 'desc' in col.lower()]
        if possible_columns:
            summary_column = possible_columns[0]
        else:
            raise ValueError("Couldn't find a column containing summaries.")
    else:
        summary_column = 'Summary'

    df = df.dropna(subset=[summary_column]).reset_index(drop=True)

    # Apply hybrid clustering
    df, tfidf_matrix, vectorizer = hybrid_clustering_approach(df, summary_column)

    # Analyze results
    analyze_cluster_quality(df)

    # Create category to ID mapping for consistent ordering
    unique_categories = sorted(df['hybrid_category'].unique())
    category_to_id = {category: idx for idx, category in enumerate(unique_categories)}
    
    # Add cluster IDs based on categories
    df['category_id'] = df['hybrid_category'].map(category_to_id)

    # Prepare clusters data in the format expected by frontend
    clusters_data = []
    for category in unique_categories:
        category_mask = df['hybrid_category'] == category
        cluster_id = category_to_id[category]
        
        clusters_data.append({
            "id": cluster_id,
            "interpretation": category,
            "size": int(category_mask.sum())
        })

    # Create distribution data
    distribution = {}
    for category in unique_categories:
        count = df[df['hybrid_category'] == category].shape[0]
        distribution[category] = count

    # Save JSON output in the format expected by frontend
    output_data = {
        "kmeans": {
            "clusters": clusters_data,
            "distribution": distribution
        }
    }

    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    # Save CSV with all results - use the correct output path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_output_file = os.path.abspath(os.path.join(script_dir, '..', '..', 'planecrash_data', 'aircraft_crashes_clustered.csv'))
    
    # Make sure we have the right column names for the frontend
    df['kmeans_cluster'] = df['category_id']  # Use category ID as cluster ID
    
    df.to_csv(csv_output_file, index=False)

    print(f"\nResults saved to {csv_output_file}")
    print(f"JSON output saved to {output_file}")
    return df