import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Error proxying PDF:', error);
        return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 });
    }
}