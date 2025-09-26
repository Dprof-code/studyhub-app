interface AttachmentButtonProps {
    onFileSelect?: (file: File) => void;
}

export default function AttachmentButton({ onFileSelect }: AttachmentButtonProps) {
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileSelect?.(file);
        }
    };

    return (
        <div>
            <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx"
            />
            <label
                htmlFor="file-upload"
                className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
            >
                <span className="material-symbols-outlined">attach_file</span>
            </label>
        </div>
    );
}