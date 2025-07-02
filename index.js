const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config({ path: __dirname + '/.env' });
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());


const PORT = process.env.PORT || 3000;
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;

// console.log("🔍 Loaded Environment Variables:");
// console.log("-------------------------------------------------");
// console.log("✅ PORT: ", process.env.PORT ? "✅ Loaded" : "⚠️ Not Set (Using Default 3000)");
// console.log("✅ ZOHO_CLIENT_ID: ", process.env.ZOHO_CLIENT_ID ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_CLIENT_SECRET: ", process.env.ZOHO_CLIENT_SECRET ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_REDIRECT_URI: ", process.env.ZOHO_REDIRECT_URI ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_REFRESH_TOKEN: ", process.env.ZOHO_REFRESH_TOKEN ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_TOKEN_URL: ", process.env.ZOHO_TOKEN_URL ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_ORG_ID: ", process.env.ZOHO_ORG_ID ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("-------------------------------------------------");

// Route 1: Check if the server is running
app.get('/', (req, res) => {
  console.log('Ping route accessed.');
  res.send('Server is running!');
});


app.get("/get-projectcode", async (req, res) => {
  try {
      accessToken = await fetchAccessToken();
    console.log("access Token: ", accessToken);
    // Replace with your token
    if (!accessToken) {
      return res.status(500).json({
        message: "access token not found",
      });
    }
    const response = await axios.get(
      "https://desk.zoho.com/api/v1/cm_projects",
      {
        params: {
          viewId: "1142108000000456256",
          fields: "cf_project_code",
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          orgId: ZOHO_ORG_ID,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Response of poject code from Zoho Desk:", response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Full error object:", error);
    console.error(
      "Error details:",
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message,
    );
    res.status(500).json({ error: "Failed to fetch custom module data" });
  }
});


//route to get all the users - 200 through pagenation: 
app.get("/get-users", async (req, res) => {
  try {
    const accessToken = await fetchAccessToken();
    if (!accessToken) {
      return res.status(500).json({ message: "access token not found" });
    }

    let allUsers = [];
    let from = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        "https://desk.zoho.com/api/v1/cm_internal_users",
        {
          params: {
            viewId: "1142108000000380150",
            fields: "cf_email",
            from, // Pagination offset
            limit, // Number of records per request
          },
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            orgId: ZOHO_ORG_ID,
            "Content-Type": "application/json",
          },
        }
      );

      const users = response.data.data || [];
      allUsers.push(...users);

      if (users.length < limit) {
        hasMore = false; // Fewer than 50 users means last page
      } else {
        from += limit; // Move to next page
      }
    }

    res.json({ data: allUsers });
  } catch (error) {
    console.error("Full error object:", error);
    console.error(
      "Error details:",
      error.response ? JSON.stringify(error.response.data, null, 2) : error.message
    );
    res.status(500).json({ error: "Failed to fetch custom module data" });
  }
});



async function fetchAccessToken() {
  try {
        const url = `${ZOHO_TOKEN_URL}?grant_type=refresh_token&client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&redirect_uri=${ZOHO_REDIRECT_URI}&refresh_token=${ZOHO_REFRESH_TOKEN}`;
        const response = await axios.post(url);

      if (response.data && response.data.access_token) {
          console.log("access token generated: ", response.data.access_token )
          return response.data.access_token;
      } else {
          throw new Error("Access token not found in the response.");
      }
  } catch (error) {
      console.error("Error fetching access token:", error.message);
      throw error;
  }
}

const upload = multer({storage : multer.memoryStorage()});

app.post("/api/create-ticket", upload.array('files', 10), async (req, res) => {
  try {
      // Extract form data
      const { subject, departmentId, description, severity, contactId ,ticketCreator,ticketCreatorMail, team,projectCode,priority} = req.body;

    //   const teamMap = {
    //     "1142108000000466538": "Planning Team",
    //     "1142108000000466552": "Production Team 1",
    //     "1142108000000466566": "Production Team 2",
    //     "1142108000000466580": "Production Team 3",
    //     "1142108000000466594": "Service Team",
    //     "1142108000000466342": "Basis",
    //     "1142108000000466356": "Composite",
    //     "1142108000000466370": "Interior Engineering",
    //     "1142108000000466384": "Yacht Design",
    //     "1142108000000466398": "Interior Design",
    //     "1142108000000466412": "Yacht Design 3D Visuals",
    //     "1142108000000466426": "Deck outfitting",
    //     "1142108000000466440": "Electrical",
    //     "1142108000000466454": "Integrated Solutions",
    //     "1142108000000466468": "Machinery and Piping",
    //     "1142108000000466482": "Interior Engineering SY",
    //     "1142108000000466496": "Composite AND",
    //     "1142108000000466510": "Systems AND",
    //     "1142108000000466524": "Naval Architecture"

    // };

    // Map team ID to team name
  //   const teamIdMap = Object.fromEntries(
  //     Object.entries(teamMap).map(([id, name]) => [name, id])
  // );

  // const teamId = teamIdMap[team] || "";


      // Step 1: Create ticket in Zoho Desk
      const accessToken = await fetchAccessToken(); // Replace with your token
      if(!accessToken){
        return res.status(500).json({
          "message" : "access token not found"
        })
      }

      // console.log("generated token : ", accessToken);
      // console.log("Team id : ", teamId);

        // ✅ Correcting the ticketData format
        const ticketData = {
          subject: subject,
          departmentId: departmentId, // Zoho department ID (keep this same)
          description: `${description}`, // Merging description & notes
          language: "English",
          status: "Open", // Setting initial status
          category: "general", // Adjust category if needed
          contactId: "1142108000000471001", // Set correct contact ID
          productId: "", // Can be updated if needed,
          // teamId : teamId,
          email : ticketCreatorMail,
          channel:"Voice Note",
          priority : priority,
          cf: { // ✅ Add custom fields (cf)
              cf_permanentaddress: null,
              cf_dateofpurchase: null,
              cf_phone: null,
              cf_numberofitems: null,
              cf_url: null,
              cf_secondaryemail: null,
              cf_severitypercentage: "0.0",
              cf_modelname: "F3 2017",
              cf_project_code : projectCode,
              cf_severity : severity,
              cf_ticket_generator : ticketCreator,
              cf_team_name : team
          },
      };

      console.log("ticketData is : ", ticketData);

      const ticketResponse = await axios.post(
          "https://desk.zoho.com/api/v1/tickets",
          ticketData,
          {
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Zoho-oauthtoken ${accessToken}`,
              },
          }
      );

      console.log("ticket created");
      const ticketId = ticketResponse.data.id; // <-- Correct way to get the ticket ID
      const ticketNumber = ticketResponse.data.ticketNumber; // <-- This is the readable ticket number

      console.log("✅ Ticket Created Successfully:");
      console.log("Ticket ID:", ticketId);
      console.log("Ticket Number:", ticketNumber);

        // ✅ Step 1: Log access token before uploading
        console.log("🔑 Using Access Token for Upload:", accessToken);

        // ✅ Step 2: Ensure orgId is present
        console.log("📌 Using orgId:", ZOHO_ORG_ID);
        if (!ZOHO_ORG_ID) {
            throw new Error("❌ orgId is missing. Please check your .env file.");
        }

      if (!req.files || req.files.length === 0) {
          console.log("⚠️ No files uploaded.");
      } else {
          for (const file of req.files) {
              console.log(`📁 Uploading File: ${file.originalname}`);
      
              const formData = new FormData();
              formData.append("file", file.buffer, { filename: file.originalname });
      
              await axios.post(
                  `https://desk.zoho.com/api/v1/tickets/${ticketId}/attachments`,
                  formData,
                  {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                          "Authorization": `Zoho-oauthtoken ${accessToken}`,
                          "orgId": ZOHO_ORG_ID,
                          ...formData.getHeaders(),
                      },
                  }
              );
      
              console.log(`✅ Uploaded: ${file.originalname}`);
          }
      }
      

      res.status(200).json({ message: "Ticket created successfully!", ticketId,ticketNumber });

  } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "An error occurred", details: error.message });
  }
});


// module.exports = app;

app.listen(PORT, () => {  
  console.log(`Server is running on port ${PORT}`);
});
