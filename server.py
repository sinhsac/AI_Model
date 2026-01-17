import http.server
import socketserver
import json
import os
import sys
import base64
from datetime import datetime

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_PATH = os.path.join(BASE_DIR, 'character_profile.json')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
UPLOAD_DIR = os.path.join(PUBLIC_DIR, 'uploads')

# Ensure upload dir exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve Static Files
        if self.path == '/' or self.path == '/index.html':
            self.path = '/public/index.html'
        elif self.path == '/galleries' or self.path == '/galleries.html':
            self.path = '/public/galleries.html'
        elif self.path.startswith('/style.css'):
             self.path = '/public/style.css'
        elif self.path.startswith('/app.js'):
             self.path = '/public/app.js'
        elif self.path.startswith('/galleries.js'):
             self.path = '/public/galleries.js'
        elif self.path.startswith('/uploads/'):
            # Allow serving uploaded images
            self.path = '/public' + self.path
            
        # API: Get Profile (with Pagination support for scenes)
        if self.path.startswith('/api/profile'):
            try:
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Parse query params for pagination logic not strictly needed if we just return all
                # But let's support a simple ?full=true or similar if needed. 
                # For now, return ALL data, frontend handles pagination (easier for <100 items).
                # User asked for pagination because "scenes can be too many". 
                # Let's return full data for v2.0, frontend paginates.
                # If we need server-side, we'd parse `self.path` query string.
                
                self.send_json(data)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        # Default static file serving
        if not self.path.startswith('/api') and not self.path.startswith('/public'):
             self.path = '/public' + self.path
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        length = int(self.headers.get('content-length'))
        body = self.rfile.read(length).decode('utf-8')
        
        # API: Add Scene
        if self.path == '/api/scenes':
            try:
                req_data = json.loads(body)
                new_scene = req_data.get('newScene')
                
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if not new_scene.get('id'):
                    count = len(data['scenes']) + 1
                    new_scene['id'] = f"scene_{count:02d}"
                
                now = datetime.now().isoformat()
                new_scene['createdAt'] = now
                new_scene['updatedAt'] = now
                new_scene['generated_images'] = []
                
                data['scenes'].append(new_scene)
                self.save_profile(data)
                
                self.send_json({'success': True, 'scene': new_scene})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Generate Prompt
        if self.path == '/api/generate-prompt':
            try:
                req_data = json.loads(body)
                scene = req_data.get('scene')
                
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                prompt = self.generate_prompt_logic(scene, data['character'])
                self.send_json({'prompt': prompt})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Upload Image
        if self.path == '/api/upload':
            try:
                req_data = json.loads(body)
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
                
                # Create Scene Dir
                scene_dir = os.path.join(UPLOAD_DIR, scene_id)
                if not os.path.exists(scene_dir):
                    os.makedirs(scene_dir)
                
                filename = f"{int(datetime.now().timestamp())}.jpg" # Simple naming
                filepath = os.path.join(scene_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(file_data)
                
                # Update JSON
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                relative_path = f"/uploads/{scene_id}/{filename}"
                
                for scene in data['scenes']:
                    if scene['id'] == scene_id:
                        if 'generated_images' not in scene:
                            scene['generated_images'] = []
                        scene['generated_images'].append(relative_path)
                        scene['updatedAt'] = datetime.now().isoformat()
                        break
                
                self.save_profile(data)
                self.send_json({'success': True, 'url': relative_path})
                
            except Exception as e:
                print(e)
                self.send_error(500, str(e))
            return

    def do_PUT(self):
        length = int(self.headers.get('content-length'))
        body = self.rfile.read(length).decode('utf-8')

        # API: Update Profile
        if self.path == '/api/profile':
            try:
                req_data = json.loads(body)
                new_char = req_data.get('character')
                
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                data['character'] = new_char # Replace
                self.save_profile(data)
                self.send_json({'success': True})
            except Exception as e:
                self.send_error(500, str(e))
            return

        # API: Update Scene
        if self.path == '/api/scenes':
            try:
                req_data = json.loads(body)
                updated_scene = req_data.get('scene')
                
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for i, scene in enumerate(data['scenes']):
                    if scene['id'] == updated_scene['id']:
                        # Preserve read-only fields if needed, but for now overwrite all
                        # except generated_images if not passed? 
                        # Better: Merge
                        updated_scene['updatedAt'] = datetime.now().isoformat()
                        if 'generated_images' not in updated_scene:
                            updated_scene['generated_images'] = scene.get('generated_images', [])
                        if 'createdAt' not in updated_scene:
                            updated_scene['createdAt'] = scene.get('createdAt', datetime.now().isoformat())
                            
                        data['scenes'][i] = updated_scene
                        break
                
                self.save_profile(data)
                self.send_json({'success': True})
            except Exception as e:
                self.send_error(500, str(e))
            return

    def do_DELETE(self):
        # API: Delete Scene
        if self.path.startswith('/api/scenes/'):
            try:
                scene_id = self.path.split('/')[-1]
                
                with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                initial_len = len(data['scenes'])
                data['scenes'] = [s for s in data['scenes'] if s['id'] != scene_id]
                
                if len(data['scenes']) < initial_len:
                    self.save_profile(data)
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

    def save_profile(self, data):
        with open(PROFILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def generate_prompt_logic(self, scene, character):
        char = character
        
        # Use core_identity_prompt if available (new concise format)
        if 'core_identity_prompt' in char:
            physical_desc = char['core_identity_prompt']
        else:
            # Fallback to building from individual fields (backward compatibility)
            face = char['face']
            body = char['body']
            physical_desc = (
                f"A high-quality, realistic photo of {char['name']}, a {char['age']} Vietnamese woman. "
                f"Ethnicity: {char['ethnicity']}. "
                f"Hair: {char['hair']}. "
                f"Body: {body['type']}, {body['height']}, {body['build']}, {body['posture']}. "
                f"Face: {face['shape']}, {face['skin']}, {face['eyes']}, {face['eyebrows']}, {face['nose']}, {face['lips']}, {face['cheekbones']}. "
                f"Features: {face['features']}."
            )
        
        action = scene.get('action', '')
        setting = scene.get('setting', '')
        view = scene.get('view', '')
        props = scene.get('props', '')
        lighting = scene.get('lighting', char['photography']['lighting'])
        
        if 'outfit_changes' in scene:
            outfit = scene['outfit_changes']
        else:
            bo = char['base_outfit']
            outfit = f"{bo['top']}, {bo['bottom']}, {bo['accessories']}"

        full_prompt = (
            f"{physical_desc} Action: {action}. Outfit: {outfit}. Setting: {setting}. "
        )
        if props:
            full_prompt += f"Props: {props}. "
        full_prompt += f"Lighting: {lighting}. View: {view}. Style: {char['photography']['quality']}, {char['photography']['composition']}."
        
        return full_prompt

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
