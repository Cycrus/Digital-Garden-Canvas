from flask import Flask, render_template, send_from_directory

app = Flask(__name__, static_folder='resources')

@app.route('/')
def index():
    return render_template('digital_garden.html')

# Serve static files from CodingCatResources
@app.route('/resources/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=80)
