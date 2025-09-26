'use client';

const TIME_SLOTS = [
    'Early Morning (6-9 AM)',
    'Morning (9-12 PM)',
    'Afternoon (12-3 PM)',
    'Evening (3-6 PM)',
    'Night (6-9 PM)',
    'Late Night (9-12 AM)'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AvailabilityPickerProps {
    value: string[];
    onChange: (availability: string[]) => void;
}

export default function AvailabilityPicker({ value, onChange }: AvailabilityPickerProps) {
    const toggleSlot = (slot: string) => {
        if (value.includes(slot)) {
            onChange(value.filter(s => s !== slot));
        } else {
            onChange([...value, slot]);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
                When are you available to study?
            </h3>
            <p className="text-sm text-gray-600">
                Select your preferred study times. We&apos;ll match you with people who have similar availability.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium text-gray-700 mb-3">Time Slots</h4>
                    <div className="space-y-2">
                        {TIME_SLOTS.map(slot => (
                            <label
                                key={slot}
                                className="flex items-center space-x-3 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={value.includes(slot)}
                                    onChange={() => toggleSlot(slot)}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                                />
                                <span className="text-sm text-gray-700">{slot}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium text-gray-700 mb-3">Preferred Days</h4>
                    <div className="space-y-2">
                        {DAYS.map(day => (
                            <label
                                key={day}
                                className="flex items-center space-x-3 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={value.includes(day)}
                                    onChange={() => toggleSlot(day)}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                                />
                                <span className="text-sm text-gray-700">{day}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {value.length > 0 && (
                <div className="mt-4 p-3 bg-primary/5 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-1">Your availability:</p>
                    <p className="text-sm text-gray-600">{value.join(', ')}</p>
                </div>
            )}
        </div>
    );
}