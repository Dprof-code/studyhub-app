interface StepperHeaderProps {
    steps: string[];
    current: number;
}

export default function StepperHeader({ steps, current }: StepperHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                    <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
            ${index <= current
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-500'
                        }
          `}>
                        {index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${index <= current ? 'text-primary' : 'text-gray-500'
                        }`}>
                        {step}
                    </span>
                    {index < steps.length - 1 && (
                        <div className={`w-12 h-0.5 mx-4 ${index < current ? 'bg-primary' : 'bg-gray-200'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
}