from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit
from src import ImageManager
import signal

image_manager = ImageManager()
app = Flask(__name__, static_folder='resources')
socketio = SocketIO(app)

def handle_signal(signum, frame):
    """
    Handles the sigint and sigterm signals by closing the image manager.
    """
    global image_manager
    print(f"Received signal {signum}. Exiting gracefully...", flush=True)
    image_manager.close()
    exit(0)

@app.route('/')
def index():
    """
    Serves the website html.
    """
    return render_template('digital_garden.html')

@app.route('/resources/<path:filename>')
def static_files(filename):
    """
    Serves all static files.
    """
    return send_from_directory(app.static_folder, filename)

@app.route("/queue_event", methods=["POST"])
def queue_event():
    """
    Handles the queue event post request, which snycs local pixel changes to the server.
    """
    event_dict = request.get_json()
    image_manager.add_event_to_queue(event_dict)
    return {}, 200

@app.route("/poll_full_image", methods=["GET"])
def send_full_image():
    """
    Returns the full image to a client when it requests it.
    """
    image = None
    size = None
    with image_manager.image_lock:
        size = image_manager.get_size()
        image = image_manager.get_image()
    return {"size_x": size[0],
            "size_y": size[1],
            "image": image}, 200

if __name__ == '__main__':
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    print("[Info] Starting up server.", flush=True)
    socketio.run(app, debug=False, host="0.0.0.0", port=80)
    #app.run(debug=False, host="0.0.0.0", port=80)
