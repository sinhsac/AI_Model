import http.server
import socketserver
import json
import os
import sys
import base64
import re
from datetime import datetime
from urllib.parse import urlparse, parse_qs

PORT = 6969
import traceback

# Force UTF-8 for logs
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import socket

def get_local_ip():
    try:
        # Connect to an external server to determine the specific interface
        # This doesn't actually establish a connection
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CONFIGS_DIR = os.path.join(DATA_DIR, 'configs')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
UPLOADS_DIR = os.path.join(DATA_DIR, 'uploads')
ITEMS_PER_PAGE = 8

# Ensure dirs exist
if not os.path.exists(CONFIGS_DIR):
    os.makedirs(CONFIGS_DIR)
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# Shared Scenes Path
SCENES_PATH = os.path.join(CONFIGS_DIR, 'scenes.json')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse Query Params first to get clean path
        parsed_url = urlparse(self.path)
        clean_path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        profile_id = query_params.get('id', ['linhtrang'])[0] # Default to linhtrang

        # Serve Static Files
        if clean_path == '/' or clean_path == '/index.html':
            self.path = '/public/index.html'
        elif clean_path == '/galleries' or clean_path == '/galleries.html':
            self.path = '/public/galleries.html'
        elif clean_path.startswith('/style.css'):
             self.path = '/public/style.css'
        elif clean_path.startswith('/app.js'):
             self.path = '/public/app.js'
        elif clean_path.startswith('/galleries.js'):
             self.path = '/public/galleries.js'
        elif clean_path.startswith('/uploads/'):
            # Allow serving uploaded images
            # Map /uploads/x to /data/uploads/x
            # self.path is relative to CWD
            self.path = '/data' + clean_path
            
        # API: List Profiles
        if clean_path == '/api/profiles':
            try:
                profiles = []
                for f in os.listdir(CONFIGS_DIR):
                    if f.startswith('character_profile_') and f.endswith('.json'):
                        # character_profile_xxx.json -> xxx
                        p_id = f.replace('character_profile_', '').replace('.json', '')
                        
                        # Read name from file
                        try:
                            with open(os.path.join(CONFIGS_DIR, f), 'r', encoding='utf-8') as pf:
                                p_data = json.load(pf)
                                p_name = p_data.get('character', {}).get('name', p_id)
                        except:
                            p_name = p_id
                            
                        profiles.append({'id': p_id, 'name': p_name})
                
                self.send_json({'profiles': profiles})
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        # API: Get Profile (Merges Profile + Shared Scenes with Filtered Images)
        if parsed_url.path == '/api/profile':
            try:
                profile_path = os.path.join(CONFIGS_DIR, f'character_profile_{profile_id}.json')
                
                if not os.path.exists(profile_path):
                    self.send_error(404, "Profile not found")
                    return

                # Read Profile
                with open(profile_path, 'r', encoding='utf-8') as f:
                    profile_data = json.load(f)
                
                # Read Shared Scenes
                if os.path.exists(SCENES_PATH):
                    with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                        scenes_source = json.load(f)
                    
                    # FILTER IMAGES FOR PROFILE
                    processed_scenes = []
                    for scene in scenes_source.get('scenes', []):
                        # Create a copy to not mutate cache significantly (though per request)
                        s = scene.copy()
                        # Get images for this profile, default to empty list
                        images_map = s.get('generated_images', {})
                        # If legacy array (shouldn't happen with migration, but safe check)
                        if isinstance(images_map, list):
                            s['generated_images'] = images_map if profile_id == 'linhtrang' else []
                        else:
                            s['generated_images'] = images_map.get(profile_id, [])
                        
                        processed_scenes.append(s)
                    
                    scenes_data = {"scenes": processed_scenes}
                else:
                    scenes_data = {"scenes": []}

                # Merge
                full_data = {**profile_data, **scenes_data}
                
                self.send_json(full_data)
                return
            except Exception as e:
                print(f"Error in GET {clean_path}: {e}")
                traceback.print_exc()
                self.send_error(500, str(e))
                return

        # Default static file serving
        if not self.path.startswith('/api') and not self.path.startswith('/public') and not self.path.startswith('/data'):
             self.path = '/public' + self.path
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def log_message(self, format, *args):
        # Override to ensure UTF-8 printing and custom format if needed
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.client_address[0],
                          self.log_date_time_string(),
                          format % args))

    def send_error(self, code, message=None, explain=None):
        # Custom error handling to log specific file for 404
        if code == 404:
            print(f"❌ [404 Not Found] File: {self.path}")
        super().send_error(code, message, explain)

    def do_POST(self):
        length = int(self.headers.get('content-length'))
        body = self.rfile.read(length).decode('utf-8')
        req_data = json.loads(body)
        
        # Profile ID for context
        profile_id = req_data.get('profileId', 'linhtrang')
        
        profile_path = os.path.join(CONFIGS_DIR, f'character_profile_{profile_id}.json')

        # API: Create Profile (New or Clone)
        if self.path == '/api/profiles':
            try:
                new_id = req_data.get('id')
                new_name = req_data.get('name')
                source_id = req_data.get('sourceId') # Optional: ID to clone from
                
                if not new_id:
                     self.send_error(400, "Missing ID")
                     return

                # Check if exists
                new_p_path = os.path.join(CONFIGS_DIR, f'character_profile_{new_id}.json')
                if os.path.exists(new_p_path):
                    self.send_error(400, "Profile ID already exists")
                    return

                if source_id:
                    # Clone Mode
                    source_path = os.path.join(CONFIGS_DIR, f'character_profile_{source_id}.json')
                    if not os.path.exists(source_path):
                        self.send_error(404, "Source Profile not found")
                        return
                        
                    with open(source_path, 'r', encoding='utf-8') as f:
                        source_data = json.load(f)
                    
                    # Update name/id of clone
                    if new_name:
                        source_data['character']['name'] = new_name
                    
                    with open(new_p_path, 'w', encoding='utf-8') as f:
                        json.dump(source_data, f, indent=2, ensure_ascii=False)
                else:
                    # Create New Template
                    template = {
                        "character": {
                            "name": new_name or new_id,
                            "age": "20",
                            "ethnicity": "Vietnamese",
                            "face": {},
                            "body": {},
                            "hair": "",
                            "base_outfit": {},
                            "photography": { "lighting": "natural", "quality": "high", "composition": "standard" }
                        }
                    }
                    
                    with open(new_p_path, 'w', encoding='utf-8') as f:
                        json.dump(template, f, indent=2, ensure_ascii=False)
                
                # Scenes are shared, so no scene file creation needed
                
                self.send_json({'success': True})
            except Exception as e:
                print(f"Error in POST {self.path}: {e}")
                traceback.print_exc()
                self.send_error(500, str(e))
            return

        # API: Add Scene (Adds Globally)
        if self.path == '/api/scenes':
            try:
                new_scene = req_data.get('newScene')
                
                if not os.path.exists(SCENES_PATH):
                    with open(SCENES_PATH, 'w', encoding='utf-8') as f:
                        json.dump({"scenes": []}, f)

                with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if not new_scene.get('id'):
                    count = len(data['scenes']) + 1
                    new_scene['id'] = f"scene_{count:02d}"
                
                now = datetime.now().isoformat()
                new_scene['createdAt'] = now
                new_scene['updatedAt'] = now
                # Init empty map for images
                new_scene['generated_images'] = {} 
                
                data['scenes'].append(new_scene)
                self.save_json(SCENES_PATH, data)
                
                # Return strict frontend structure (array)
                new_scene['generated_images'] = []
                self.send_json({'success': True, 'scene': new_scene})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Generate Prompt
        if self.path == '/api/generate-prompt':
            try:
                scene = req_data.get('scene')
                
                with open(profile_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                prompt = self.generate_prompt_logic(scene, data['character'])
                self.send_json({'prompt': prompt})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Upload Image
        if self.path == '/api/upload':
            try:
                image_data = req_data.get('image') # Base64 string
                scene_id = req_data.get('sceneId')
                
                if not image_data or not scene_id:
                    self.send_error(400, "Missing image or sceneId")
                    return

                # Decode Base64
                if "," in image_data:
                    header, encoded = image_data.split(",", 1)
                else:
                    encoded = image_data
                
                file_data = base64.b64decode(encoded)
                
                # Create Profile/Scene Dir
                # Path: public/uploads/{profileId}/{sceneId}/...
                scene_dir = os.path.join(UPLOADS_DIR, profile_id, scene_id)
                if not os.path.exists(scene_dir):
                    os.makedirs(scene_dir)
                
                filename = f"{int(datetime.now().timestamp())}.jpg"
                filepath = os.path.join(scene_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(file_data)
                
                # Update JSON (Shared Scenes)
                with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                relative_path = f"/uploads/{profile_id}/{scene_id}/{filename}"
                
                found = False
                for scene in data['scenes']:
                    if scene['id'] == scene_id:
                        # Ensure dict
                        if type(scene.get('generated_images')) is not dict:
                            scene['generated_images'] = {}
                        
                        # Init list for profile if needed
                        if profile_id not in scene['generated_images']:
                            scene['generated_images'][profile_id] = []
                            
                        scene['generated_images'][profile_id].append(relative_path)
                        scene['updatedAt'] = datetime.now().isoformat()
                        found = True
                        break
                
                if found:
                    self.save_json(SCENES_PATH, data)
                    self.send_json({'success': True, 'url': relative_path})
                else:
                    self.send_error(404, "Scene not found")
                
            except Exception as e:
                print(f"Error in Upload: {e}")
                traceback.print_exc()
                self.send_error(500, str(e))
            return

    def do_PUT(self):
        length = int(self.headers.get('content-length'))
        body = self.rfile.read(length).decode('utf-8')
        req_data = json.loads(body)
        profile_id = req_data.get('profileId', 'linhtrang')
        
        profile_path = os.path.join(CONFIGS_DIR, f'character_profile_{profile_id}.json')

        # API: Update Profile
        if self.path == '/api/profile':
            try:
                new_char = req_data.get('character')
                
                with open(profile_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                data['character'] = new_char # Replace
                self.save_json(profile_path, data)
                self.send_json({'success': True})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Update Scene (Global Update)
        if self.path == '/api/scenes':
            try:
                updated_scene = req_data.get('scene')
                
                with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for i, scene in enumerate(data['scenes']):
                    if scene['id'] == updated_scene['id']:
                        # Update metadata fields only, Preserve Images Map
                        # The frontend sends 'generated_images' as array (from the GET filter)
                        # We must NOT overwrite the global map with that array.
                        current_images_map = scene.get('generated_images', {})
                        
                        # Replace entire object to support arbitrary fields editing via JSON
                        data['scenes'][i] = updated_scene
                        
                        # Restore critical system fields
                        data['scenes'][i]['generated_images'] = current_images_map
                        data['scenes'][i]['updatedAt'] = datetime.now().isoformat()
                        
                        # Ensure createdAt is preserved if missing in update (unlikely if full JSON editing but safe)
                        if 'createdAt' not in data['scenes'][i] and 'createdAt' in scene:
                            data['scenes'][i]['createdAt'] = scene['createdAt']
                        
                        break
                
                self.save_json(SCENES_PATH, data)
                self.send_json({'success': True})
            except Exception as e:
                self.send_error(500, str(e))
            return

    def do_DELETE(self):
        # API: Delete Uploaded Image
        if self.path.startswith('/api/upload'):
            try:
                parsed_url = urlparse(self.path)
                query_params = parse_qs(parsed_url.query)
                image_path = query_params.get('path', [None])[0]
                profile_id = query_params.get('profileId', ['linhtrang'])[0]
                
                if not image_path:
                    self.send_error(400, "Missing image path")
                    return

                # Security check: ensure path is within uploads
                # image_path is like /uploads/linhtrang/scene_01/123.jpg
                # relative to public dir
                
                if not image_path.startswith('/uploads/'):
                    self.send_error(403, "Invalid path")
                    return
                
                full_path = os.path.join(PUBLIC_DIR, image_path.lstrip('/'))
                
                # Delete File
                if os.path.exists(full_path):
                    os.remove(full_path)
                
                # Update JSON
                with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                found = False
                for scene in data['scenes']:
                    images = scene.get('generated_images', {})
                    # If dict
                    if isinstance(images, dict):
                        if profile_id in images and image_path in images[profile_id]:
                            images[profile_id].remove(image_path)
                            scene['updatedAt'] = datetime.now().isoformat()
                            found = True
                            break
                    # Legacy list fallback (should not happen after migration but good for safety)
                    elif isinstance(images, list) and profile_id == 'linhtrang':
                         if image_path in images:
                            images.remove(image_path)
                            scene['updatedAt'] = datetime.now().isoformat()
                            found = True
                            break
                
                if found:
                    self.save_json(SCENES_PATH, data)
                    self.send_json({'success': True})
                else:
                    # File might be gone but not in JSON, or vice versa. 
                    # If file deleted but not found in JSON, still success? 
                    # Let's say success if file gone, but warn if logic fails.
                    self.send_json({'success': True, 'message': 'File deleted or record not found'})

            except Exception as e:
                print(e)
                self.send_error(500, str(e))
            return

        # API: Delete Scene
            try:
                scene_id = self.path.split('/')[-1]
                
                with open(SCENES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                initial_len = len(data['scenes'])
                data['scenes'] = [s for s in data['scenes'] if s['id'] != scene_id]
                
                if len(data['scenes']) < initial_len:
                    self.save_json(SCENES_PATH, data)
                    self.send_json({'success': True})
                else:
                    self.send_error(404, "Scene not found")
            except Exception as e:
                self.send_error(500, str(e))
            return
            
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()

    # Helpers
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def save_json(self, path, data):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def generate_prompt_logic(self, scene, character):
        char = character
        
        # Use core_identity_prompt if available and not empty
        if char.get('core_identity_prompt'):
            physical_desc = char['core_identity_prompt']
        else:
            face = char.get('face', {})
            body = char.get('body', {})
            name = char.get('name', 'Character')
            age = char.get('age', '20')
            ethnicity = char.get('ethnicity', '')
            hair = char.get('hair', '')
            
            # Construct meaningful fallback
            physical_desc = f"A high-quality, realistic photo of {name}, {age} years old, {ethnicity}. "
            if hair:
                physical_desc += f"Hair: {hair}. "
            
            # Body
            if body:
                b_details = []
                if body.get('height'): b_details.append(f"height {body['height']}")
                if body.get('type'): b_details.append(f"body type {body['type']}")
                if body.get('chest'): b_details.append(f"chest {body['chest']}")
                if body.get('waist'): b_details.append(f"waist {body['waist']}")
                if body.get('hips'): b_details.append(f"hips {body['hips']}")
                if body.get('arms'): b_details.append(f"arms {body['arms']}")
                if body.get('legs'): b_details.append(f"legs {body['legs']}")
                if body.get('skin_texture'): b_details.append(f"skin {body['skin_texture']}")
                if body.get('characteristics'): b_details.append(body['characteristics'])
                if body.get('overall_aesthetic'): b_details.append(body['overall_aesthetic'])
                
                if b_details:
                    physical_desc += f"Body details: {', '.join(b_details)}. "
            
            # Face
            if face:
                f_details = []
                if face.get('shape'): f_details.append(f"face shape {face['shape']}")
                if face.get('eyes'): f_details.append(f"eyes {face['eyes']}")
                if face.get('skin'): f_details.append(f"skin {face['skin']}")
                
                if f_details:
                    physical_desc += f"Face details: {', '.join(f_details)}. "
            
            # Background/Lifestyle
            background = char.get('background', {})
            if background.get('lifestyle'):
                 physical_desc += f"Lifestyle context: {background['lifestyle']}. "
        
        action = scene.get('action', '')
        setting = scene.get('setting', '')
        view = scene.get('view', '')
        props = scene.get('props', '')
        lighting = scene.get('lighting', char.get('photography', {}).get('lighting', ''))
        
        if 'outfit_changes' in scene:
            outfit = scene['outfit_changes']
        else:
            bo = char.get('base_outfit', {})
            outfit = f"{bo.get('top','')}, {bo.get('bottom','')}"

        full_prompt = (
            f"{physical_desc} Action: {action}. Outfit: {outfit}. Setting: {setting}. "
        )
        if props:
            full_prompt += f"Props: {props}. "
        full_prompt += f"Lighting: {lighting}. View: {view}."

        # Image Count Logic
        image_count = int(scene.get('image_count', 1))
        if image_count > 1:
            full_prompt = f"[Generate {image_count} images] " + full_prompt
        
        return full_prompt

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    local_ip = get_local_ip()
    print(f"Serving at port {PORT}")
    print(f"Local Access: http://localhost:{PORT}")
    print(f"Network Access: http://{local_ip}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
