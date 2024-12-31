const express = require('express');
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const app = express();
const redirect_uri = process.env.REDIRECT_URI || 'http://localhost:8888/callback';

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Paletteify API is running');
});

app.get('/login', (req, res) => {
  const state = crypto.randomBytes(20).toString('hex');
  res.cookie('state', state);
  res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: 'user-read-private user-read-email user-top-read',
    redirect_uri,
    state,
  })}`);
});

app.get('/callback', (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const storedState = req.cookies.state;

  if (state === null || state !== storedState) {
    res.send('state does not match');
  }

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri,
      grant_type: 'authorization_code',
    },
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;
      const expires_in = body.expires_in;

      res.cookie('access_token', access_token, { maxAge: expires_in * 1000 });
      res.cookie('refresh_token', refresh_token, { maxAge: 31536000000 }); // 1 year
      res.redirect('/');
    } else {
      res.send(error);
    }
  });
});


const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});

module.exports = app;

