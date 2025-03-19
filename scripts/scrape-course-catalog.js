const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Base URL for the UF catalog
const baseUrl = 'https://catalog.ufl.edu';
const coursesUrl = `${baseUrl}/UGRD/courses/`;

// Store all department links
const departments = [];
// Store all courses
const allCourses = [];

// Function to fetch HTML content from a URL
async function fetchHtml(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Function to extract all department links from the main page
async function getDepartmentLinks() {
  console.log('Fetching main catalog page...');
  const html = await fetchHtml(coursesUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const links = [];

  // Find department links in the A-Z section
  $('h2').each((index, element) => {
    if ($(element).text().match(/^[A-Z]$/)) {
      // Found a letter section, get all links underneath it
      const nextElement = $(element).next();
      nextElement.find('a').each((i, link) => {
        const href = $(link).attr('href');
        if (href && href.includes('/UGRD/courses/')) {
          links.push({
            name: $(link).text().trim(),
            url: `${baseUrl}${href}`
          });
        }
      });
    }
  });

  console.log(`Found ${links.length} department links`);
  return links;
}

// Function to extract courses from a department page
async function extractCoursesFromDepartment(department) {
  console.log(`Scraping ${department.name}...`);
  const html = await fetchHtml(department.url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const courses = [];
  const departmentId = department.name.split('|')[0].trim().replace(/\s+/g, '_');

  // Course blocks are typically in divs with class 'courseblock'
  $('.courseblock').each((index, element) => {
    try {
      // Extract course code and title
      const titleElement = $(element).find('.courseblocktitle');
      const titleText = titleElement.text().trim();
      
      // Parse course code and title (format is typically "ABC 1234 Course Title")
      const match = titleText.match(/^([A-Z]{3})\s+(\d{4}[A-Z]?)\s+(.*?)$/);
      
      if (match) {
        const coursePrefix = match[1];
        const courseNumber = match[2];
        const courseTitle = match[3].trim();
        const courseId = `${coursePrefix}${courseNumber}`;
        
        // Extract description
        const descriptionElement = $(element).find('.courseblockdesc');
        let description = descriptionElement.text().trim();
        description = description.replace(/^Description: /, '').trim();
        
        // Extract credits if available (appears in the format "Credits: X")
        let credits = null;
        if (description.includes('Credits:')) {
          const creditsMatch = description.match(/Credits:\s*(\d+)/);
          if (creditsMatch) {
            credits = parseInt(creditsMatch[1], 10);
          }
        }
        
        courses.push({
          id: courseId,
          description: courseTitle,
          department: department.name,
          departmentId: departmentId,
          credits: credits,
          fullDescription: description
        });
      }
    } catch (error) {
      console.error(`Error parsing course in ${department.name}:`, error);
    }
  });

  console.log(`Found ${courses.length} courses in ${department.name}`);
  return courses;
}

// Function to categorize courses by their prefix for our constants file
function categorizeByPrefix(courses) {
  const byPrefix = {};
  
  courses.forEach(course => {
    // Extract prefix (first 3 letters of course ID)
    const prefix = course.id.substring(0, 3);
    
    if (!byPrefix[prefix]) {
      byPrefix[prefix] = [];
    }
    
    byPrefix[prefix].push({
      id: course.id,
      description: course.description,
      department: course.department,
      credits: course.credits || 3 // Default to 3 credits if not specified
    });
  });
  
  return byPrefix;
}

// Function to generate constants file content
function generateConstantsFile(coursesByPrefix) {
  let content = `export interface Course {
  id: string;       // Course code, e.g., "COP3502"
  description: string;  // Course description, e.g., "Programming Fundamentals"
  department?: string;  // Department offering the course
  credits?: number;     // Credit hours
}\n\n`;

  // Add all departmental course arrays
  Object.keys(coursesByPrefix).sort().forEach(prefix => {
    const courses = coursesByPrefix[prefix];
    const departmentName = courses[0].department.split('|')[0].trim().replace(/\s+/g, '_').toUpperCase();
    
    content += `// UF ${departmentName} Courses\n`;
    content += `const ${prefix}_COURSES: Course[] = [\n`;
    
    courses.forEach(course => {
      content += `  { id: "${course.id}", description: "${escapeString(course.description)}", department: "${escapeString(course.department)}", credits: ${course.credits} },\n`;
    });
    
    content += `];\n\n`;
  });

  // Add the combined array
  content += `// Combine all courses\n`;
  content += `export const ALL_COURSES: Course[] = [\n`;
  
  Object.keys(coursesByPrefix).sort().forEach(prefix => {
    content += `  ...${prefix}_COURSES,\n`;
  });
  
  content += `];\n\n`;

  // Add helper functions
  content += `// Helper function to get course by ID
export const getCourseById = (courseId: string): Course | undefined => {
  return ALL_COURSES.find(course => course.id === courseId);
};

// Helper function to get courses by department
export const getCoursesByDepartment = (department: string): Course[] => {
  return ALL_COURSES.filter(course => course.department === department);
};

// Export categorized courses for filtered views
export const COURSES_BY_PREFIX = {
${Object.keys(coursesByPrefix).sort().map(prefix => `  "${prefix}": ${prefix}_COURSES`).join(',\n')}
};`;

  return content;
}

// Helper function to escape string for JavaScript
function escapeString(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Main function to run the scraper
async function runScraper() {
  try {
    // 1. Get all department links
    const departments = await getDepartmentLinks();
    
    // 2. Extract courses from each department (limiting to a few for testing)
    let allCourses = [];
    
    // Process all departments
    for (const department of departments) {
      const departmentCourses = await extractCoursesFromDepartment(department);
      allCourses = [...allCourses, ...departmentCourses];
      
      // Optional: Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. Categorize courses by prefix for our constants file
    const coursesByPrefix = categorizeByPrefix(allCourses);
    
    // 4. Generate constants file content
    const constantsContent = generateConstantsFile(coursesByPrefix);
    
    // 5. Write to file
    const outputPath = path.join(__dirname, '..', 'src', 'constants', 'courses-full.ts');
    fs.writeFileSync(outputPath, constantsContent, 'utf8');
    
    console.log(`Successfully scraped ${allCourses.length} courses`);
    console.log(`Output written to ${outputPath}`);
    
    // Also write a JSON file with all course data for reference
    const jsonOutputPath = path.join(__dirname, '..', 'scripts', 'all-courses.json');
    fs.writeFileSync(jsonOutputPath, JSON.stringify(allCourses, null, 2), 'utf8');
    console.log(`Raw JSON data written to ${jsonOutputPath}`);
    
  } catch (error) {
    console.error('Error running scraper:', error);
  }
}

// Run the scraper
runScraper(); 