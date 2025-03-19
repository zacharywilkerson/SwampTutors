import Link from "next/link";
import { getTutorsByRating } from "../firebase";

export default async function FeaturedTutors() {
  try {
    const tutors = await getTutorsByRating(4.5, 3);
    
    if (!tutors || tutors.length === 0) {
      return (
        <div className="text-center p-4">
          <p>No featured tutors available at the moment.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tutors.map((tutor: any) => (
          <div key={tutor.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{tutor.displayName}</h3>
              <div className="flex items-center mb-3">
                <span className="text-yellow-500 mr-1">★</span>
                <span>{tutor.rating.toFixed(1)}</span>
              </div>
              <p className="text-gray-700 mb-4 line-clamp-3">{tutor.bio || "No bio available"}</p>
              <p className="font-semibold mb-2">Courses:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {tutor.coursesTaught?.map((course: string) => (
                  <span key={course} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {course}
                  </span>
                ))}
              </div>
              <Link 
                href={`/tutor/${tutor.id}`}
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              >
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error fetching featured tutors:", error);
    return <div>Error loading featured tutors</div>;
  }
} 