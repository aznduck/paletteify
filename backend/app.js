require('dotenv').config();
const express = require('express');
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/login', (req, res) => {
const state = crypto.randomBytes(20).toString('hex');
res.cookie('state', state);
res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify({     response_type: 'code',     client_id: process.env.CLIENT_ID,     scope: 'user-read-private user-read-email user-top-read',     redirect_uri: process.env.REDIRECT_URI,     state,   })}`);
});

app.get('/callback', (req, res) => {
const code = req.query.code;
const state = req.query.state;
const storedState = req.cookies.state;

if (state === null || state !== storedState) {
res.redirect('/#/error/state-mismatch');
return;
}

const authOptions = {
url: 'https://accounts.spotify.com/api/token',
form: {
code: code,
redirect_uri: process.env.REDIRECT_URI,
grant_type: 'authorization_code',
},
headers: {
Authorization: `Basic ${Buffer.from(`         ${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}       `).toString('base64')}`,
},
json: true,
};

request.post(authOptions, (error, response, body) => {
if (!error && response.statusCode === 200) {
const access_token = body.access_token;
res.redirect(`/#access_token=${access_token}`);
} else {
res.redirect('/#/error/invalid-token');
}
});
});

// Serve React app for any other routes
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
console.log('Environment:', process.env.NODE_ENV);
});