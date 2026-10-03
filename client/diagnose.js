import puppeteer from 'puppeteer';

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Listen for console and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
    
    console.log("Navigating to http://localhost:5173/crm/leads/new...");
    await page.goto('http://localhost:5173/crm/leads/new', { waitUntil: 'networkidle2' }).catch(e => console.error("Navigation error:", e));
    
    setTimeout(async () => {
        console.log("Closing browser.");
        await browser.close();
    }, 5000);
})();
