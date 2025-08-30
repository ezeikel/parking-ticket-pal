const fs = require('fs');

// Check if input and output file paths were provided
if (process.argv.length < 4) {
  console.error(
    'Usage: node extract-authority-names.js <input-file.json> <output-file.json>',
  );
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

try {
  // Read and parse the input JSON file
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // Extract just the name values from all entities
  const authorityNames = data.entities.map((entity) => entity.name);

  // Write the array of names to the output file
  fs.writeFileSync(outputFile, JSON.stringify(authorityNames, null, 2));

  console.log(
    `Successfully extracted ${authorityNames.length} authority names to ${outputFile}`,
  );
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
