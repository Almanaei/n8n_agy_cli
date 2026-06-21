import os
import sys
import uuid
import json
import asyncio
import re

# Force standard streams to use UTF-8 to prevent UnicodeEncodeError on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from gtts import gTTS
import io

from standalone.agent_logic import StandaloneAgent
from standalone.diacritics import diacritize_arabic

app = FastAPI(title="Standalone Voice AI Agent API")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def text_to_speech_mp3(text: str) -> bytes:
    """Synthesizes text into Arabic speech MP3 bytes using edge-tts (ar-SA-HamedNeural - GCC Male)."""
    import edge_tts
    # Apply local diacritization for pronunciation mapping
    pronounceable_text = diacritize_arabic(text)
    
    communicate = edge_tts.Communicate(pronounceable_text, "ar-SA-HamedNeural")
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data

@app.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    conversation_id = f"standalone_{uuid.uuid4().hex[:12]}"
    print(f"New connection established. Assigning session ID: {conversation_id}")
    
    # Initialize the agent logic handler
    agent = StandaloneAgent(conversation_id=conversation_id)
    
    try:
        # 1. Send the first greeting message
        greeting_text = "مرحبا بك في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف"
        agent.add_to_transcript("agent", greeting_text)
        
        # Synthesize audio for the greeting
        greeting_audio = await text_to_speech_mp3(greeting_text)
        
        await websocket.send_json({
            "event": "agent_response",
            "text": greeting_text,
            "conversation_id": conversation_id,
            "audio": greeting_audio.hex(),  # Hex-encoded string for websocket transmission
            "is_final_segment": True
        })
        
        # 2. Listening loop
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("event") == "user_message":
                user_text = payload.get("text", "")
                print(f"[{conversation_id}] User said: {user_text}")
                
                # Stream sentences sentence-by-sentence
                sentence_buffer = ""
                for text_chunk in agent.get_llm_response_stream(user_text):
                    sentence_buffer += text_chunk
                    
                    # Split on sentence end markers: . ? ! \n or Arabic ، ？
                    pattern = r'([.?!؟\n]|\s+،\s+)'
                    matches = list(re.finditer(pattern, sentence_buffer))
                    
                    if matches:
                        # Find the last match index
                        last_match = matches[-1]
                        end_idx = last_match.end()
                        
                        completed_sentences = sentence_buffer[:end_idx].strip()
                        sentence_buffer = sentence_buffer[end_idx:]
                        
                        if completed_sentences:
                            print(f"[{conversation_id}] Synthesizing stream chunk: {completed_sentences}")
                            audio_chunk = await text_to_speech_mp3(completed_sentences)
                            
                            await websocket.send_json({
                                "event": "agent_response",
                                "text": completed_sentences,
                                "audio": audio_chunk.hex(),
                                "is_stream_segment": True
                            })
                
                # Synthesize any remaining text
                remaining = sentence_buffer.strip()
                if remaining:
                    print(f"[{conversation_id}] Synthesizing remaining stream chunk: {remaining}")
                    audio_chunk = await text_to_speech_mp3(remaining)
                    await websocket.send_json({
                        "event": "agent_response",
                        "text": remaining,
                        "audio": audio_chunk.hex(),
                        "is_stream_segment": True,
                        "is_final_segment": True
                    })
                else:
                    # Send a dummy message indicating final completion if nothing remaining
                    await websocket.send_json({
                        "event": "agent_response",
                        "text": "",
                        "audio": "",
                        "is_stream_segment": True,
                        "is_final_segment": True
                    })
                
    except WebSocketDisconnect:
        print(f"Connection closed for session: {conversation_id}. Triggering post-call hooks...")
        agent.trigger_n8n_post_call_webhook()
    except Exception as e:
        print(f"WebSocket Error: {e}")
        # Always attempt to trigger post-call cleanup in case of crash
        agent.trigger_n8n_post_call_webhook()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
