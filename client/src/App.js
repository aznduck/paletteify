import { useEffect, useState } from "react"
import SpotifyWebApi from "spotify-web-api-js"
import ColorThief from "colorthief"
import { toPng } from "html-to-image";
import "./App.css"

const API_BASE_URL = process.env.REACT_APP_API_URL || ''

const spotifyApi = new SpotifyWebApi()

const getTokenFromUrl = () => {
  return window.location.hash
    .substring(1)
    .split("&")
    .reduce((initial, item) => {
      let parts = item.split("=")
      initial[parts[0]] = decodeURIComponent(parts[1])
      return initial
    }, {})
}

export default function App() {
  const [spotifyToken, setSpotifyToken] = useState("")
  const [topTracks, setTopTracks] = useState([])
  const [topColors, setTopColors] = useState([])
  const [selectedColor, setSelectedColor] = useState(null) 
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("short_term") 
  const [username, setUsername] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  

  useEffect(() => {
    const token = getTokenFromUrl().access_token
    if (token) {
      setSpotifyToken(token)
      spotifyApi.setAccessToken(token)
      setLoggedIn(true)
      window.history.pushState({}, null, "/")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (loggedIn) {
      getTopTracks()
    }
  }, [loggedIn, timeRange])

  useEffect(() => {
    if (spotifyToken) {
      spotifyApi.getMe().then((response) => {
        setUsername(response.display_name || "Spotify User");
      });
    }
  }, [spotifyToken]);

  const getTopTracks = () => {
    spotifyApi
      .getMyTopTracks({ limit: 50, time_range: timeRange })
      .then((response) => {
        if (response.items && response.items.length > 0) {
          const formattedTracks = response.items.map((item) => ({
            name: item.name,
            albumArt: item.album.images[0]?.url || "",
            palette: [], // Placeholder for colors
          }))
          setTopTracks(formattedTracks)
          fetchPalettes(formattedTracks)
        }
      })
      .catch((error) => {
        console.error("Error fetching top tracks:", error)
      })
  }

  const fetchPalettes = async (tracks) => {
    const colorThief = new ColorThief()

    const promises = tracks.map(async (track, index) => {
      if (track.albumArt) {
        const img = new Image()
        img.crossOrigin = "Anonymous"
        img.src = track.albumArt

        return new Promise((resolve) => {
          img.onload = () => {
            const palette = colorThief.getPalette(img, 3) 
            resolve({ index, palette })
          }
        })
      }
    })

    const results = await Promise.all(promises)
    const updatedTracks = [...tracks]
    const allColors = []

    results.forEach((result) => {
      if (result) {
        updatedTracks[result.index].palette = result.palette
        allColors.push(result.palette[0])
      }
    })

    setTopTracks(updatedTracks)
    calculateTopColors(allColors)
  }

  const calculateTopColors = (colors) => {
    const colorCounts = {}
    colors.forEach((color) => {
      const colorKey = color.join(",")
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
    })

    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key.split(",").map(Number))

    setTopColors(sortedColors)
  }

  const handleColorClick = (color) => {
    setSelectedColor(color) // Set the selected color
  }

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`
};

  const filteredTracks = selectedColor
    ? topTracks.filter((track) =>
        track.palette.some(
          (paletteColor) =>
            paletteColor[0] === selectedColor[0] &&
            paletteColor[1] === selectedColor[1] &&
            paletteColor[2] === selectedColor[2]
        )
      )
    : topTracks // Show all tracks if no color is selected

    const downloadCard = () => {
      const cardElement = document.querySelector(".custom-card");
      toPng(cardElement)
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = "paletteify-card.png";
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error("Error downloading the card:", error);
        });
    };

    const closePopup = () => {
      setShowAbout(false);
      setShowPrivacy(false);
    };

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="app">
      {!loggedIn ? (
        <div className="homepage">
          <div className="content">
            <h1>Paletteify</h1>
            <p>Transform your music into a canvas</p>
            <a onClick={handleLogin} className="login-button">
              Login
            </a>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <h2>Paletteify</h2>
          <div className="time-range-buttons">
            <button
              className={`time-range-button ${
                timeRange === "short_term" ? "active" : ""
              }`}
              onClick={() => setTimeRange("short_term")}
            >
              4 Weeks
            </button>
            <button
              className={`time-range-button ${
                timeRange === "medium_term" ? "active" : ""
              }`}
              onClick={() => setTimeRange("medium_term")}
            >
              6 Months
            </button>
            <button
              className={`time-range-button ${
                timeRange === "long_term" ? "active" : ""
              }`}
              onClick={() => setTimeRange("long_term")}
            >
              1 Year
            </button>
          </div>
          <div className="custom-card-container">
            <div
              className="custom-card"
              style={{
                background: `radial-gradient(circle, ${topColors
                  .map((color) => `rgb(${color.join(",")})`)
                  .join(", ")})`,
              }}
            >
              <div className="card-content">
                <h2>{username}'s Paletteify</h2>
              </div>
            </div>
            <button className="download-card" onClick={downloadCard}>
              Download Card
            </button>
            <div className="top-colors">
            <div className="color-grid">
              {topColors.map((color, index) => (
                <div
                  key={index}
                  className={`color-swatch large ${
                    selectedColor &&
                    selectedColor.join(",") === color.join(",")
                      ? "selected"
                      : ""
                  }`}
                  style={{
                    backgroundColor: `rgb(${color.join(",")})`,
                  }}
                  onClick={() => handleColorClick(color)} 
                />
              ))}
            </div>
          </div>

          <ul className="tracks-list">
            {filteredTracks.map((track, index) => (
              <li
                key={index}
                style={{
                  backgroundColor: track.palette[0]
                    ? `rgb(${track.palette[0].join(",")})`
                    : "transparent", 
                }}
              >
                <div className="track-info">
                  <img src={track.albumArt} alt={`${track.name} Album Art`} />
                  <span>{track.name}</span>
                </div>
                <div className="color-palette">
                  {track.palette.map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="color-swatch"
                      style={{
                        backgroundColor: `rgb(${color.join(",")})`,
                      }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
          <footer className="footer">
          <div className="footer-links">
            <span className="footer-link" onClick={() => setShowAbout(true)}>
              About
            </span>
            |
            <span className="footer-link" onClick={() => setShowPrivacy(true)}>
              Privacy Policy
            </span>
          </div>
        </footer>
        {showAbout && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2>About Paletteify</h2>
            <p>
              Paletteify is a unique web application that combines the world of
              music with color. By analyzing your Spotify top tracks, we generate
              a color palette based on the album art of your most-played songs. You can customize your palette
              by adjusting the time frame from which data is being taken.
            </p>
            <p>If you notice anything wrong or have suggestions, please reach out to dhan6663@usc.edu</p>
            <h2>Enjoy!</h2>
            <button className="popup-close" onClick={closePopup}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Popup */}
      {showPrivacy && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2>Privacy Policy</h2>
            <p>
              Paletteify collects data from your Spotify account for the sole
              purpose of providing a personalized experience.  By using Paletteify, you agree to the use of your account username and information about your top listened-to artists as stated by this policy.
              We do not store or share your personal information with third parties.
              If at any point you wish to remove Paletteify's permissions to generate your graphic on Spotify, you can do so <a href="https://support.spotify.com/us/article/spotify-on-other-apps/" target="_blank" rel="noopener noreferrer">here</a>.
            </p>
            <button className="popup-close" onClick={closePopup}>
              Close
            </button>
          </div>
        </div>
      )}
        </div>
        
        
      )}
    </div>
  )
}

