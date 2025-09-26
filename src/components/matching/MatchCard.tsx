interface MatchResult {
    id: string;
    name: string;
    avatar?: string;
    score: number;
    sharedCourses: string[];
    department?: string;
    year?: number;
    studyLevel?: string;
    studyFormat?: string;
    availability?: string[];
    additionalNotes?: string;
}

interface MatchCardProps extends MatchResult { }

export default function MatchCard({
    name,
    avatar,
    score,
    sharedCourses,
    department,
    year,
    studyLevel,
    studyFormat,
    availability,
    additionalNotes
}: MatchCardProps) {
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 border-green-600';
        if (score >= 70) return 'text-blue-600 border-blue-600';
        if (score >= 50) return 'text-yellow-600 border-yellow-600';
        return 'text-gray-600 border-gray-600';
    };

    const formatStudyFormat = (format?: string) => {
        if (!format) return '';
        return format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatStudyLevel = (level?: string) => {
        if (!level) return '';
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
            <div className="flex flex-col items-center">
                {/* Profile Photo */}
                <div className="relative">
                    <img
                        src={avatar || '/avatar.jpg'}
                        alt={name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                    {/* Compatibility Score Ring */}
                    <div className={`absolute -top-2 -right-2 w-12 h-12 rounded-full border-4 bg-white flex items-center justify-center ${getScoreColor(score)}`}>
                        <span className="text-xs font-bold">{score}%</span>
                    </div>
                </div>

                {/* Name and Info */}
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{name}</h3>
                {(department || year) && (
                    <p className="text-sm text-gray-600">
                        {department} {year && `• Year ${year}`}
                    </p>
                )}

                {/* Study Info */}
                {(studyLevel || studyFormat) && (
                    <div className="mt-2 flex gap-2">
                        {studyLevel && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                                {formatStudyLevel(studyLevel)}
                            </span>
                        )}
                        {studyFormat && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">
                                {formatStudyFormat(studyFormat)}
                            </span>
                        )}
                    </div>
                )}

                {/* Shared Courses */}
                <div className="mt-4 w-full">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Shared Subjects</h4>
                    <div className="flex flex-wrap gap-1">
                        {sharedCourses.slice(0, 3).map((course, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                            >
                                {course}
                            </span>
                        ))}
                        {sharedCourses.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                +{sharedCourses.length - 3} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Common Availability */}
                {availability && availability.length > 0 && (
                    <div className="mt-3 w-full">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Common Times</h4>
                        <div className="flex flex-wrap gap-1">
                            {availability.slice(0, 3).map((time, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md"
                                >
                                    {time}
                                </span>
                            ))}
                            {availability.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                    +{availability.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Notes */}
                {additionalNotes && (
                    <div className="mt-3 w-full">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">About them</h4>
                        <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-md">
                            &ldquo;{additionalNotes}&rdquo;
                        </p>
                    </div>
                )}

                {/* Compatibility Details */}
                <div className="mt-4 w-full p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 text-center">
                        {score >= 90 && "🌟 Excellent match! You have very similar study interests."}
                        {score >= 70 && score < 90 && "✨ Great match! You share several study topics."}
                        {score >= 50 && score < 70 && "👍 Good match! Some overlapping interests."}
                        {score < 50 && "🤝 Potential match! Could learn from each other."}
                    </p>
                </div>
            </div>
        </div>
    );
}