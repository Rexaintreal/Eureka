from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

PLACES_FILE = os.path.join('data', 'places.json')
VOTES_FILE = os.path.join('data', 'votes.json')

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

def read_votes():
    try:
        if os.path.exists(VOTES_FILE):
            with open(VOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'votes': {}, 'comments': {}}
    except Exception as e:
        print(f"Error reading votes: {e}")
        return {'votes': {}, 'comments': {}}

def write_votes(votes_data):
    try:
        os.makedirs('data', exist_ok=True)
        with open(VOTES_FILE, 'w', encoding='utf-8') as f:
            json.dump(votes_data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing votes: {e}")
        return False

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr

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
    votes_data = read_votes()
    for place in places:
        place_id = place['id']
        votes = votes_data['votes'].get(place_id, {'upvotes': [], 'downvotes': []})
        
        upvote_count = len(votes.get('upvotes', []))
        downvote_count = len(votes.get('downvotes', []))
        
        place['upvotes'] = upvote_count
        place['downvotes'] = downvote_count
        place['verified'] = upvote_count >= 3
        place['hidden'] = downvote_count >= 3
        comments = votes_data['comments'].get(place_id, [])
        place['commentCount'] = len(comments)
    
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
            'imageUrl': data.get('imageUrl', ''),
            'upvotes': 0,
            'downvotes': 0,
            'hidden': False
        }
        
        places.append(new_place)
        
        if write_places(places):
            return jsonify({'success': True, 'place': new_place})
        else:
            return jsonify({'success': False, 'error': 'Failed to save place'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/places/<place_id>/vote', methods=['POST'])
def vote_place(place_id):
    try:
        data = request.json
        vote_type = data.get('type')
        client_ip = get_client_ip()
        
        if vote_type not in ['upvote', 'downvote']:
            return jsonify({'success': False, 'error': 'Invalid vote type'}), 400
        
        votes_data = read_votes()
        
        if place_id not in votes_data['votes']:
            votes_data['votes'][place_id] = {'upvotes': [], 'downvotes': []}
        
        place_votes = votes_data['votes'][place_id]
        
        if client_ip in place_votes['upvotes']:
            if vote_type == 'downvote':
                place_votes['upvotes'].remove(client_ip)
                if client_ip not in place_votes['downvotes']:
                    place_votes['downvotes'].append(client_ip)
            else:
                place_votes['upvotes'].remove(client_ip)
        elif client_ip in place_votes['downvotes']:
            if vote_type == 'upvote':
                place_votes['downvotes'].remove(client_ip)
                if client_ip not in place_votes['upvotes']:
                    place_votes['upvotes'].append(client_ip)
            else:
                place_votes['downvotes'].remove(client_ip)
        else:
            if vote_type == 'upvote':
                place_votes['upvotes'].append(client_ip)
            else:
                place_votes['downvotes'].append(client_ip)
        
        if write_votes(votes_data):
            upvote_count = len(place_votes['upvotes'])
            downvote_count = len(place_votes['downvotes'])
            
            return jsonify({
                'success': True,
                'upvotes': upvote_count,
                'downvotes': downvote_count,
                'userVote': 'upvote' if client_ip in place_votes['upvotes'] else ('downvote' if client_ip in place_votes['downvotes'] else None)
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to save vote'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/places/<place_id>', methods=['GET'])
def get_place_details(place_id):
    try:
        places = read_places()
        place = next((p for p in places if p['id'] == place_id), None)
        
        if not place:
            return jsonify({'success': False, 'error': 'Place not found'}), 404
        
        votes_data = read_votes()
        votes = votes_data['votes'].get(place_id, {'upvotes': [], 'downvotes': []})
        comments = votes_data['comments'].get(place_id, [])
        
        client_ip = get_client_ip()
        user_vote = None
        if client_ip in votes['upvotes']:
            user_vote = 'upvote'
        elif client_ip in votes['downvotes']:
            user_vote = 'downvote'
        
        place['upvotes'] = len(votes['upvotes'])
        place['downvotes'] = len(votes['downvotes'])
        place['verified'] = place['upvotes'] >= 3
        place['hidden'] = place['downvotes'] >= 3
        place['comments'] = comments
        place['userVote'] = user_vote
        
        return jsonify({'success': True, 'place': place})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/places/search', methods=['GET'])
def search_places():
    query = request.args.get('q', '').lower()
    category = request.args.get('category', '')
    
    places = read_places()
    votes_data = read_votes()
    
    for place in places:
        place_id = place['id']
        votes = votes_data['votes'].get(place_id, {'upvotes': [], 'downvotes': []})
        place['upvotes'] = len(votes.get('upvotes', []))
        place['downvotes'] = len(votes.get('downvotes', []))
        place['verified'] = place['upvotes'] >= 3
        place['hidden'] = place['downvotes'] >= 3
    
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