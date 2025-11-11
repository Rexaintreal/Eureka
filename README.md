<div align="center">
  <img src="assets/logo.png" alt="Eureka Logo" width="200"/>

# Eureka

**Eureka is a website where you can find local spots near you which don't show up on Google Maps or any other apps**

Eureka is a project made by a person who loves street food for the people who love underrated stuff which is not on the traditional internet. No algorithms, just people helping other people find the best spot near them.

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Eureka-black?logo=github)](https://github.com/Rexaintreal/Eureka)
[![Built for Foodie](https://img.shields.io/badge/Built%20for-Foodie%20YSWS-orange)](https://foodie.hackclub.com/)
[![Hack Club Time](https://hackatime-badge.hackclub.com/U09B8FXUS78/Eureka)](https://hackatime-badge.hackclub.com/U09B8FXUS78/Eureka)

</div>

---

## Demo Video

Google Drive Link for the Demo Video [LINK](https://drive.google.com/file/d/1uRMkwRlWe0LNMcBSysc4HvF9rNREk_tQ/view?usp=drive_link)

Or you could actually try it VISIT THE [WEBSITE](https://eureka.pythonanywhere.com/) now!

---

## About

Every city has that amazing local shop where people enjoy everyday but it's not on google maps - maybe the shop owners are not aware or just not interested in adding it there. But we as people who love the food they make or the overall vibe must come forward to share the spots to other people, maybe visitors etc. (DONT GATEKEEP IT LET EVERYONE EXPERIENCE THE JOY OF GREAT FOOOOOD) 

I built Eureka for [Foodie](https://foodie.hackclub.com/) YSWS - a map where people can mark their underrated spots!

---

## Features

- **Interactive Map**: Users can browse locations on an interactive map interface
- **Add Locations**: They can mark their favorite hidden gems on the map with details
- **Rate & Review**: Users can even add ratings and write about what makes each place special
- **Edit Reviews**: Other users can use the public edit feature to fix any mistakes
- **Location Details**: All details is at one place so everything is streamlined
- **Search & Discover**: Users can search based on categories or locations

---

## Tech Stack

Built with:
- **Flask** - Python web framework
- **Leaflet.js** - Interactive maps
- **JSON** - Data storage (for now we can use SQLite to scale it later with a SQL Database)
- **HTML/CSS/JavaScript** - Frontend

---

## Project Structure

```
Eureka/
├── assets/           # Project assets and media
├── data/             # JSON data storage for locations and ratings
├── static/           # CSS, JavaScript, and static files
├── templates/        # HTML templates
├── app.py            # Main Flask application
├── requirements.txt  # Python dependencies
├── .gitignore        # Git ignore file
├── LICENSE           # MIT License
└── README.md         # You're reading this lol
```

---

## Setup and Installation

### Prerequisites
- **Python 3.13+** (tested on 3.13.5)
- **pip** for package management

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rexaintreal/Eureka.git
   cd Eureka
   ```

2. **Create a virtual environment (recommended if you like to keep everything CLEAN):**
   
   **Windows:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
   
   **macOS / Linux:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Open in browser:**
   
   Navigate to `http://127.0.0.1:5000`

---

## Usage

1. **Browse the map** to see existing locations marked by the community
2. **Click on markers** to see ratings and reviews for each spot
3. **Add a new location** by clicking on the map and filling in details
4. **Rate places** you've been to and share what makes them special
5. **Edit your reviews** anytime to update your thoughts
6. **Discover hidden gems** in your area that you never knew existed

---

## How It Works

- Locations are stored in JSON format in the `data/` directory
- Each location can have multiple ratings and reviews from different users
- The map uses Leaflet.js for interactive mapping (FREE API TYSM)
- All data is currently stored locally (database integration can be implemented)
- Community-driven content means no ads or sponsored listings (needs filtering and moderation tho)

---

## Contributing

FEEL FREE TO ADD OR REMOVE THINGS I'd love to see people work on this lol (no one does)

---

## License

MIT [LICENSE](LICENSE)

---

## Acknowledgements

Built for [Foodie YSWS](https://foodie.hackclub.com/) at Hack Club.

---

## You may also like...

Check out my other projects:

- [DawnDuck](https://github.com/Rexaintreal/DawnDuck) - USB HID Automation Tool for Morning Routines
- [Lynx](https://github.com/Rexaintreal/lynx) - OpenCV Image Manipulation WebApp
- [Libro Voice](https://github.com/Rexaintreal/Libro-Voice) - PDF to Audio Converter
- [Snippet Vision](https://github.com/Rexaintreal/Snippet-Vision) - YouTube Video Summarizer
- [Weather App](https://github.com/Rexaintreal/WeatherApp) - Python Weather Forecast App
- [Python Screenrecorder](https://github.com/Rexaintreal/PythonScreenrecorder) - Python Screen Recorder
- [Typing Speed Tester](https://github.com/Rexaintreal/TypingSpeedTester) - Python Typing Speed Tester
- [Movie Recommender](https://github.com/Rexaintreal/Movie-Recommender) - Python Movie Recommender
- [Password Generator](https://github.com/Rexaintreal/Password-Generator) - Python Password Generator
- [Object Tales](https://github.com/Rexaintreal/Object-Tales) - Python Image to Story Generator
- [Finance Manager](https://github.com/Rexaintreal/Finance-Manager) - Flask WebApp to Monitor Savings
- [Codegram](https://github.com/Rexaintreal/Codegram) - Social Media for Coders
- [Simple Flask Notes](https://github.com/Rexaintreal/Simple-Flask-Notes) - Flask Notes App
- [Key5](https://github.com/Rexaintreal/key5) - Python Keylogger
- [Codegram2024](https://github.com/Rexaintreal/Codegram2024) - Modern Codegram Update
- [Cupid](https://github.com/Rexaintreal/cupid) - Dating Web App for Teenagers
- [Gym Vogue](https://github.com/Rexaintreal/GymVogue/) - Ecommerce for Gym Freaks
- [Confessions](https://github.com/Rexaintreal/Confessions) - Anonymous Confession Platform
- [Syna](https://github.com/Rexaintreal/syna) - Social Music App with Spotify
- [Apollo](https://github.com/Rexaintreal/Apollo) - Minimal Music Player with Dancing Cat
- [Eros](https://github.com/Rexaintreal/Eros) - Face Symmetry Analyzer
- [Notez](https://github.com/Rexaintreal/Notez) - Clean Android Notes App

---

## Author

Built by **Saurabh Tiwari**

- Email: [saurabhtiwari7986@gmail.com](mailto:saurabhtiwari7986@gmail.com)  
- Twitter: [@Saurabhcodes01](https://x.com/Saurabhcodes01)
- Instagram: [@saurabhcodesawfully](https://instagram.com/saurabhcodesawfully)
