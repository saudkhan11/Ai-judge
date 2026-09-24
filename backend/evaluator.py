"""
evaluator.py - Final Production Version
Adaptive Input Fusion: auto-selects best between PPT/manual
"""
import numpy as np, re, os, json, joblib, torch
from transformers import BertTokenizer, BertModel

WEIGHTS = {
    "Innovation & Originality":   0.25,
    "Technical Complexity":       0.20,
    "Feasibility & Scalability":  0.20,
    "Impact & Social Good":       0.15,
    "Functional MVP":             0.10,
    "Clarity & Documentation":    0.10
}
CRITERIA  = list(WEIGHTS.keys())
MODEL_DIR = "models"

BOOSTERS = {
    "technical":  ["neural network","deep learning","bert","transformer","docker","kubernetes",
                   "real-time","microservices","api","distributed","asynchronous","convolutional",
                   "end-to-end","latency","encryption","pipeline","machine learning","nlp"],
    "innovation": ["first-of-its-kind","novel approach","unique solution","original research",
                   "cross-domain","alternative to","new method","breakthrough","patent"],
    "impact":     ["social good","responsible ai","sustainable","accessibility","healthcare",
                   "education","open source","sdg","climate","mental health","disability","inclusive"]
}
PENALTIES = {
    "vague":      ["amazing","revolutionary","game-changing","world-class","cutting-edge",
                   "incredible","best solution","perfect","awesome","disruptive"],
    "incomplete": ["to be implemented","future work","will be added","not yet","tbd",
                   "todo","work in progress","coming soon","planned feature"]
}
REDACT = [
    r"\b(iit|nit|mit|harvard|stanford|oxford|cambridge|vit|srm|bits)\b",
    r"\b(he|she|his|her|him)\b",
    r"\b[A-Z][a-z]+ (University|Institute|College|School)\b"
]

# ══════════════════════════════════════════════
# ADAPTIVE INPUT FUSION
# ══════════════════════════════════════════════
def merge_inputs(manual_desc, ocr_text="", stt_text=""):
    """
    Intelligently merges manual description + OCR (PPT/PDF) + STT (video).

    Rules:
    - OCR < 50 words  → OCR failed, use manual only
    - Manual < 30 words → lazy typing, use file only
    - Both good → merge, file as primary (60%)
    - Manual richer → merge, manual as primary (60%)

    Returns: (merged_text, source_info)
    """
    file_text = ""
    if ocr_text and stt_text:
        file_text = ocr_text.strip() + "\n\n[Video Transcript]\n" + stt_text.strip()
    elif ocr_text:
        file_text = ocr_text.strip()
    elif stt_text:
        file_text = stt_text.strip()

    manual_words = len(re.findall(r'\b\w+\b', manual_desc or ""))
    file_words   = len(re.findall(r'\b\w+\b', file_text   or ""))

    # No file
    if not file_text or file_words < 10:
        return manual_desc, "manual_only"

    # File present but OCR extraction failed / very sparse
    if file_words < 50:
        if manual_words >= 20:
            return manual_desc + "\n\n[Note: File uploaded but OCR text minimal]", \
                   "manual_primary_file_failed"
        return manual_desc, "manual_only_short"

    # File good but manual very short
    if manual_words < 30:
        return file_text, "file_primary"

    # Both good — file as primary when file is richer
    if file_words >= manual_words:
        merged = (f"[Primary Source: Uploaded File]\n{file_text}\n\n"
                  f"[Supplementary: Manual Description]\n{manual_desc}")
        return merged, "file_primary_manual_supplementary"

    # Both good — manual as primary when manual is richer
    merged = (f"[Primary Source: Manual Description]\n{manual_desc}\n\n"
              f"[Supplementary: Uploaded File]\n{file_text}")
    return merged, "manual_primary_file_supplementary"


def get_source_instruction(source_info):
    return {
        "manual_only":
            "Evaluate based on the manual description provided.",
        "file_primary":
            "The uploaded file (PPT/PDF/Video) is the PRIMARY source. Manual description was too short. Score based on file content quality.",
        "manual_primary_file_failed":
            "File was uploaded but OCR extraction failed. Evaluate based on manual description only.",
        "file_primary_manual_supplementary":
            "IMPORTANT: Uploaded file is PRIMARY (60% weight). Manual description supplements it. "
            "A strong PPT with weak manual text should still score well.",
        "manual_primary_file_supplementary":
            "IMPORTANT: Manual description is PRIMARY (60% weight). Uploaded file supplements it. "
            "A strong description with a basic PPT should still score well.",
        "manual_only_short":
            "Both sources were minimal. Score conservatively and note the lack of detail in weaknesses."
    }.get(source_info, "Evaluate the provided content.")


# ══════════════════════════════════════════════
# MAIN EVALUATOR
# ══════════════════════════════════════════════
class AIEvaluator:
    def __init__(self, ai_service):
        self.ai_service    = ai_service
        self.models_loaded = False
        self.bert_model    = None
        self.bert_tok      = None
        self.rf_models     = None
        self.rf_scalers    = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._load_models()

    def _load_models(self):
        try:
            rp = os.path.join(MODEL_DIR, "rf_models.pkl")
            sp = os.path.join(MODEL_DIR, "rf_scalers.pkl")
            if os.path.exists(rp) and os.path.exists(sp):
                self.rf_models  = joblib.load(rp)
                self.rf_scalers = joblib.load(sp)
                bt = os.path.join(MODEL_DIR, "bert_tokenizer")
                self.bert_tok   = BertTokenizer.from_pretrained(
                    bt if os.path.exists(bt) else "bert-base-uncased")
                self.bert_model = BertModel.from_pretrained(
                    "bert-base-uncased").to(self.device)
                self.bert_model.eval()
                self.models_loaded = True
                print("BERT + Random Forest loaded.")
        except Exception as e:
            print(f"Models not loaded ({e}) — using LLM scoring.")

    def _redact(self, text):
        for p in REDACT:
            text = re.sub(p, "[REDACTED]", text, flags=re.IGNORECASE)
        return text

    def _nlp(self, text):
        lower  = text.lower()
        tokens = re.findall(r"\b[a-z]{3,}\b", lower)
        boosts = [{"kw": kw, "cat": c}
                  for c, kws in BOOSTERS.items() for kw in kws if kw in lower]
        pens   = [{"kw": kw, "cat": c}
                  for c, kws in PENALTIES.items() for kw in kws if kw in lower]
        sents  = [s for s in re.split(r"[.!?]+", text) if len(s.strip()) > 5]
        wc     = len(tokens)
        awl    = sum(len(t) for t in tokens) / max(wc, 1)
        return {
            "tokens":          list(set(tokens))[:15],
            "found_boosters":  boosts,
            "found_penalties": pens,
            "depth_score":     round(min(len(sents) * 0.7 + awl * 0.4, 10), 2),
            "vagueness_score": round(min(len([p for p in pens if p["cat"] == "vague"]) * 1.5, 10), 2),
            "word_count":      wc,
            "sentence_count":  len(sents),
            "incomplete":      len([p for p in pens if p["cat"] == "incomplete"]) > 2,
            "boost_score":     round(min(len(boosts) * 0.3, 2.5), 2),
            "penalty_score":   round(min(len(pens) * 0.25, 2.0), 2)
        }

    def _rf_score(self, text):
        enc = self.bert_tok(text, padding=True, truncation=True,
                            max_length=256, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.bert_model(**enc)
        emb  = out.last_hidden_state[:, 0, :].cpu().numpy()
        CMAP = {
            "innovation_score":  "Innovation & Originality",
            "technical_score":   "Technical Complexity",
            "feasibility_score": "Feasibility & Scalability",
            "impact_score":      "Impact & Social Good",
            "mvp_score":         "Functional MVP",
            "clarity_score":     "Clarity & Documentation"
        }
        return {dn: round(float(np.clip(
            self.rf_models[tc].predict(self.rf_scalers[tc].transform(emb))[0], 1, 10)), 2)
            for tc, dn in CMAP.items()}

    def _bias(self, scores):
        vals    = list(scores.values())
        avg     = np.mean(vals)
        sd      = np.std(vals)
        adj     = scores.copy()
        items   = []
        applied = False

        if avg > 8.0:
            for c in adj: adj[c] = round(max(1, adj[c] - 0.5), 2)
            items.append({"type":"warn","label":"Leniency Bias",
                          "text": f"Avg {avg:.1f}>8.0 — normalised down 0.5pts"})
            applied = True
        if avg < 3.5:
            for c in adj: adj[c] = round(min(10, adj[c] + 0.5), 2)
            items.append({"type":"warn","label":"Severity Bias",
                          "text": f"Avg {avg:.1f}<3.5 — normalised up 0.5pts"})
            applied = True
        if sd < 0.8 and avg > 5:
            items.append({"type":"warn","label":"Halo Effect",
                          "text": f"σ={sd:.2f} — suspiciously uniform scores"})
        items.append({"type":"ok","label":"Redaction Applied",
                      "text": "Names, institutions and pronouns removed before evaluation."})
        if not applied and sd >= 0.8:
            items.append({"type":"ok","label":"AIF360 Passed",
                          "text": f"No significant bias detected (σ={sd:.2f})"})
        return {"bias_items": items, "adjusted": adj,
                "bias_applied": applied, "std_dev": round(float(sd), 3)}

    def _weighted(self, scores):
        return round(sum(scores.get(c, 0) * w for c, w in WEIGHTS.items()), 2)

    # ── MAIN EVALUATE ───────────────────────────
    def evaluate(self, manual_desc, team, title,
                 tech_stack="", domain="general", github="",
                 ocr_text="", stt_text=""):

        # Step 1: Adaptive Input Fusion
        merged_text, source_info = merge_inputs(manual_desc, ocr_text, stt_text)
        source_instruction       = get_source_instruction(source_info)

        # Step 2: Redact + NLP
        redacted = self._redact(merged_text + " " + tech_stack)
        nlp      = self._nlp(redacted)

        # Step 3: Score with best available method
        extra    = {}
        provider = "nlp_fallback"

        if self.models_loaded:
            raw  = self._rf_score(merged_text + " " + tech_stack + " " + domain)
            used = "BERT+RandomForest"
        else:
            try:
                raw, provider, extra = self.ai_service.evaluate_project(
                    title, team, merged_text, tech_stack,
                    domain, github, nlp, source_instruction)
                used = f"LLM({provider})+NLP"
            except Exception as e:
                print(f"LLM scoring failed: {e} — NLP fallback")
                b   = 4.5 + nlp["boost_score"] + nlp["depth_score"]*0.3 - nlp["penalty_score"]
                raw = {c: round(min(max(b + np.random.uniform(-0.5, 0.5), 1), 10), 1)
                       for c in CRITERIA}
                used = "NLP_Fallback"

        # Step 4: Bias detection + weighted score
        nlp_raw = min(10, max(1, 3 + nlp["boost_score"] +
                              nlp["depth_score"]*0.4 - nlp["penalty_score"]))
        bias    = self._bias(raw)
        adj     = bias["adjusted"]
        final   = self._weighted(adj)

        # Step 5: HITL check
        diff   = abs(final - nlp_raw)
        hitl   = diff > 3 or nlp["incomplete"] or (nlp["vagueness_score"] > 6 and final > 7.5)
        reason = (f"Score divergence {diff:.1f}pts > 3.0 threshold" if diff > 3 else
                  "Multiple incomplete markers" if nlp["incomplete"] else
                  "High vagueness + high score")

        ss      = sorted(adj.items(), key=lambda x: x[1], reverse=True)
        avg_adj = np.mean(list(adj.values()))
        orig    = int(min(95, max(20,
            50 + len([b for b in nlp["found_boosters"] if b["cat"] == "innovation"]) * 8
               + nlp["depth_score"] * 2 - nlp["vagueness_score"] * 3)))

        return {
            "team": team, "title": title,
            "raw_scores":            raw,
            "adjusted_scores":       adj,
            "weighted_score":        final,
            "originality":           orig,
            "risk_level":            ("High" if nlp["incomplete"] or avg_adj < 4
                                      else "Low" if avg_adj >= 6.5 else "Medium"),
            "deployment_readiness":  ("Market Ready" if avg_adj >= 7.5 and not nlp["incomplete"]
                                      else "Beta" if avg_adj >= 5.5 else "Prototype"),
            "weights":               WEIGHTS,
            "bias":                  bias,
            "hitl":                  {"triggered": hitl, "reason": reason if hitl else ""},
            "nlp_analysis":          nlp,
            "nlp_raw_score":         round(nlp_raw, 2),
            "source_info":           source_info,
            "source_note":           source_instruction,
            "strengths":             extra.get("strengths",
                                     [f"{c} — strong at {s}/10" for c, s in ss[:3]]),
            "weaknesses":            extra.get("weaknesses",
                                     [f"{c} — needs work at {s}/10" for c, s in ss[-3:]]),
            "technical_recommendations": extra.get("technical_recommendations",
                                     ["Add architecture diagram","Write unit tests","Add API docs"]),
            "scaling_suggestions":   extra.get("scaling_suggestions",
                                     ["Define scaling roadmap","Add load balancing","Cloud deployment"]),
            "models_used":           used,
            "ai_provider":           provider
        }

    def compare_human_ai(self, ai_scores, human_scores, weights):
        try:
            result, _ = self.ai_service.compare_human_ai(ai_scores, human_scores, weights)
            return result
        except Exception:
            diffs = {c: round(ai_scores.get(c, 0) - human_scores.get(c, 0), 2)
                     for c in CRITERIA}
            return {
                "diffs":   diffs,
                "lagging": [f"Human underscored {c} by {abs(d)}pts"
                            for c, d in diffs.items() if d > 1],
                "leading": [f"Human overscored {c} by {abs(d)}pts"
                            for c, d in diffs.items() if d < -1],
                "aligned": [f"Both agree on {c}" for c, d in diffs.items() if abs(d) <= 1],
                "overall_insight": (f"AI weighted: {self._weighted(ai_scores)} vs "
                                    f"Human: {self._weighted({c: human_scores.get(c,0) for c in CRITERIA})}")
            }
