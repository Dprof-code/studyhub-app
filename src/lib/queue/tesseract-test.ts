// Simple test to verify Tesseract.js imports correctly
// This file can be deleted after testing

export async function testTesseractImport() {
    try {
        const Tesseract = await import('tesseract.js');
        console.log('✅ Tesseract.js imported successfully');
        console.log('Available methods:', Object.keys(Tesseract));
        return true;
    } catch (error) {
        console.error('❌ Failed to import Tesseract.js:', error);
        return false;
    }
}

// Test the import when this file is loaded
if (typeof window === 'undefined') {
    testTesseractImport().then(result => {
        console.log('Tesseract import test result:', result);
    });
}