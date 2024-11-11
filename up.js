const puppeteer = require('puppeteer');

async function automateLoginAndUpload() {
  const browser = await puppeteer.launch({
    headless: true,  // Set to false to see browser actions
    timeout: 60000,   // Timeout of 60 seconds
  });

  const page = await browser.newPage();
  const phoneNumber = '27678113720';
  const fileName = 'test.png';
  const filePath = `${phoneNumber}@s.whatsapp.net/${fileName}`;

  // Step 1: Navigate to the login page
  console.log("Navigating to the login page...");
  await page.goto('https://beyyo-web.onrender.com/login');

  // Step 2: Log in with phone number and password
  console.log("Entering phone number and password...");
  await page.type('#phone_number', phoneNumber); // Enter phone number
  await page.type('#password', 'Suijin'); // Enter password
  await page.click('button[type="submit"]'); // Click the login button

  // Step 3: Check if we are redirected to the main dashboard
  console.log("Checking if redirected to main dashboard...");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay to allow for redirect
  const currentUrl = page.url();

  if (currentUrl === 'https://beyyo-web.onrender.com/') {
    console.log("Successfully on the main dashboard.");
  } else {
    console.log("Unexpected page after login. Exiting script.");
    await browser.close();
    return;
  }

  // Step 4: Navigate to the upload page
  console.log("Navigating to the upload page...");
  await page.goto('https://beyyo-web.onrender.com/upload', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay of 2 seconds

  // Step 5: Wait for the upload form to appear
  console.log("Waiting for file upload form to appear...");
  await page.waitForSelector('input[type="file"]');

  // Step 6: Upload the file
  console.log("Uploading the file...");
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(fileName); // Upload the file
  
  // Step 7: Submit the upload form
  console.log("Submitting the upload form...");
  await page.click('button[type="submit"]'); // Click the upload button
  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay to ensure upload completes

  // Step 8: Construct and display the URL of the uploaded file
  const uploadedFileUrl = `https://beyyo-web.onrender.com/uploads/${filePath}`;
  console.log('Uploaded file URL:', uploadedFileUrl);

  // Close the browser
  console.log("Closing the browser...");
  await browser.close();
}

automateLoginAndUpload().catch(console.error);
