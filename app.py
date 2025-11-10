from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

PLACES_FILE = os.path.join('data', 'places.json')
VOTES_FILE = os.path.join('data', 'votes.json')
COMMENTS_FILE = os.path.join('data', 'comments.json')

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

def read_comments():
    try:
        if os.path.exists(COMMENTS_FILE):
            with open(COMMENTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error reading comments: {e}")
        return {}

def write_comments(comments_data):
    try:
        os.makedirs('data', exist_ok=True)
        with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(comments_data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing comments: {e}")
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
    comments_data = read_comments()
    for place in places:
        place_id = place['id']
        votes = votes_data['votes'].get(place_id, {'upvotes': [], 'downvotes': []})
        
        upvote_count = len(votes.get('upvotes', []))
        downvote_count = len(votes.get('downvotes', []))
        
        place['upvotes'] = upvote_count
        place['downvotes'] = downvote_count
        place['verified'] = upvote_count >= 3
        place['hidden'] = downvote_count >= 3
        place_comments = comments_data.get(place_id, [])
        visible_comments = [c for c in place_comments if not c.get('flagged', False)]
        place['commentCount'] = len(visible_comments)
    
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

@app.route('/api/places/<place_id>', methods=['PUT'])
def update_place(place_id):
    try:
        data = request.json
        places = read_places()
        place_index = next((i for i, p in enumerate(places) if p['id'] == place_id), None)
        if place_index is None:
            return jsonify({'success': False, 'error': 'Place not found'}), 404
        
        places[place_index]['name'] = data.get('name', places[place_index]['name'])
        places[place_index]['category'] = data.get('category', places[place_index]['category'])
        places[place_index]['description'] = data.get('description', places[place_index]['description'])
        places[place_index]['address'] = data.get('address', places[place_index]['address'])
        places[place_index]['latitude'] = float(data.get('latitude', places[place_index]['latitude']))
        places[place_index]['longitude'] = float(data.get('longitude', places[place_index]['longitude']))
        places[place_index]['contact'] = data.get('contact', places[place_index].get('contact', ''))
        places[place_index]['openingHours'] = data.get('openingHours', places[place_index].get('openingHours', ''))
        if 'tags' in data:
            places[place_index]['tags'] = data.get('tags', [])
        if write_places(places):
            return jsonify({'success': True, 'place': places[place_index]})
        else:
            return jsonify({'success': False, 'error': 'Failed to save changes'}), 500      
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
        place['userVote'] = user_vote
        comments_data = read_comments()
        place_comments = comments_data.get(place_id, [])
        visible_comments = []
        for comment in place_comments:
            if not comment.get('flagged', False):
                comment['userReported'] = client_ip in comment.get('reports', [])
                comment['reportCount'] = len(comment.get('reports', []))
                visible_comments.append(comment)
        
        place['comments'] = visible_comments
        user_comment_count = sum(1 for c in place_comments if c.get('ip') == client_ip and not c.get('flagged', False))
        place['canComment'] = user_comment_count < 5
        place['userCommentCount'] = user_comment_count
        
        return jsonify({'success': True, 'place': place})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/places/<place_id>/comments', methods=['POST'])
def add_comment(place_id):
    try:
        data = request.json
        comment_text = data.get('comment', '').strip()
        
        if not comment_text:
            return jsonify({'success': False, 'error': 'Comment cannot be empty'}), 400
        
        if len(comment_text) > 500:
            return jsonify({'success': False, 'error': 'Comment too long (max 500 characters)'}), 400
        
        client_ip = get_client_ip()
        comments_data = read_comments()
        
        if place_id not in comments_data:
            comments_data[place_id] = []
        
        place_comments = comments_data[place_id]
        user_comment_count = sum(1 for c in place_comments if c.get('ip') == client_ip and not c.get('flagged', False))
        if user_comment_count >= 5:
            return jsonify({'success': False, 'error': 'You have reached the maximum of 5 comments for this place'}), 400
        comment_id = f"comment_{len(place_comments) + 1:05d}"
        
        new_comment = {
            'id': comment_id,
            'text': comment_text,
            'author': data.get('author', 'Anonymous'),
            'ip': client_ip,
            'timestamp': datetime.now().isoformat(),
            'reports': [],
            'flagged': False
        }
        
        place_comments.append(new_comment)
        
        if write_comments(comments_data):
            return_comment = new_comment.copy()
            return_comment.pop('ip', None)
            return_comment['userReported'] = False
            return_comment['reportCount'] = 0
            
            return jsonify({'success': True, 'comment': return_comment})
        else:
            return jsonify({'success': False, 'error': 'Failed to save comment'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/comments/<comment_id>/report', methods=['POST'])
def report_comment(comment_id):
    try:
        client_ip = get_client_ip()
        comments_data = read_comments()
        
        comment_found = False
        updated_place_id = None
        
        for place_id, place_comments in comments_data.items():
            for comment in place_comments:
                if comment['id'] == comment_id:
                    comment_found = True
                    updated_place_id = place_id
                    
                    if 'reports' not in comment:
                        comment['reports'] = []
                    
                    if client_ip in comment['reports']:
                        return jsonify({'success': False, 'error': 'You have already reported this comment'}), 400
                    
                    comment['reports'].append(client_ip)
                    
                    if len(comment['reports']) >= 3:
                        comment['flagged'] = True
                    
                    if write_comments(comments_data):
                        return jsonify({
                            'success': True,
                            'reportCount': len(comment['reports']),
                            'flagged': comment.get('flagged', False),
                            'placeId': updated_place_id  
                        })
                    else:
                        return jsonify({'success': False, 'error': 'Failed to save report'}), 500
        
        if not comment_found:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
            
    except Exception as e:
        print(f"Error in report_comment: {e}")
        import traceback
        traceback.print_exc()
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