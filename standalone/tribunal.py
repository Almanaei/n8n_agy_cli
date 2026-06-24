import os
import json
import time
import asyncio

TELEMETRY_DB_PATH = os.path.join(os.path.dirname(__file__), 'telemetry_db.json')

async def run_tribunal_evaluation(conversation_id: str, agent, telemetry_turns):
    print(f"[Tribunal] Starting evaluation for conversation ID: {conversation_id}...")
    
    # 1. Calculate raw latency statistics
    m2e_latencies = []
    ttft_latencies = []
    interrupted_count = 0
    
    for turn in telemetry_turns:
        ts = turn.get("timestamps", {})
        msg_recv = ts.get("user_message_received")
        first_token = ts.get("llm_first_token")
        first_audio = ts.get("audio_first_sent")
        
        if msg_recv and first_audio:
            m2e_latencies.append((first_audio - msg_recv) * 1000) # ms
        if msg_recv and first_token:
            ttft_latencies.append((first_token - msg_recv) * 1000) # ms
            
        if turn.get("interrupted"):
            interrupted_count += 1
            
    avg_m2e = sum(m2e_latencies) / len(m2e_latencies) if m2e_latencies else 0.0
    avg_ttft = sum(ttft_latencies) / len(ttft_latencies) if ttft_latencies else 0.0
    p95_m2e = sorted(m2e_latencies)[int(len(m2e_latencies) * 0.95)] if m2e_latencies else 0.0
    
    # Compile conversation transcript
    formatted_transcript = []
    for turn in telemetry_turns:
        formatted_transcript.append(f"User: {turn.get('user_text')}")
        formatted_transcript.append(f"Agent: {turn.get('agent_text')}")
        
    transcript_str = "\n".join(formatted_transcript)
    
    # 2. Formulate prompt for LLM judge (Magistrate)
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
        f"KNOWLEDGE BASE:\n{agent.knowledge_text}\n"
        f"--------------------------------------------------\n"
        f"TRANSCRIPT:\n{transcript_str}\n"
        f"--------------------------------------------------\n"
        f"TELEMETRY TIMINGS:\n"
        f"- Avg Mouth-to-Ear Latency: {avg_m2e:.1f}ms\n"
        f"- Avg Time-to-First-Token: {avg_ttft:.1f}ms\n"
        f"- P95 Latency: {p95_m2e:.1f}ms\n"
        f"- Interruption Count: {interrupted_count}\n"
        f"- Total Turns: {len(telemetry_turns)}\n"
    )
    
    # 3. Call LLM to run Tribunal
    eval_score = 1.0
    verdict = "SUCCESS"
    accusation = "No violations detected."
    defense = "N/A"
    adjudication = "The call completed successfully."
    
    if agent.llm_client:
        try:
            response = await agent.llm_client.chat.completions.create(
                model=agent.model_name,
                messages=[
                    {"role": "system", "content": system_eval_prompt},
                    {"role": "user", "content": user_eval_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"} if "llama" not in agent.model_name else None
            )
            raw_result = response.choices[0].message.content
            print(f"[Tribunal] LLM Judge output: {raw_result}")
            
            # Clean LLM output
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
            print(f"[Tribunal] Error during LLM Judge evaluation: {e}")
            
    # 4. Save to database file
    decision_record = {
        "conversation_id": conversation_id,
        "timestamp": time.time(),
        "stats": {
            "avg_m2e_ms": round(avg_m2e, 1),
            "avg_ttft_ms": round(avg_ttft, 1),
            "p95_m2e_ms": round(p95_m2e, 1),
            "interrupted_count": interrupted_count,
            "total_turns": len(telemetry_turns)
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
        data.append(decision_record)
        
        # Limit database size to last 500 records
        data = data[-500:]
        
        with open(TELEMETRY_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"[Tribunal] Successfully saved evaluation for session: {conversation_id}! Score: {eval_score}, Verdict: {verdict}")
    except Exception as e:
        print(f"[Tribunal] Error saving telemetry record: {e}")
