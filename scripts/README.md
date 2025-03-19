# UF Course Catalog Scraper

This script scrapes the University of Florida course catalog website and generates a comprehensive constants file containing all departments and courses.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn

## Setup

1. Navigate to the `scripts` directory:
   ```
   cd scripts
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

## Running the Scraper

To run the scraper:

```
npm run scrape
```
or
```
yarn scrape
```

## Outputs

The script will generate two files:

1. `src/constants/courses-full.ts` - TypeScript constants file with all courses organized by department prefix
2. `scripts/all-courses.json` - JSON file with raw course data for reference

## How to Update the Application

After running the scraper:

1. Review the generated `courses-full.ts` file
2. Replace the current `src/constants/courses.ts` file with the generated file:
   ```
   cp src/constants/courses-full.ts src/constants/courses.ts
   ```

## Notes

- The scraper adds a small delay between requests to avoid overwhelming the UF catalog server
- Some courses may have inconsistent formats or missing information in the source data
- Course credits default to 3 if not specified 