require("dotenv").config();
const express = require("express");
const request = require("request");
const crypto = require("crypto");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../client/build")));

// Log environment check at startup
console.log("Environment Check:");
console.log(
  "Client ID Length:",
  process.env.CLIENT_ID ? process.env.CLIENT_ID.length : "missing"
);
console.log(
  "Client Secret Length:",
  process.env.CLIENT_SECRET ? process.env.CLIENT_SECRET.length : "missing"
);
console.log("Redirect URI:", process.env.REDIRECT_URI);

app.get("/login", (req, res) => {
  const state = crypto.randomBytes(20).toString("hex");
  res.cookie("state", state, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });

  const authQueryParams = querystring.stringify({
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    scope: "user-read-private user-read-email user-top-read",
    redirect_uri: process.env.REDIRECT_URI,
    state: state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${authQueryParams}`);
});

app.get("/callback", (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const storedState = req.cookies.state;

  console.log({
    receivedState: state,
    storedState: storedState,
    cookiesPresent: !!req.cookies,
    allCookies: req.cookies,
  });

  console.log("Callback received");
  console.log("Code exists:", !!code);
  console.log("State matches:", state === storedState);

  // Create authorization string
  const auth = Buffer.from(
    `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
  ).toString("base64");
  console.log("Authorization header length:", auth.length);

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    json: true,
  };

  // Log request details (safely)
  console.log("Making token request with:");
  console.log("- URL:", authOptions.url);
  console.log("- Redirect URI:", authOptions.form.redirect_uri);
  console.log("- Grant Type:", authOptions.form.grant_type);
  console.log(
    "- Headers present:",
    Object.keys(authOptions.headers).join(", ")
  );

  request.post(authOptions, (error, response, body) => {
    if (error) {
      console.error("Token exchange error:", error);
      res.redirect("/#/error/token-exchange-error");
      return;
    }

    console.log("Token exchange response status:", response.statusCode);

    if (response.statusCode === 200) {
      const access_token = body.access_token;
      res.redirect(`/#access_token=${access_token}`);
    } else {
      console.error("Invalid token response:", body);
      res.redirect("/#/error/invalid-token");
    }
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Environment:", process.env.NODE_ENV);
});
