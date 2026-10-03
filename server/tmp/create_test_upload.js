const XLSX = require('xlsx');
const path = require('path');

const headers = [
    'S No', 'Date', 'Product', 'Industry', 'Source of DB', 'Company Name',
    'Location', 'Contact Person Name', 'Designation', 'Company Email', 'Personal Email',
    'Mobile No'
];

const testRow = {
    'S No': 1,
    'Date': '16/06/2026',
    'Product': 'IM Services',
    'Industry': 'Construction',
    'Source of DB': 'Linkedin',
    'Company Name': 'Test Company Pvt Ltd',
    'Location': 'Mumbai',
    'Contact Person Name': 'John Doe',
    'Designation': 'CEO',
    'Company Email': 'john.doe@testcompany.com',
    'Personal Email': 'johndoe@gmail.com',
    'Mobile No': '9876543210'
};

const ws = XLSX.utils.json_to_sheet([testRow], { header: headers });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Call Tracker Upload');

const outPath = path.join(__dirname, 'test_upload.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Created:', outPath);
