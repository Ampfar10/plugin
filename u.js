const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Load cookies from login session if needed
    const cookies = require('./cookies1.json');
    await page.setCookie(...cookies);

    // Go to the upload page
    await page.goto('http://beyyo-web.onrender.com/upload', { waitUntil: 'networkidle2' });

    // Locate the file input field and upload a file
    const fileInputSelector = 'input[type="file"]';
    const filePath = 'test.png'; // Path to your file
    await page.waitForSelector(fileInputSelector);
    const inputUploadHandle = await page.$(fileInputSelector);
    await inputUploadHandle.uploadFile(filePath);

    // Submit the form (adjust selector if necessary)
    await Promise.all([
        page.click('button[type="submit"]'), // Button to submit the upload form
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    console.log('File upload complete.');
    await browser.close();
})();
