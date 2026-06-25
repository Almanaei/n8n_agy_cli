import os
import sys
import json
import time
import requests
from dotenv import load_dotenv
from openai import OpenAI

# Force standard output and error to UTF-8 to prevent charmap print crashes on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Load dotenv from workspace root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ELEVENLABS_API_KEY = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

TELEMETRY_DB_PATH = os.path.join(os.path.dirname(__file__), 'telemetry_db.json')

def run_evaluation(conversation_id):
    print(f"[eval_elevenlabs] Starting evaluation for conversation ID: {conversation_id}...")
    
    # 1. Fetch conversation details from ElevenLabs API
    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = { "xi-api-key": ELEVENLABS_API_KEY }
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"[eval_elevenlabs] Error fetching conversation: {res.status_code} {res.text}")
            return False
        data = res.json()
    except Exception as e:
        print(f"[eval_elevenlabs] Exception fetching conversation: {e}")
        return False
        
    transcript_turns = data.get("transcript", [])
    if not transcript_turns:
        # Fallback if transcript turns array is in a different key
        transcript_turns = data.get("turns", [])
        
    m2e_latencies = []
    ttft_latencies = []
    interrupted_count = 0
    formatted_transcript = []
    
    # Loop over turns to parse metrics and transcript
    for turn in transcript_turns:
        role = turn.get("role", "")
        message = turn.get("message") or turn.get("original_message") or ""
        
        # Normalize role
        role_str = str(role).lower()
        
        if role_str == "agent":
            formatted_transcript.append(f"Agent: {message}")
            if turn.get("interrupted"):
                interrupted_count += 1
                
            metrics_obj = turn.get("conversation_turn_metrics")
            if metrics_obj and metrics_obj.get("metrics"):
                metrics = metrics_obj["metrics"]
                llm_ttfb_obj = metrics.get("convai_llm_service_ttfb")
                tts_ttfb_obj = metrics.get("convai_tts_service_ttfb")
                
                llm_ttfb = llm_ttfb_obj.get("elapsed_time") if llm_ttfb_obj else None
                tts_ttfb = tts_ttfb_obj.get("elapsed_time") if tts_ttfb_obj else None
                
                if llm_ttfb is not None:
                    ttft_latencies.append(llm_ttfb * 1000)
                    if tts_ttfb is not None:
                        m2e_latencies.append((llm_ttfb + tts_ttfb) * 1000)
        elif role_str == "user":
            formatted_transcript.append(f"User: {message}")
            
    avg_m2e = sum(m2e_latencies) / len(m2e_latencies) if m2e_latencies else 0.0
    avg_ttft = sum(ttft_latencies) / len(ttft_latencies) if ttft_latencies else 0.0
    p95_m2e = sorted(m2e_latencies)[int(len(m2e_latencies) * 0.95)] if m2e_latencies else 0.0
    
    transcript_str = "\n".join(formatted_transcript)
    
    # Load knowledge base documents to ground the evaluation
    knowledge_text = ""
    knowledge_dir = os.path.join(os.path.dirname(__file__), 'knowledge')
        
    personal_path = os.path.join(knowledge_dir, 'personal.txt')
    services_path = os.path.join(knowledge_dir, 'services.txt')
    
    if os.path.exists(personal_path):
        try:
            with open(personal_path, 'r', encoding='utf-8') as f:
                knowledge_text += f.read().strip() + "\n\n"
        except Exception as e:
            print(f"Error reading personal.txt: {e}")
            
    if os.path.exists(services_path):
        try:
            with open(services_path, 'r', encoding='utf-8') as f:
                knowledge_text += "SERVICES DOCUMENTATION:\n" + f.read().strip()
        except Exception as e:
            print(f"Error reading services.txt: {e}")
            
    # Formulate prompt for LLM judge (Magistrate)
    system_eval_prompt = (
        "You are the Magistrate, the supreme LLM judge in a Conversational Voice AI Tribunal. "
        "Your task is to adjudicate a conversation session and output a structured JSON analysis.\n\n"
        "EVALUATION PILLARS & CONSTRAINTS:\n"
        "1. Factual grounding: Check if the agent's statements match the knowledge base. If not, score 0.0.\n"
        "2. Voice constraints: Responses must be brief (1-2 sentences maximum). Long paragraphs are violations.\n"
        "3. Turn Dynamics: Unexcused latency spikes > 3000ms should be penalized.\n"
        "4. Prompt Persona: Agent must remain in the Bahrain Civil Defense persona.\n\n"
        "VERDICT CODES:\n"
        "- SUCCESS: The call completed successfully with high quality.\n"
        "- FACTUAL_DIVERGENCE: Agent hallucinated or gave incorrect facts.\n"
        "- INTEGRATION_LATENCY_DRAG: Slow responses caused by external systems.\n"
        "- LLM_COMPUTE_WASTAGE: Slow responses caused by model thinking time.\n"
        "- ACOUSTIC_VAD_CONFLICT: System early-cutoffs or interrupts.\n"
        "- USER_ABANDONMENT: Call terminated early by user without goal completion.\n\n"
        "You must return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        "  \"score\": 0.0 to 1.0,\n"
        "  \"root_cause_verdict\": \"SUCCESS\" | \"FACTUAL_DIVERGENCE\" | \"INTEGRATION_LATENCY_DRAG\" | \"LLM_COMPUTE_WASTAGE\" | \"ACOUSTIC_VAD_CONFLICT\" | \"USER_ABANDONMENT\",\n"
        "  \"accusation\": \"Interrogator's accusation outlining violations (in Arabic or English)\",\n"
        "  \"defense\": \"Advocate's defense based on logs and metrics (in Arabic or English)\",\n"
        "  \"adjudication\": \"Magistrate's detailed verdict explanation (in Arabic or English)\"\n"
        "}"
    )
    
    user_eval_prompt = (
        f"CONVERSATION SESSION: {conversation_id}\n"
        f"--------------------------------------------------\n"
        f"KNOWLEDGE BASE:\n{knowledge_text}\n"
        f"--------------------------------------------------\n"
        f"TRANSCRIPT:\n{transcript_str}\n"
        f"--------------------------------------------------\n"
        f"TELEMETRY TIMINGS:\n"
        f"- Avg Mouth-to-Ear Latency: {avg_m2e:.1f}ms\n"
        f"- Avg Time-to-First-Token: {avg_ttft:.1f}ms\n"
        f"- P95 Latency: {p95_m2e:.1f}ms\n"
        f"- Interruption Count: {interrupted_count}\n"
        f"- Total Turns: {len(transcript_turns)}\n"
    )
    
    # Call Groq/OpenAI to run evaluation
    eval_score = 1.0
    verdict = "SUCCESS"
    accusation = "No violations detected."
    defense = "N/A"
    adjudication = "The call completed successfully."
    
    llm_client = None
    model_name = ""
    
    if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
        llm_client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
        model_name = "llama-3.3-70b-versatile"
    elif OPENAI_API_KEY:
        llm_client = OpenAI(api_key=OPENAI_API_KEY)
        model_name = "gpt-4o-mini"
        
    if llm_client:
        try:
            response = llm_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_eval_prompt},
                    {"role": "user", "content": user_eval_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"} if "llama" not in model_name else None
            )
            raw_result = response.choices[0].message.content
            print(f"[eval_elevenlabs] LLM Judge output: {raw_result}")
            
            cleaned = raw_result.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            result_json = json.loads(cleaned)
            eval_score = result_json.get("score", eval_score)
            verdict = result_json.get("root_cause_verdict", verdict)
            accusation = result_json.get("accusation", accusation)
            defense = result_json.get("defense", defense)
            adjudication = result_json.get("adjudication", adjudication)
        except Exception as e:
            print(f"[eval_elevenlabs] Error calling LLM: {e}")
            
    # Save the decision record to telemetry_db.json
    decision_record = {
        "conversation_id": conversation_id,
        "timestamp": time.time(),
        "stats": {
            "avg_m2e_ms": round(avg_m2e, 1),
            "avg_ttft_ms": round(avg_ttft, 1),
            "p95_m2e_ms": round(p95_m2e, 1),
            "interrupted_count": interrupted_count,
            "total_turns": len(transcript_turns)
        },
        "score": eval_score,
        "root_cause_verdict": verdict,
        "accusation": accusation,
        "defense": defense,
        "adjudication": adjudication
    }
    
    try:
        data = []
        if os.path.exists(TELEMETRY_DB_PATH):
            with open(TELEMETRY_DB_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
        # Remove any existing record for this conversation ID to avoid duplicates
        data = [r for r in data if r.get("conversation_id") != conversation_id]
        data.append(decision_record)
        data = data[-500:] # limit to last 500
        
        with open(TELEMETRY_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[eval_elevenlabs] Saved evaluation record successfully!")
        return True
    except Exception as e:
        print(f"[eval_elevenlabs] Error saving evaluation: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python eval_elevenlabs.py <conversation_id>")
        sys.exit(1)
    con_id = sys.argv[1]
    success = run_evaluation(con_id)
    sys.exit(0 if success else 1)
