"""
database.py — All MongoDB models for AI Judge Production
Collections: users, hackathons, teams, submissions,
             evaluations, human_scores, leaderboard, files, chat_sessions
"""

from pymongo import MongoClient, DESCENDING, ASCENDING
from bson.objectid import ObjectId
from datetime import datetime
import os

_client = None
_db     = None

def get_db():
    global _client, _db
    if _db is None:
        uri     = os.getenv("MONGODB_URI", "mongodb://localhost:27017/aijudge")
        _client = MongoClient(uri)
        _db     = _client.get_default_database()
        _ensure_indexes()
    return _db

def _ensure_indexes():
    db = _db
    db["users"].create_index("email", unique=True)
    db["hackathons"].create_index([("status",ASCENDING),("start_date",DESCENDING)])
    db["teams"].create_index([("hackathon_id",ASCENDING)])
    db["submissions"].create_index([("hackathon_id",ASCENDING),("team_id",ASCENDING)])
    db["evaluations"].create_index([("user_id",ASCENDING),("created_at",DESCENDING)])
    db["evaluations"].create_index([("hackathon_id",ASCENDING)])
    db["leaderboard"].create_index([("hackathon_id",ASCENDING),("final_score",DESCENDING)])
    db["human_scores"].create_index([("evaluation_id",ASCENDING),("judge_id",ASCENDING)])

def _str_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ══════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════
class User:
    @staticmethod
    def col(): return get_db()["users"]

    @staticmethod
    def create(name, email, password, role="participant", organization=""):
        doc = {
            "name":         name,
            "email":        email,
            "password":     password,
            "role":         role,           # organizer|judge|participant|admin
            "organization": organization,
            "avatar_url":   "",
            "is_verified":  False,
            "plan":         "free",         # free|pro|enterprise
            "total_evals":  0,
            "created_at":   datetime.utcnow(),
            "last_login":   datetime.utcnow()
        }
        r = User.col().insert_one(doc)
        doc["_id"] = r.inserted_id
        return doc

    @staticmethod
    def find_by_email(email):
        return User.col().find_one({"email": email})

    @staticmethod
    def find_by_id(uid):
        try: return User.col().find_one({"_id": ObjectId(uid)})
        except: return None

    @staticmethod
    def update_last_login(uid):
        User.col().update_one({"_id":ObjectId(uid)},
                              {"$set":{"last_login":datetime.utcnow()}})

    @staticmethod
    def increment_evals(uid):
        User.col().update_one({"_id":ObjectId(uid)},
                              {"$inc":{"total_evals":1}})

# ══════════════════════════════════════════════
# HACKATHON
# ══════════════════════════════════════════════
class Hackathon:
    @staticmethod
    def col(): return get_db()["hackathons"]

    @staticmethod
    def create(organizer_id, title, description="", start_date=None,
               end_date=None, domain="general", max_teams=500,
               criteria_weights=None, banner_url="", **kwargs):
        default_weights = {
            "Innovation & Originality":   0.25,
            "Technical Complexity":       0.20,
            "Feasibility & Scalability":  0.20,
            "Impact & Social Good":       0.15,
            "Functional MVP":             0.10,
            "Clarity & Documentation":    0.10
        }
        doc = {
            "organizer_id":     organizer_id,
            "title":            title,
            "description":      description,
            "start_date":       start_date,
            "end_date":         end_date,
            "status":           "draft",    # draft|active|judging|completed|archived
            "domain":           domain,
            "hackathon_type":   kwargs.get("hackathon_type","both"), # college|corporate|both
            "max_teams":        max_teams,
            "registered_teams": 0,
            "total_submissions":0,
            "judges":           [],         # list of user_ids
            "criteria_weights": criteria_weights or default_weights,
            "prize_pool":       kwargs.get("prize_pool",""),
            "banner_url":       banner_url,
            "website":          kwargs.get("website",""),
            "rules":            kwargs.get("rules",""),
            "created_at":       datetime.utcnow(),
            "updated_at":       datetime.utcnow()
        }
        r = Hackathon.col().insert_one(doc)
        doc["_id"] = str(r.inserted_id)
        return doc

    @staticmethod
    def find_all(status=None, limit=50):
        query = {"status": status} if status else {}
        docs  = list(Hackathon.col().find(query).sort("created_at", DESCENDING).limit(limit))
        for d in docs: d["_id"] = str(d["_id"])
        return docs

    @staticmethod
    def find_by_id(hid):
        try:
            d = Hackathon.col().find_one({"_id": ObjectId(hid)})
            return _str_id(d)
        except: return None

    @staticmethod
    def update(hid, data):
        data["updated_at"] = datetime.utcnow()
        Hackathon.col().update_one({"_id":ObjectId(hid)}, {"$set": data})

# ══════════════════════════════════════════════
# TEAM
# ══════════════════════════════════════════════
class Team:
    @staticmethod
    def col(): return get_db()["teams"]

    @staticmethod
    def create(hackathon_id, leader_id, name, members=None,
               institution="", **kwargs):
        doc = {
            "hackathon_id":  hackathon_id,
            "name":          name,
            "leader_id":     leader_id,
            "members":       members or [leader_id],
            "institution":   institution,
            "submission_id": None,
            "final_rank":    None,
            "registered_at": datetime.utcnow()
        }
        r = Team.col().insert_one(doc)
        doc["_id"] = str(r.inserted_id)
        Hackathon.col().update_one({"_id":ObjectId(hackathon_id)},
                                   {"$inc":{"registered_teams":1}})
        return doc

    @staticmethod
    def find_by_hackathon(hid):
        docs = list(Team.col().find({"hackathon_id":hid}).sort("registered_at",DESCENDING))
        for d in docs: d["_id"] = str(d["_id"])
        return docs

# ══════════════════════════════════════════════
# SUBMISSION
# ══════════════════════════════════════════════
class Submission:
    @staticmethod
    def col(): return get_db()["submissions"]

    @staticmethod
    def create(hackathon_id, team_id, project_title, description,
               submitted_by, tech_stack=None, github_link="",
               demo_link="", domain="general", **kwargs):
        doc = {
            "hackathon_id":   hackathon_id,
            "team_id":        team_id,
            "submitted_by":   submitted_by,
            "project_title":  project_title,
            "description":    description,
            "tech_stack":     tech_stack or [],
            "github_link":    github_link,
            "demo_link":      demo_link,
            "domain":         domain,
            "files":          [],
            "extracted_text": "",    # OCR + STT text appended here
            "status":         "submitted",  # submitted|under_review|evaluated
            "submitted_at":   datetime.utcnow(),
            "updated_at":     datetime.utcnow()
        }
        r   = Submission.col().insert_one(doc)
        sid = str(r.inserted_id)
        doc["_id"] = sid
        Hackathon.col().update_one({"_id":ObjectId(hackathon_id)},
                                   {"$inc":{"total_submissions":1}})
        Team.col().update_one({"_id":ObjectId(team_id)},
                              {"$set":{"submission_id":sid}})
        return doc

    @staticmethod
    def find_by_id(sid):
        try: return _str_id(Submission.col().find_one({"_id":ObjectId(sid)}))
        except: return None

    @staticmethod
    def append_extracted_text(sid, text):
        Submission.col().update_one(
            {"_id":ObjectId(sid)},
            {"$set":{"extracted_text":text,"updated_at":datetime.utcnow()}}
        )

# ══════════════════════════════════════════════
# EVALUATION
# ══════════════════════════════════════════════
class Evaluation:
    @staticmethod
    def col(): return get_db()["evaluations"]

    @staticmethod
    def create(user_id, team, title, description, tech_stack,
               github, domain, result, submission_id=None, hackathon_id=None):
        doc = {
            "user_id":           user_id,
            "submission_id":     submission_id,
            "hackathon_id":      hackathon_id,
            "team":              team,
            "title":             title,
            "description":       description[:2000],  # cap stored text
            "tech_stack":        tech_stack,
            "github":            github,
            "domain":            domain,

            # ── AI RESULT (full data stored) ──
            "raw_scores":           result.get("raw_scores",{}),
            "adjusted_scores":      result.get("adjusted_scores",{}),
            "weighted_score":       result.get("weighted_score",0),
            "originality":          result.get("originality",0),
            "risk_level":           result.get("risk_level","Medium"),
            "deployment_readiness": result.get("deployment_readiness","Prototype"),
            "weights":              result.get("weights",{}),

            # ── ANALYSIS ──
            "strengths":                result.get("strengths",[]),
            "weaknesses":               result.get("weaknesses",[]),
            "technical_recommendations":result.get("technical_recommendations",[]),
            "scaling_suggestions":      result.get("scaling_suggestions",[]),

            # ── ALGORITHM DATA ──
            "nlp_analysis":      result.get("nlp_analysis",{}),
            "nlp_raw_score":     result.get("nlp_raw_score",0),
            "bias_report":       result.get("bias",{}),
            "hitl_triggered":    result.get("hitl",{}).get("triggered",False),
            "hitl_reason":       result.get("hitl",{}).get("reason",""),
            "models_used":       result.get("models_used",""),
            "ai_provider":       result.get("ai_provider",""),
            "processing_time_ms":result.get("processing_time_ms",0),

            "result":            result,  # full result blob
            "created_at":        datetime.utcnow()
        }
        r = Evaluation.col().insert_one(doc)
        User.increment_evals(user_id)
        return r.inserted_id

    @staticmethod
    def find_by_id(eid):
        try:
            d = Evaluation.col().find_one({"_id":ObjectId(eid)})
            return _str_id(d)
        except: return None

    @staticmethod
    def find_by_user(user_id, page=1, limit=20):
        skip = (page-1)*limit
        docs = list(Evaluation.col()
                    .find({"user_id":user_id})
                    .sort("created_at",DESCENDING)
                    .skip(skip).limit(limit))
        for d in docs: d["_id"] = str(d["_id"])
        return docs

    @staticmethod
    def get_analytics(user_id):
        pipeline = [
            {"$match":{"user_id":user_id}},
            {"$group":{
                "_id":None,
                "total":       {"$sum":1},
                "avg_score":   {"$avg":"$weighted_score"},
                "max_score":   {"$max":"$weighted_score"},
                "min_score":   {"$min":"$weighted_score"},
                "hitl_count":  {"$sum":{"$cond":["$hitl_triggered",1,0]}},
                "bias_count":  {"$sum":{"$cond":["$bias_report.bias_applied",1,0]}}
            }}
        ]
        result = list(Evaluation.col().aggregate(pipeline))
        return result[0] if result else {}

# ══════════════════════════════════════════════
# HUMAN SCORE
# ══════════════════════════════════════════════
class HumanScore:
    @staticmethod
    def col(): return get_db()["human_scores"]

    @staticmethod
    def create(evaluation_id, judge_id, scores,
               weighted_score, comments=""):
        doc = {
            "evaluation_id":  evaluation_id,
            "judge_id":       judge_id,
            "scores":         scores,        # {criterion: score}
            "weighted_score": weighted_score,
            "comments":       comments,
            "scored_at":      datetime.utcnow()
        }
        r = HumanScore.col().insert_one(doc)
        doc["_id"] = str(r.inserted_id)
        return doc

    @staticmethod
    def find_by_evaluation(eid):
        docs = list(HumanScore.col().find({"evaluation_id":eid}))
        for d in docs: d["_id"] = str(d["_id"])
        return docs

# ══════════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════════
class Leaderboard:
    @staticmethod
    def col(): return get_db()["leaderboard"]

    @staticmethod
    def upsert(hackathon_id, team_id, submission_id, ai_score):
        Leaderboard.col().update_one(
            {"hackathon_id":hackathon_id,"submission_id":submission_id},
            {"$set":{
                "hackathon_id":  hackathon_id,
                "team_id":       team_id,
                "submission_id": submission_id,
                "ai_score":      ai_score,
                "human_score":   None,
                "final_score":   ai_score,  # updated when human scores added
                "rank":          None,       # computed on fetch
                "updated_at":    datetime.utcnow()
            }},
            upsert=True
        )

    @staticmethod
    def update_human_score(hackathon_id, submission_id, human_score, final_score):
        Leaderboard.col().update_one(
            {"hackathon_id":hackathon_id,"submission_id":submission_id},
            {"$set":{"human_score":human_score,
                     "final_score":final_score,
                     "updated_at":datetime.utcnow()}}
        )

    @staticmethod
    def get_ranked(hackathon_id):
        docs = list(Leaderboard.col()
                    .find({"hackathon_id":hackathon_id})
                    .sort("final_score",DESCENDING))
        for i, d in enumerate(docs):
            d["_id"]  = str(d["_id"])
            d["rank"] = i + 1
        return docs

# ══════════════════════════════════════════════
# FILE
# ══════════════════════════════════════════════
class File:
    @staticmethod
    def col(): return get_db()["files"]

    @staticmethod
    def create(submission_id, filename, original_name,
               file_type, file_path, ocr_text="",
               stt_text="", size_bytes=0):
        doc = {
            "submission_id": submission_id,
            "filename":      filename,
            "original_name": original_name,
            "file_type":     file_type,   # document|audio_video|image
            "file_path":     file_path,
            "storage_url":   "",          # set if using cloud storage
            "ocr_text":      ocr_text,
            "stt_text":      stt_text,
            "size_bytes":    size_bytes,
            "uploaded_at":   datetime.utcnow()
        }
        r = File.col().insert_one(doc)
        doc["_id"] = str(r.inserted_id)
        Submission.col().update_one(
            {"_id":ObjectId(submission_id)},
            {"$push":{"files":str(r.inserted_id)}}
        )
        return doc

# ══════════════════════════════════════════════
# CHAT SESSION
# ══════════════════════════════════════════════
class ChatSession:
    @staticmethod
    def col(): return get_db()["chat_sessions"]

    @staticmethod
    def append_message(user_id, evaluation_id, user_msg, ai_reply):
        msg = {
            "user":      user_msg,
            "assistant": ai_reply,
            "timestamp": datetime.utcnow().isoformat()
        }
        ChatSession.col().update_one(
            {"user_id":user_id,"evaluation_id":evaluation_id},
            {"$push":{"messages":msg},
             "$set":{"updated_at":datetime.utcnow()},
             "$setOnInsert":{"created_at":datetime.utcnow()}},
            upsert=True
        )

    @staticmethod
    def get_history(user_id, evaluation_id, limit=20):
        doc = ChatSession.col().find_one(
            {"user_id":user_id,"evaluation_id":evaluation_id}
        )
        if not doc: return []
        return doc.get("messages",[])[-limit:]
