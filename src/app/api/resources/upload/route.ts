import { NextResponse } from 'next/server';
import { cloudinary } from "@/lib/cloudinary";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64String = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${file.type};base64,${base64String}`;

        // Set upload options based on file type
        const uploadOptions: any = {
            folder: 'studyhub/resources',
            public_id: `resource-${session.user.uid}-${Date.now()}`,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
        };

        // Specific options for different file types
        if (file.type === 'application/pdf') {
            uploadOptions.format = 'pdf';
        } else if (file.type.startsWith('image/')) {
            uploadOptions.quality = 'auto:best';
            uploadOptions.fetch_format = 'auto';
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

        console.log('File uploaded successfully:', result);

        return NextResponse.json({
            fileUrl: result.secure_url,
            fileType: file.type,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}