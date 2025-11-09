from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

PLACES_FILE = os.path.join('data', 'places.json')

def read_places():
    try:
        if os.path.exists(PLACES_FILE):
            with open(PLACES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('places', [])
        return []
    except Exception as e:
        print(f"Error reading places: {e}")
        return []

def write_places(places):
    try:
        os.makedirs('data', exist_ok=True)
        with open(PLACES_FILE, 'w', encoding='utf-8') as f:
            json.dump({'places': places}, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing places: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/map')
def map_view():
    return render_template('map.html')

@app.route('/feedback')
def feedback():
    return render_template('feedback.html')

@app.route('/api/places', methods=['GET'])
def get_places():
    places = read_places()
    return jsonify({'success': True, 'places': places})

@app.route('/api/places', methods=['POST'])
def add_place():
    try:
        data = request.json
        places = read_places()
        
        place_id = f"place_{len(places) + 1:03d}"
        
        new_place = {
            'id': place_id,
            'name': data.get('name', ''),
            'category': data.get('category', 'Other'),
            'description': data.get('description', ''),
            'address': data.get('address', ''),
            'latitude': float(data.get('latitude', 0)),
            'longitude': float(data.get('longitude', 0)),
            'addedBy': data.get('addedBy', 'Anonymous'),
            'addedDate': datetime.now().strftime('%Y-%m-%d'),
            'verified': False, 
            'tags': data.get('tags', []),
            'contact': data.get('contact', ''),
            'openingHours': data.get('openingHours', ''),
            'rating': 0,
            'imageUrl': data.get('imageUrl', '')
        }
        
        places.append(new_place)
        
        if write_places(places):
            return jsonify({'success': True, 'place': new_place})
        else:
            return jsonify({'success': False, 'error': 'Failed to save place'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/places/search', methods=['GET'])
def search_places():
    query = request.args.get('q', '').lower()
    category = request.args.get('category', '')
    
    places = read_places()
    
    filtered = places
    
    if query:
        filtered = [p for p in filtered if 
                   query in p.get('name', '').lower() or 
                   query in p.get('description', '').lower() or
                   query in p.get('address', '').lower()]
    
    if category and category != 'All':
        filtered = [p for p in filtered if p.get('category') == category]
    
    return jsonify({'success': True, 'places': filtered})

if __name__ == '__main__':
    app.run(debug=True)