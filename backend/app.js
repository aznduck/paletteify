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
  
  console.log('Received code:', code);
  console.log('Received state:', state);
  console.log('Stored state:', storedState);
  
  if (state === null || state !== storedState) {
  console.log('State mismatch error');
  res.redirect('/#/error/state-mismatch');
  return;
  }
  
  const authOptions = {
  url: 'https://accounts.spotify.com/api/token',
  form: {
  code: code,
  redirect_uri: process.env.REDIRECT_URI,
  grant_type: 'authorization_code'
  },
  headers: {
  'Authorization': `Basic ${Buffer.from(`         ${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}       `).toString('base64')}`
  },
  json: true
  };
  
  console.log('Auth options:', {
  ...authOptions,
  headers: { Authorization: 'HIDDEN' }, // Don't log the actual credentials
  redirect_uri: authOptions.form.redirect_uri
  });
  
  request.post(authOptions, (error, response, body) => {
  if (error) {
  console.error('Token exchange error:', error);
  res.redirect('/#/error/token-exchange-error');
  return;
  }
  console.log('Token exchange response status:', response.statusCode);
  console.log('Token exchange response body:', {
    ...body,
    access_token: body.access_token ? 'PRESENT' : 'MISSING',
    refresh_token: body.refresh_token ? 'PRESENT' : 'MISSING'
  });
  
  if (response.statusCode === 200) {
    const access_token = body.access_token;
    res.redirect(`/#access_token=${access_token}`);
  } else {
    console.error('Invalid token response:', body);
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