const http = require('http'); 
http.get('http://localhost:3000/api/attendance/admin/summary?financial_year=2026-2027', (res) => { 
  let data = ''; 
  res.on('data', chunk => data+=chunk); 
  res.on('end', () => console.log(data)); 
});
