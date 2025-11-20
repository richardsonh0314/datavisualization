import kagglehub
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime

# Download latest version
path = kagglehub.dataset_download("tmdb/tmdb-movie-metadata")
print("Path to dataset files:", path)

# List all files in the downloaded directory
print("\nAvailable files:")
for file in os.listdir(path):
    print(f"  - {file}")

# Load the movies dataset
movies_df = pd.read_csv(os.path.join(path, 'tmdb_5000_movies.csv'))
print(f"\nMovies dataset shape: {movies_df.shape}")
print(f"Movies columns: {list(movies_df.columns)}")

# Load the credits dataset
credits_df = pd.read_csv(os.path.join(path, 'tmdb_5000_credits.csv'))
print(f"\nCredits dataset shape: {credits_df.shape}")
print(f"Credits columns: {list(credits_df.columns)}")

# Merge the two datasets on 'title'
merged_df = pd.merge(movies_df, credits_df, on=['title'], how='left')
print(f"\nMerged dataset shape: {merged_df.shape}")

# ============ DATA CLEANING ============

# 1. Clean and parse the release_date column
merged_df['release_date'] = pd.to_datetime(merged_df['release_date'], errors='coerce')
merged_df = merged_df.dropna(subset=['release_date'])

# 2. Extract month and year from release date
merged_df['release_month'] = merged_df['release_date'].dt.month
merged_df['release_year'] = merged_df['release_date'].dt.year

# 3. Clean revenue column - remove rows with 0 or null revenue
merged_df = merged_df[merged_df['revenue'] > 0]
print(f"\nDataset after removing zero revenue: {merged_df.shape}")

# 4. Parse genres column (it's in JSON format)
def parse_genres(genres_str):
    try:
        genres_list = json.loads(genres_str.replace("'", '"'))
        return [genre['name'] for genre in genres_list]
    except:
        return []

merged_df['genres_list'] = merged_df['genres'].apply(parse_genres)

# 5. Explode genres so each movie-genre combination gets its own row
exploded_df = merged_df.explode('genres_list')
exploded_df = exploded_df[exploded_df['genres_list'].notna()]
exploded_df = exploded_df[exploded_df['genres_list'] != '']

print(f"\nUnique genres found: {exploded_df['genres_list'].nunique()}")
print(f"Genres: {sorted(exploded_df['genres_list'].unique())}")

# ============ PREPARE DATA FOR D3 VISUALIZATION ============

# Get top 8 genres for better visualization
top_genres = exploded_df['genres_list'].value_counts().head(8).index.tolist()
print(f"\nTop 8 genres: {top_genres}")

# Filter for years with reasonable data (1990-2017)
exploded_df_filtered = exploded_df[
    (exploded_df['release_year'] >= 1990) & 
    (exploded_df['release_year'] <= 2017)
]

# Filter for top genres and aggregate by year
genre_trends = exploded_df_filtered[
    exploded_df_filtered['genres_list'].isin(top_genres)
].groupby(['release_year', 'genres_list']).size().reset_index(name='count')

# Create line chart format for D3
line_data = []
for genre in top_genres:
    genre_data = genre_trends[genre_trends['genres_list'] == genre]
    
    # Create complete year range
    all_years = list(range(1990, 2018))
    year_counts = dict(zip(genre_data['release_year'], genre_data['count']))
    
    values = []
    for year in all_years:
        values.append({
            'year': year,
            'count': year_counts.get(year, 0)
        })
    
    line_data.append({
        'genre': genre,
        'values': values
    })

# Save to JSON file
with open('genre_trends_data.json', 'w') as f:
    json.dump(line_data, f, indent=2)

print(f"\n✅ Data saved to genre_trends_data.json")
print(f"Years covered: 1990 to 2017")
print(f"Genres included: {', '.join(top_genres)}")

# Print summary statistics
for genre_item in line_data:
    total_movies = sum([v['count'] for v in genre_item['values']])
    avg_per_year = total_movies / len(genre_item['values'])
    print(f"  {genre_item['genre']}: {total_movies} total movies, avg {avg_per_year:.1f} per year")