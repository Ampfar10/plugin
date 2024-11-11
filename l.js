
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Go to the login page
    await page.goto('http://beyyo-web.onrender.com/login', { waitUntil: 'networkidle2' });

    // Fill in the login form
    await page.type('input[name="phone_number"]', '27672633675');
    await page.type('input[name="password"]', 'Ampfarqwe');

    // Submit the form
    await Promise.all([
        page.click('button[type="submit"]'), // Adjust the selector if necessary
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // Save cookies to a file
    const cookies = await page.cookies();
    fs.writeFileSync('cookies1.json', JSON.stringify(cookies, null, 2));

    console.log('Login successful, cookies saved to cookies1.json');
    await browser.close();
})();
