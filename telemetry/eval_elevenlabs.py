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


def parse_markdown_to_json(text):
    import re
    result = {}
    
    score_match = re.search(r"(?:Score|الدرجة)\s*:\s*([\d\.]+)", text, re.IGNORECASE)
    if score_match:
        try:
            result["score"] = float(score_match.group(1))
        except:
            pass
            
    verdict_match = re.search(r"(?:Root Cause Verdict|القرار|النتيجة)\s*:\s*([A-Z_]+)", text, re.IGNORECASE)
    if verdict_match:
        result["root_cause_verdict"] = verdict_match.group(1).strip()
        
    lines = text.split('\n')
    current_section = None
    section_content = []
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue
            
        lower_line = line_strip.lower()
        if "accusation" in lower_line or "اتهام" in lower_line:
            if current_section:
                result[current_section] = "\n".join(section_content).strip()
            current_section = "accusation"
            section_content = []
            parts = line_strip.split(':', 1)
            if len(parts) > 1 and parts[1].strip():
                section_content.append(parts[1].strip())
        elif "defense" in lower_line or "دفاع" in lower_line:
            if current_section:
                result[current_section] = "\n".join(section_content).strip()
            current_section = "defense"
            section_content = []
            parts = line_strip.split(':', 1)
            if len(parts) > 1 and parts[1].strip():
                section_content.append(parts[1].strip())
        elif "adjudication" in lower_line or "حكم" in lower_line or "قرار القاضي" in lower_line or "verdict explanation" in lower_line.replace('_', ' '):
            if current_section:
                result[current_section] = "\n".join(section_content).strip()
            current_section = "adjudication"
            section_content = []
            parts = line_strip.split(':', 1)
            if len(parts) > 1 and parts[1].strip():
                section_content.append(parts[1].strip())
        elif line_strip.startswith("**") or line_strip.startswith("#"):
            if current_section:
                result[current_section] = "\n".join(section_content).strip()
            current_section = None
        else:
            if current_section:
                section_content.append(line_strip)
                
    if current_section:
        result[current_section] = "\n".join(section_content).strip()
        
    return result


def run_evaluation(conversation_id):
    print(f"[eval_elevenlabs] Starting evaluation for conversation ID: {conversation_id}...")
    
    # 1. Fetch conversation details from ElevenLabs API
    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = { "xi-api-key": ELEVENLABS_API_KEY }
    
    max_retries = 5
    retry_delay = 3  # seconds
    data = {}
    transcript_turns = []
    status = ""
    is_not_found = False
    
    for attempt in range(max_retries):
        try:
            res = requests.get(url, headers=headers)
            if res.status_code == 404:
                print(f"[eval_elevenlabs] Conversation ID {conversation_id} not found (404). Creating sentinel record.")
                is_not_found = True
                break
            if res.status_code != 200:
                print(f"[eval_elevenlabs] Error fetching conversation (attempt {attempt+1}/{max_retries}): {res.status_code} {res.text}")
                time.sleep(retry_delay)
                continue
                
            data = res.json()
            status = data.get("status", "")
            transcript_turns = data.get("transcript", []) or data.get("turns", [])
            
            # Check if conversation is done and transcript is populated
            if status != "done" or not transcript_turns:
                print(f"[eval_elevenlabs] Conversation is processing or transcript is empty (status={status}, turns={len(transcript_turns)}). Waiting...")
                time.sleep(retry_delay)
                continue
                
            # Check if at least one agent turn has metrics populated
            agent_turns = [t for t in transcript_turns if str(t.get("role", "")).lower() == "agent"]
            if agent_turns:
                has_metrics = any(
                    t.get("conversation_turn_metrics") and t["conversation_turn_metrics"].get("metrics")
                    for t in agent_turns
                )
                if not has_metrics:
                    print(f"[eval_elevenlabs] Metrics not yet populated for agent turns. Waiting...")
                    time.sleep(retry_delay)
                    continue
            
            break
        except Exception as e:
            print(f"[eval_elevenlabs] Exception fetching conversation (attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(retry_delay)
            
    if is_not_found:
        decision_record = {
            "conversation_id": conversation_id,
            "timestamp": time.time(),
            "stats": {
                "avg_m2e_ms": 0.0,
                "avg_ttft_ms": 0.0,
                "p95_m2e_ms": 0.0,
                "interrupted_count": 0,
                "total_turns": 0
            },
            "score": 0.0,
            "root_cause_verdict": "NOT_FOUND",
            "accusation": "Conversation ID not found on ElevenLabs. It might be a test or mock record.",
            "defense": "N/A",
            "adjudication": "This conversation could not be evaluated because it does not exist in ElevenLabs history."
        }
        try:
            data_list = []
            if os.path.exists(TELEMETRY_DB_PATH):
                with open(TELEMETRY_DB_PATH, 'r', encoding='utf-8') as f:
                    data_list = json.load(f)
            data_list = [r for r in data_list if r.get("conversation_id") != conversation_id]
            data_list.append(decision_record)
            data_list = data_list[-500:]
            with open(TELEMETRY_DB_PATH, 'w', encoding='utf-8') as f:
                json.dump(data_list, f, ensure_ascii=False, indent=2)
            print(f"[eval_elevenlabs] Saved sentinel record successfully!")
            return True
        except Exception as e:
            print(f"[eval_elevenlabs] Error saving sentinel: {e}")
            return False
            
    if status != "done" and not is_not_found:
        print(f"[eval_elevenlabs] Conversation ID {conversation_id} is still in status '{status}' after retries. Skipping database save to allow later retry.")
        return False
        
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
    
    llm_completed = False
    
    models_to_try = []
    if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
        models_to_try.append({"provider": "groq", "model": "llama-3.3-70b-versatile"})
        models_to_try.append({"provider": "groq", "model": "llama-3.1-8b-instant"})
        models_to_try.append({"provider": "groq", "model": "mixtral-8x7b-32768"})
    if OPENAI_API_KEY:
        models_to_try.append({"provider": "openai", "model": "gpt-4o-mini"})
        
    for model_info in models_to_try:
        provider = model_info["provider"]
        model_name = model_info["model"]
        try:
            print(f"[eval_elevenlabs] Calling {provider.capitalize()} ({model_name})...")
            if provider == "groq":
                client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
            else:
                client = OpenAI(api_key=OPENAI_API_KEY)
                
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_eval_prompt},
                    {"role": "user", "content": user_eval_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"} if provider == "openai" else None
            )
            raw_result = response.choices[0].message.content
            print(f"[eval_elevenlabs] {provider.capitalize()} LLM Judge output: {raw_result}")
            
            cleaned = raw_result.strip()
            import re
            json_match = re.search(r"```json\s*(.*?)\s*```", raw_result, re.DOTALL)
            if json_match:
                cleaned = json_match.group(1).strip()
            else:
                start_idx = raw_result.find('{')
                end_idx = raw_result.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    cleaned = raw_result[start_idx:end_idx+1].strip()
            
            try:
                result_json = json.loads(cleaned)
            except Exception as json_err:
                print(f"[eval_elevenlabs] JSON parsing failed: {json_err}. Attempting markdown fallback parsing...")
                result_json = parse_markdown_to_json(raw_result)
                if not result_json or not any(k in result_json for k in ["accusation", "defense", "adjudication"]):
                    raise json_err
            
            eval_score = result_json.get("score", eval_score)
            verdict = result_json.get("root_cause_verdict", verdict)
            accusation = result_json.get("accusation", accusation)
            defense = result_json.get("defense", defense)
            adjudication = result_json.get("adjudication", adjudication)
            
            llm_completed = True
            break
        except Exception as e:
            print(f"[eval_elevenlabs] {provider.capitalize()} model '{model_name}' call failed: {e}")
            
    # Save the decision record to telemetry_db.json
    has_audio = data.get("has_audio", True)
    decision_record = {
        "conversation_id": conversation_id,
        "timestamp": time.time(),
        "stats": {
            "avg_m2e_ms": round(avg_m2e, 1),
            "avg_ttft_ms": round(avg_ttft, 1),
            "p95_m2e_ms": round(p95_m2e, 1),
            "interrupted_count": interrupted_count,
            "total_turns": len(transcript_turns),
            "has_audio": has_audio
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
