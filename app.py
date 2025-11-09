from flask import Flask, request, render_template
from featureExtractor import featureExtraction
from pycaret.classification import load_model, predict_model

model = load_model('model/phishingdetection')

def predict(url):
    data = featureExtraction(url)
    result = predict_model(model, data=data)
    prediction_score = result['prediction_score'][0]  
    prediction_label = result['prediction_label'][0] 
    
    return {
        'prediction_label': prediction_label,
        'prediction_score': prediction_score * 100,
    }
    
    
    
app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    data = None
    if request.method == "POST":
        url = request.form["url"]
        data = predict(url)
        return render_template('index.html', url=url, data=data )
    return render_template("index.html", data=data)

if __name__ == "__main__":
    app.run(debug=True)

    from flask import Flask, request, jsonify
from flask_cors import CORS  # Add this import

app = Flask(__name__)
CORS(app)  # Add this line to allow frontend to connect

# ... your existing code ...

@app.route("/analyze-url", methods=["POST"])
def analyze_url():
    try:
        data = request.get_json()
        url = data.get("url")
        
        if not url:
            return jsonify({"error": "URL is required"}), 400
        
        # Use your existing prediction function
        result = predict(url)
        
        return jsonify({
            "prediction_label": result['prediction_label'],
            "prediction_score": result['prediction_score']
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ... rest of your existing code ...