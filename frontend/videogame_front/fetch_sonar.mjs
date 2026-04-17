import fs from 'fs';
import http from 'http';

const token = "sqp_f754e78c2705501cab8225b17b2dd70b65d3cc3e";
const base64Token = Buffer.from(token + ":").toString('base64');

const options = {
  hostname: 'localhost',
  port: 9000,
  path: '/api/issues/search?componentKeys=sonnar_videogame&resolved=false&ps=200',
  method: 'GET',
  headers: {
    'Authorization': `Basic ${base64Token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const json = JSON.parse(data);
    const issues = json.issues.map(i => ({
      status: i.status,
      type: i.type,
      message: i.message,
      component: i.component,
      line: i.line,
      effort: i.effort
    }));
    fs.writeFileSync('sonar_issues.json', JSON.stringify(issues, null, 2));
    console.log(`Saved ${issues.length} UNRESOLVED issues.`);
  });
});
req.end();
