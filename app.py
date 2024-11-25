from flask import Flask, render_template, send_from_directory, request
from src import ImageManager
import signal

image_manager = ImageManager()
app = Flask(__name__, static_folder='resources')

def handle_signal(signum, frame):
    print(f"Received signal {signum}. Exiting gracefully...")
    exit(0)

@app.route('/')
def index():
    return render_template('digital_garden.html')

@app.route('/resources/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route("/queue_event", methods=["POST"])
def queue_event():
    event_dict = request.get_json()
    image_manager.add_event_to_queue(event_dict)
    return {}, 200

@app.route("/poll_full_image", methods=["GET"])
def send_full_image():
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
    app.run(debug=False, host="0.0.0.0", port=80)