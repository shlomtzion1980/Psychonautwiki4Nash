const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = 12345; // Replace with your port number

// Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { request, gql } = require("graphql-request");
const XLSX = require("xlsx");
const fs = require("fs");

const endpoint = "https://api.psychonautwiki.org/"; // Replace with your GraphQL endpoint
let responseData = [];
const defaultQuery = `
query {
  substances(query: "substance") {
      name
      url
      featured
      toxicity
      crossTolerances
      commonNames
      roas {
      name

      dose {
        units
        threshold
        heavy
        common {
          min
          max
        }
        light {
          min
          max
        }
        strong {
          min
          max
        }
      }

      duration {
        afterglow {
          min
          max
          units
        }
        comeup {
          min
          max
          units
        }
        duration {
          min
          max
          units
        }
        offset {
          min
          max
          units
        }
        onset {
          min
          max
          units
        }
        peak {
          min
          max
          units
        }
        total {
          min
          max
          units
        }
      }

      bioavailability {
        min
        max
      }
    }
    addictionPotential
  }
}
`;

const queryFunction = async (substance, groups, query) => {
  const myGraphQLQuery = gql`
    ${query.replace(`"substance"`, `"${substance}"`)}
  `;

  let flat = {};

  let string = "";
  // Make the GraphQL request
  await request(endpoint, myGraphQLQuery)
    .then((data) => {
      flat = flattenObject(data, "", ".", groups);
    })
    .catch((error) => console.error(error));
  return flat;
};

function containsObjects(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      return true; // Found an object property
    }
  }
  return false; // No object properties found
}

function flattenObject(obj, parentKey = "", separator = ".", groups = "") {
  const flattened = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}${separator}${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (groups.indexOf(key) !== -1) {
          flattened[key] = JSON.stringify(obj[key]);
        } else {
          Object.assign(
            flattened,
            flattenObject(
              obj[key],
              newKey.replace("data", "").replace("substances", ""),
              separator,
              groups
            )
          );
        }
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
}

// Route handler for the root path
app.get("/", (req, res) => {
  const hostname =
    req.hostname === "localhost" ? "nashke.test" : "shlomtzo.com/nashkePsych"; // change this to your domain
  // Use the value of hostname to perform further actions
  const headline = "<h1>PsychonautWiki Query for Nash</h1>";
  const form =
    '<form method="post" action="/webhook">Query: <textarea style="width: 500px; height: 500px;" type="textarea" name="defaultQuery">' +
    defaultQuery +
    '</textarea><div class="inputs">IMPORTANT! - If you edit the query, leave the first two lines (until "name") the same!<br>Enter Substances divided by , <input type="text" name="substances" />Enter Groups(Group values under one headline): <input type="text" name="groups" /><input type="submit" /></div></form>';
  res.send(
    `<link rel="stylesheet" href="https://${hostname}/styles/style.css">` +
      `<div class="main">` +
      headline +
      form +
      `</div>`
  );
});

app.post("/webhook", (req, res) => {
  const hostname =
    req.hostname === "localhost" ? "nashke.test" : "shlomtzo.com/nashkePsych"; // change this to your domain
  let substances = req.body.substances.replaceAll('"', "").split(",");
  let groups = req.body.groups.replaceAll('"', "").split(",");
  let query = req.body.defaultQuery;

  // console.log(req.body.substances.replaceAll('"', "").split(","));

  let dataArray = [];
  let theads = [];
  let thead = "<thead><tr>";
  let table = `<link rel="stylesheet" href="https://${hostname}/styles/style.css"><table>`; // change this to your domain
  let tbody = "<tbody>";
  (async () => {
    for (let i = 0; i < substances.length; i++) {
      let substance = await queryFunction(substances[i], groups, query);
      theads.push(...Object.keys(substance));

      dataArray.push(substance);
    }
    // console.log(dataArray);

    let uniq = [...new Set(theads)];

    uniq.forEach((element) => {
      thead += `<th>${element}</th>`;
    });

    dataArray.forEach((array) => {
      tbody += "<tr>";
      uniq.forEach((element) => {
        if (array[element]) {
          tbody += `<td>${array[element]}</td>`;
        } else {
          tbody += `<td></td>`;
        }
      });
      tbody += "</tr>";
    });
    table +=
      thead +
      "</tr></thead>" +
      tbody +
      `</tbody></table><a href="https://${hostname}/output.xlsx">Download</a>`; // change this to your domain

    res.send(table);

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(dataArray);

    // Create a workbook with the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet 1");

    // Save the workbook to a file
    const filePath = "output.xlsx";
    XLSX.writeFile(wb, filePath);

    console.log(`Excel file saved to: ${filePath}`);
  })();
});

// Start the server
app.listen(port, () => {
  console.log(`Webhook receiver listening at http://localhost:${port}`);
});
