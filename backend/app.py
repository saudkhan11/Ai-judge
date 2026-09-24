"""app.py — AI Judge Final Production Backend"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import timedelta, datetime
import os, time
from dotenv import load_dotenv
from database import User, Hackathon, Team, Submission, Evaluation, HumanScore, Leaderboard, File as FileModel, ChatSession
from evaluator import AIEvaluator
from ocr_processor import OCRProcessor
from stt_processor import STTProcessor
from ai_service import AIService

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
app.config["JWT_SECRET_KEY"]           = os.getenv("JWT_SECRET","change-this-secret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
app.config["MAX_CONTENT_LENGTH"]       = 50 * 1024 * 1024
app.config["UPLOAD_FOLDER"]            = "uploads"
jwt = JWTManager(app)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

print("Loading AI models...")
ai_service    = AIService()
evaluator     = AIEvaluator(ai_service)
ocr_processor = OCRProcessor()
stt_processor = STTProcessor()
print("Ready.")

ALLOWED = {"pdf","ppt","pptx","doc","docx","txt","mp4","mp3","wav","zip","png","jpg","jpeg"}
def allowed(f): return "." in f and f.rsplit(".",1)[1].lower() in ALLOWED

# ── AUTH ──────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    d = request.get_json(force=True, silent=True) or {}
    name,email,password,role,org = d.get("name","").strip(),d.get("email","").strip().lower(),d.get("password",""),d.get("role","participant"),d.get("organization","")
    
    if not name or not email or not password: return jsonify({"error":"All fields required"}),400
    if len(password)<8: return jsonify({"error":"Password min 8 chars"}),400
    if User.find_by_email(email): return jsonify({"error":"Email already registered"}),409
    user  = User.create(name=name,email=email,password=generate_password_hash(password),role=role,organization=org)
    token = create_access_token(identity=str(user["_id"]))
    return jsonify({"token":token,"user":{"id":str(user["_id"]),"name":name,"email":email,"role":role}}),201

@app.route("/api/auth/login", methods=["POST"])
def login():
    d = request.get_json(force=True,silent=True) or {}
    email,password = d.get("email","").strip().lower(),d.get("password","")
    user = User.find_by_email(email)
    if not user or not check_password_hash(user["password"],password):
        return jsonify({"error":"Invalid credentials"}),401
    User.update_last_login(str(user["_id"]))
    token = create_access_token(identity=str(user["_id"]))
    return jsonify({"token":token,"user":{"id":str(user["_id"]),"name":user["name"],"email":email,"role":user["role"],"organization":user.get("organization","")}})

@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user = User.find_by_id(get_jwt_identity())
    if not user: return jsonify({"error":"Not found"}),404
    user.pop("password",None); user["_id"]=str(user["_id"])
    return jsonify(user)

# ── HACKATHONS ────────────────────────────────
@app.route("/api/hackathons", methods=["GET"])
def get_hackathons():
    return jsonify(Hackathon.find_all(status=request.args.get("status")))

@app.route("/api/hackathons", methods=["POST"])
@jwt_required()
def create_hackathon():
    d = request.get_json(force=True,silent=True) or {}
    if not d.get("title") or not d.get("start_date") or not d.get("end_date"):
        return jsonify({"error":"title, start_date, end_date required"}),400
    return jsonify(Hackathon.create(organizer_id=get_jwt_identity(),**d)),201

@app.route("/api/hackathons/<hid>", methods=["GET"])
def get_hackathon(hid):
    h = Hackathon.find_by_id(hid)
    return jsonify(h) if h else (jsonify({"error":"Not found"}),404)

@app.route("/api/hackathons/<hid>", methods=["PUT"])
@jwt_required()
def update_hackathon(hid):
    h = Hackathon.find_by_id(hid)
    if not h: return jsonify({"error":"Not found"}),404
    if str(h["organizer_id"])!=get_jwt_identity(): return jsonify({"error":"Unauthorized"}),403
    Hackathon.update(hid,request.get_json(force=True,silent=True) or {})
    return jsonify({"message":"Updated"})

# ── TEAMS ─────────────────────────────────────
@app.route("/api/hackathons/<hid>/teams", methods=["GET"])
def get_teams(hid): return jsonify(Team.find_by_hackathon(hid))

@app.route("/api/hackathons/<hid>/teams", methods=["POST"])
@jwt_required()
def register_team(hid):
    d = request.get_json(force=True,silent=True) or {}
    if not d.get("name"): return jsonify({"error":"Team name required"}),400
    return jsonify(Team.create(hackathon_id=hid,leader_id=get_jwt_identity(),**d)),201

# ── SUBMISSIONS ───────────────────────────────
@app.route("/api/submissions", methods=["POST"])
@jwt_required()
def create_submission():
    d = request.get_json(force=True,silent=True) or {}
    for f in ["hackathon_id","team_id","project_title","description"]:
        if not d.get(f): return jsonify({"error":f"{f} required"}),400
    return jsonify(Submission.create(submitted_by=get_jwt_identity(),**d)),201

@app.route("/api/submissions/<sid>/upload", methods=["POST"])
@jwt_required()
def upload_file(sid):
    if "file" not in request.files: return jsonify({"error":"No file"}),400
    file = request.files["file"]
    if not file or not allowed(file.filename): return jsonify({"error":"File type not allowed"}),400
    filename = secure_filename(file.filename)
    fname    = f"{int(time.time())}_{filename}"
    fpath    = os.path.join(app.config["UPLOAD_FOLDER"],fname)
    file.save(fpath)
    ext      = filename.rsplit(".",1)[1].lower()
    ocr_text = stt_text = ""
    if ext in {"pdf","ppt","pptx","doc","docx"}: ocr_text = ocr_processor.extract_text(fpath); ftype="document"
    elif ext in {"mp4","mp3","wav"}: stt_text = stt_processor.transcribe(fpath); ftype="audio_video"
    elif ext in {"png","jpg","jpeg"}: ocr_text = ocr_processor.extract_from_image(fpath); ftype="image"
    else: ftype="other"
    FileModel.create(submission_id=sid,filename=fname,original_name=filename,file_type=ftype,file_path=fpath,ocr_text=ocr_text,stt_text=stt_text,size_bytes=os.path.getsize(fpath))
    if ocr_text or stt_text: Submission.append_extracted_text(sid,ocr_text or stt_text)
    return jsonify({"filename":filename,"type":ftype,"ocr_chars":len(ocr_text),"stt_chars":len(stt_text)})

# ── EVALUATE — CORE ───────────────────────────
@app.route("/api/evaluate", methods=["POST"])
@jwt_required()
def evaluate():
    user_id = get_jwt_identity()
    d = request.get_json(force=True,silent=True) or {}
    team   = d.get("team_name","")
    title  = d.get("project_title","")
    manual = d.get("description","")
    stack  = d.get("tech_stack","")
    github = d.get("github_link","")
    domain = d.get("domain","general")
    sid    = d.get("submission_id")
    hid    = d.get("hackathon_id")

    if not team or not title or not manual:
        return jsonify({"error":"team_name, project_title, description required"}),400

    # Fetch OCR/STT text from uploaded files if submission exists
    ocr_text = stt_text = ""
    if sid:
        sub = Submission.find_by_id(sid)
        if sub:
            files = list(FileModel.col().find({"submission_id":sid}))
            for f in files:
                if f.get("ocr_text"): ocr_text += f["ocr_text"] + "\n"
                if f.get("stt_text"): stt_text += f["stt_text"] + "\n"

    start_ms = int(time.time()*1000)

    # Run full pipeline — passes both sources separately for fusion
    result = evaluator.evaluate(
        manual_desc=manual, team=team, title=title,
        tech_stack=stack, domain=domain, github=github,
        ocr_text=ocr_text.strip(), stt_text=stt_text.strip()
    )
    result["processing_time_ms"] = int(time.time()*1000) - start_ms

    eval_id = Evaluation.create(user_id=user_id,submission_id=sid,hackathon_id=hid,
                                team=team,title=title,description=manual,
                                tech_stack=stack,github=github,domain=domain,result=result)
    result["evaluation_id"] = str(eval_id)

    if hid and sid:
        Leaderboard.upsert(hackathon_id=hid,team_id=d.get("team_id",""),
                           submission_id=sid,ai_score=result["weighted_score"])
    return jsonify(result)

# ── HUMAN SCORE ───────────────────────────────
@app.route("/api/human-score", methods=["POST"])
@jwt_required()
def add_human_score():
    user_id = get_jwt_identity()
    d       = request.get_json(force=True,silent=True) or {}
    eid,scores,comment = d.get("evaluation_id"),d.get("scores",{}),d.get("comments","")
    if not eid or not scores: return jsonify({"error":"evaluation_id and scores required"}),400
    ev = Evaluation.find_by_id(eid)
    if not ev: return jsonify({"error":"Evaluation not found"}),404
    WEIGHTS = {"Innovation & Originality":0.25,"Technical Complexity":0.20,"Feasibility & Scalability":0.20,"Impact & Social Good":0.15,"Functional MVP":0.10,"Clarity & Documentation":0.10}
    hw  = round(sum(scores.get(c,0)*w for c,w in WEIGHTS.items()),2)
    hs  = HumanScore.create(evaluation_id=eid,judge_id=user_id,scores=scores,weighted_score=hw,comments=comment)
    cmp = evaluator.compare_human_ai(ev["result"]["adjusted_scores"],scores,WEIGHTS)
    if ev.get("hackathon_id"):
        Leaderboard.update_human_score(ev["hackathon_id"],ev.get("submission_id",""),hw,round(ev["result"]["weighted_score"]*0.6+hw*0.4,2))
    return jsonify({"human_score_id":str(hs["_id"]),"human_weighted":hw,"comparison":cmp})

# ── LEADERBOARD ───────────────────────────────
@app.route("/api/hackathons/<hid>/leaderboard", methods=["GET"])
def get_leaderboard(hid): return jsonify(Leaderboard.get_ranked(hid))

# ── CHAT ──────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    d       = request.get_json(force=True,silent=True) or {}
    message,history,eid = d.get("message","").strip(),d.get("history",[]),d.get("evaluation_id")
    if not message: return jsonify({"error":"message required"}),400
    context = ""
    if eid:
        ev = Evaluation.find_by_id(eid)
        if ev:
            r = ev["result"]
            context = (f'Last evaluated: "{r.get("title","")}" score {r.get("weighted_score",0)}/10. '
                       f'Source: {r.get("source_info","unknown")}. '
                       f'Bias applied: {r.get("bias",{}).get("bias_applied",False)}. '
                       f'HITL: {r.get("hitl",{}).get("triggered",False)}.')
    reply,provider = ai_service.chat(history+[{"role":"user","content":message}],context)
    ChatSession.append_message(user_id,eid,message,reply)
    return jsonify({"reply":reply,"provider":provider})

# ── HISTORY & ANALYTICS ───────────────────────
@app.route("/api/evaluations", methods=["GET"])
@jwt_required()
def get_evaluations():
    return jsonify(Evaluation.find_by_user(get_jwt_identity(),page=int(request.args.get("page",1)),limit=int(request.args.get("limit",20))))

@app.route("/api/evaluations/<eid>", methods=["GET"])
@jwt_required()
def get_evaluation(eid):
    ev = Evaluation.find_by_id(eid)
    if not ev: return jsonify({"error":"Not found"}),404
    if str(ev.get("user_id"))!=get_jwt_identity(): return jsonify({"error":"Unauthorized"}),403
    return jsonify(ev)

@app.route("/api/analytics", methods=["GET"])
@jwt_required()
def get_analytics():
    return jsonify(Evaluation.get_analytics(get_jwt_identity()))

# ── HEALTH ────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","timestamp":datetime.utcnow().isoformat(),"ai_status":ai_service.get_status(),"version":"4.0.0-final"})

if __name__=="__main__":
    app.run(debug=os.getenv("FLASK_ENV")=="development",host="0.0.0.0",port=int(os.getenv("PORT",5000)))
