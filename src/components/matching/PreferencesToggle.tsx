interface PreferencesToggleProps {
    value: boolean;
    onChange: (group: boolean) => void;
}

export default function PreferencesToggle({ value, onChange }: PreferencesToggleProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
                Study Preferences
            </h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                        <h4 className="font-medium text-gray-900">Study Format</h4>
                        <p className="text-sm text-gray-600">
                            Choose between one-on-one sessions or group study
                        </p>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => onChange(false)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!value
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            1-on-1
                        </button>
                        <button
                            onClick={() => onChange(true)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${value
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Group
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="material-symbols-outlined text-blue-400">info</span>
                        </div>
                        <div className="ml-3">
                            <h4 className="text-sm font-medium text-blue-800">
                                {value ? 'Group Study Benefits' : 'One-on-One Benefits'}
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                                {value
                                    ? 'Group sessions offer diverse perspectives and collaborative learning opportunities.'
                                    : 'Personal attention and focused discussion tailored to your specific needs.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}