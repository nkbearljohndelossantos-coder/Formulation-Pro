#!/bin/bash
# Script to add defer attribute to all HTML files

files=(
  "create-cosmetics.html"
  "create-food-supplement.html"
  "create-perfume.html"
  "create-s-food-supplement.html"
  "create-s-perfume.html"
)

for file in "${files[@]}"; do
  sed -i 's/<script type="text\/javascript" src="supabase-client.js">/<script type="text\/javascript" src="supabase-client.js" defer>/g' "$file"
  sed -i 's/<script type="text\/javascript" src="auth.js">/<script type="text\/javascript" src="auth.js" defer>/g' "$file"
  sed -i 's/<script type="text\/javascript" src="db-operations.js">/<script type="text\/javascript" src="db-operations.js" defer>/g' "$file"
done

echo "Done updating all files"
