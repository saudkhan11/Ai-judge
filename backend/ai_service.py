"""
ai_service.py — Groq (primary) + Gemini (backup)
Auto-switches on rate limit or failure. Retries 3x.
"""
import os, json, re, time, requests

GROQ_API_KEY   = os.getenv("GROQ_API_KEY","")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY","")
GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL     = "llama-3.3-70b-versatile"
GEMINI_URL     = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
MAX_RETRIES    = 3
RETRY_DELAY    = 2

class RateLimitError(Exception): pass
class APIError(Exception): pass

class AIService:
    def __init__(self):
        self.groq_ok   = bool(GROQ_API_KEY)
        self.gemini_ok = bool(GEMINI_API_KEY)
        self.provider  = "groq" if self.groq_ok else "gemini"
        self.counts    = {"groq":0,"gemini":0,"errors":0}
        providers = ([" Groq(primary)"] if self.groq_ok else []) + ([" Gemini(backup)"] if self.gemini_ok else [])
        print(f"AI Service:{' '.join(providers)}" if providers else "WARNING: No API keys set")

    def _call_groq(self, messages, max_tokens):
        res = requests.post(GROQ_URL,
            headers={"Authorization":f"Bearer {GROQ_API_KEY}","Content-Type":"application/json"},
            json={"model":GROQ_MODEL,"messages":messages,"max_tokens":max_tokens,"temperature":0.3},
            timeout=30)
        if res.status_code == 429: raise RateLimitError("Groq rate limit")
        if res.status_code != 200: raise APIError(f"Groq {res.status_code}: {res.text[:200]}")
        self.counts["groq"] += 1
        return res.json()["choices"][0]["message"]["content"].strip()

    def _call_gemini(self, messages, max_tokens):
        prompt = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])
        res    = requests.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={"contents":[{"parts":[{"text":prompt}]}],
                  "generationConfig":{"temperature":0.3,"maxOutputTokens":max_tokens}},
            timeout=30)
        if res.status_code == 429: raise RateLimitError("Gemini rate limit")
        if res.status_code != 200: raise APIError(f"Gemini {res.status_code}: {res.text[:200]}")
        self.counts["gemini"] += 1
        return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

    def call(self, messages, max_tokens=1000):
        providers = ([("groq",self._call_groq)] if self.groq_ok else []) + \
                    ([("gemini",self._call_gemini)] if self.gemini_ok else [])
        if not providers: raise APIError("No API keys configured")
        last_err = None
        for name, fn in providers:
            for attempt in range(MAX_RETRIES):
                try:
                    result = fn(messages, max_tokens)
                    self.provider = name
                    return result, name
                except RateLimitError as e:
                    last_err = e; break
                except APIError as e:
                    last_err = e
                    if attempt < MAX_RETRIES-1: time.sleep(RETRY_DELAY*(attempt+1))
        self.counts["errors"] += 1
        raise APIError(f"All providers failed: {last_err}")

    def _parse(self, raw):
        clean = re.sub(r'```json|```','',raw).strip()
        m     = re.search(r'\{[\s\S]*\}', clean)
        if m: return json.loads(m.group())
        raise ValueError(f"No JSON found: {raw[:200]}")

    def evaluate_project(self, title, team, text, tech_stack,
                          domain, github, nlp, source_instruction):
        """source_instruction tells LLM which input (PPT vs manual) dominates"""
        criteria_str = "\n".join([f"- {c} (Weight: {w*100:.0f}%)"
                                   for c,w in {
                                       "Innovation & Originality":0.25,
                                       "Technical Complexity":0.20,
                                       "Feasibility & Scalability":0.20,
                                       "Impact & Social Good":0.15,
                                       "Functional MVP":0.10,
                                       "Clarity & Documentation":0.10}.items()])
        nlp_str = (f"NLP Pre-analysis: words={nlp.get('word_count',0)}, "
                   f"depth={nlp.get('depth_score',0)}/10, "
                   f"vagueness={nlp.get('vagueness_score',0)}/10, "
                   f"boosters={len(nlp.get('found_boosters',[]))}, "
                   f"penalties={len(nlp.get('found_penalties',[]))}, "
                   f"incomplete={'YES' if nlp.get('incomplete') else 'No'}")

        system = ("You are an expert hackathon judge panel. "
                  "Give realistic varied scores. Respond ONLY with valid JSON.")
        user   = f"""{source_instruction}

Team: {team} | Project: {title} | Domain: {domain}
Tech: {tech_stack or 'not specified'} | GitHub: {github or 'not provided'}

Content:
{text[:3000]}

{nlp_str}

Score criteria:
{criteria_str}

Rules:
- Vary scores realistically (not all same)
- High depth/boosters = higher technical/innovation scores
- High vagueness = lower clarity/innovation scores
- Incomplete markers = lower MVP score
- {domain} domain: add 0.5 bonus to Impact if social/health/sustainability

Return ONLY this JSON:
{{"Innovation & Originality":7.5,"Technical Complexity":6.0,"Feasibility & Scalability":7.0,"Impact & Social Good":8.0,"Functional MVP":6.5,"Clarity & Documentation":7.0,"strengths":["s1","s2","s3"],"weaknesses":["w1","w2","w3"],"technical_recommendations":["r1","r2","r3"],"scaling_suggestions":["ss1","ss2","ss3"]}}"""

        raw, provider = self.call(
            [{"role":"system","content":system},{"role":"user","content":user}],
            max_tokens=1200)
        data   = self._parse(raw)
        CRIT   = ["Innovation & Originality","Technical Complexity","Feasibility & Scalability",
                  "Impact & Social Good","Functional MVP","Clarity & Documentation"]
        scores = {c: round(float(max(1, min(10, data.get(c, 5)))), 2) for c in CRIT}
        return scores, provider, data

    def compare_human_ai(self, ai_scores, human_scores, weights):
        system = "You are an expert in human-AI calibration. Return only JSON."
        user   = (f"AI scores: {json.dumps(ai_scores)}\n"
                  f"Human scores: {json.dumps(human_scores)}\n"
                  f"Weights: {json.dumps(weights)}\n\n"
                  f'Return: {{"lagging":["..."],"leading":["..."],"aligned":["..."],'
                  f'"overall_insight":"...","bias_warning":""}}')
        raw, provider = self.call(
            [{"role":"system","content":system},{"role":"user","content":user}],
            max_tokens=500)
        result = self._parse(raw)
        result["provider"] = provider
        return result, provider

    def chat(self, messages_history, context=""):
        system = (f"You are the AI Judge evaluation assistant. "
                  f"Platform uses BERT+RF+AIF360+Groq+Gemini. "
                  f"Weights: Innovation 25%, Technical 20%, Feasibility 20%, Impact 15%, MVP 10%, Clarity 10%. "
                  f"Adaptive Input Fusion: auto-selects best between PPT upload and manual description. "
                  f"{context} Be concise and technical. Under 150 words.")
        raw, provider = self.call(
            [{"role":"system","content":system}] + messages_history,
            max_tokens=350)
        return raw, provider

    def get_status(self):
        return {"groq_available":self.groq_ok,"gemini_available":self.gemini_ok,
                "current_provider":self.provider,"call_counts":self.counts}
