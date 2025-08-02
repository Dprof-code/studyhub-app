import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/dbconfig";

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

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'studyhub/avatars',
            public_id: `avatar-${session.user.uid}`,
            overwrite: true,
            transformation: [
                { width: 400, height: 400, crop: "fill" },
                { quality: "auto" },
                { fetch_format: "auto" }
            ]
        });

        // Update user avatar in database
        await db.user.update({
            where: { email: session.user.email! },
            data: { avatarUrl: result.secure_url }
        });

        return NextResponse.json({
            url: result.secure_url,
            message: 'Avatar updated successfully'
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
}