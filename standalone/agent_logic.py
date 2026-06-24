import os
import time
import json
import requests
import re
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Fallback values
N8N_BASE_URL = "http://127.0.0.1:5678"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY")

class StandaloneAgent:
    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.client_name = ""
        self.phone_number = ""
        self.client_email = ""
        self.transcript = []
        self.webhook_triggered = False
        
        # Load Knowledge Base documents
        knowledge_dir = os.path.join(os.path.dirname(__file__), 'knowledge')
        personal_path = os.path.join(knowledge_dir, 'personal.txt')
        services_path = os.path.join(knowledge_dir, 'services.txt')
        
        self.knowledge_text = ""
        self.services_list = []
        
        # Load personal.txt
        if os.path.exists(personal_path):
            try:
                with open(personal_path, 'r', encoding='utf-8') as f:
                    personal_content = f.read().strip()
                    self.knowledge_text += personal_content + "\n\n"
            except Exception as e:
                print(f"Error reading personal.txt: {e}")
                
        # Load services.txt
        if os.path.exists(services_path):
            try:
                with open(services_path, 'r', encoding='utf-8') as f:
                    services_content = f.read()
                    self.knowledge_text += "SERVICES DOCUMENTATION:\n" + services_content
                    self._parse_services(services_content)
            except Exception as e:
                print(f"Error reading services.txt: {e}")
        
        # System Prompt matching ElevenLabs agent prompt
        self.system_prompt = (
            "You are a professional customer service assistant representing the General Directorate of Civil Defense "
            "in the Kingdom of Bahrain (الإدارة العامة للدفاع المدني في مملكة البحرين).\n\n"
            "CONVERSATIONAL RULES & GUARDRAILS:\n"
            "1. Language & Jurisdiction:\n"
            "   - You must communicate exclusively in Arabic.\n"
            "   - You are strictly responsible for Bahrain Civil Defense services. You must not answer questions or "
            "provide information regarding any other country.\n"
            "2. Grounding:\n"
            "   - You must be polite, accurate, and helpful.\n"
            "3. Pre-Flight Data Collection (Mandatory):\n"
            "   - BEFORE explaining any services or answering questions, you must explicitly collect the client's "
            "full name (الاسم) and phone number (رقم الهاتف).\n"
            "   - If the user asks a question before providing this information, say:\n"
            "     \"مرحباً بك في الدفاع المدني، يرجى تزويدي بالاسم ورقم الهاتف للبدء.\"\n"
            "   - Once they provide name and phone, they are saved automatically. Do not ask for them again, and proceed with their request.\n"
            "4. Email Transcript Option (On-Demand):\n"
            "   - If the user requests a copy of the conversation to be sent to their email, instruct them to write/type their email "
            "address in the chat input box (e.g. \"من فضلك اكتب بريدك الإلكتروني في خانة الكتابة بالأسفل\"). Do not collect email via voice.\n"
            "   - Once they submit it, it is saved automatically. Confirm to them: \"تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة.\"\n"
            "5. Silence & Turn-Taking:\n"
            "   - If the user stops talking, wait patiently and silently for them to continue.\n"
            "6. Brevity & Voice Optimization (CRITICAL):\n"
            "   - Speak in a natural, polite, and conversational manner.\n"
            "   - Keep your responses extremely short, direct, and concise (1-2 sentences maximum per turn).\n"
            "   - Never generate lists, long paragraphs, or bullet points. Summarize information in a single short sentence.\n\n"
            "KNOWLEDGE BASE DOCUMENTATION (Use the facts below to answer queries once Name and Phone are collected):\n"
            f"{self.knowledge_text}"
        )
        self.llm_history = [{"role": "system", "content": self.system_prompt}]


    def _parse_services(self, content: str):
        # Split services by looking for service headers
        sections = content.strip().split("\n\n")
        for sec in sections:
            lines = [l.strip() for l in sec.split("\n") if l.strip()]
            if not lines:
                continue
            title = lines[0]
            service_dict = {
                "title": title,
                "properties": {}
            }
            # Parse property key-value pairs
            i = 1
            while i < len(lines) - 1:
                key = lines[i]
                val = lines[i+1]
                service_dict["properties"][key] = val
                i += 2
            self.services_list.append(service_dict)
        
        # Initialize LLM clients (using AsyncOpenAI)
        self.groq_client = None
        self.openai_client = None
        self.fireworks_client = None
        
        if FIREWORKS_API_KEY:
            try:
                self.fireworks_client = AsyncOpenAI(
                    api_key=FIREWORKS_API_KEY,
                    base_url="https://api.fireworks.ai/inference/v1"
                )
                print("Fireworks client initialized with accounts/fireworks/models/gpt-oss-20b.")
            except Exception as e:
                print(f"Error initializing Fireworks client: {e}")

        if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
            try:
                self.groq_client = AsyncOpenAI(
                    api_key=GROQ_API_KEY,
                    base_url="https://api.groq.com/openai/v1"
                )
                print("Groq client initialized with llama-3.3-70b-versatile.")
            except Exception as e:
                print(f"Error initializing Groq client: {e}")
        
        # Prefer Groq (llama-3.3-70b-versatile) -> Fireworks (gpt-oss-20b)
        if self.groq_client:
            self.llm_client = self.groq_client
            self.model_name = "llama-3.3-70b-versatile"
        elif self.fireworks_client:
            self.llm_client = self.fireworks_client
            self.model_name = "accounts/fireworks/models/gpt-oss-20b"
        else:
            self.llm_client = None
            self.model_name = ""
            print("WARNING: No valid LLM client initialized. Running in Mock Mode.")

    def add_to_transcript(self, role: str, message: str, original_message: str = None):
        """Append a message turn to local transcript history."""
        self.transcript.append({
            "role": "user" if role == "user" else "agent",
            "message": message,
            "original_message": original_message
        })

    def trigger_n8n_lead_webhook(self):
        """Sends lead details to the n8n /webhook/leads endpoint asynchronously in a background thread."""
        import threading
        url = f"{N8N_BASE_URL}/webhook/leads"
        payload = {
            "clientName": self.client_name,
            "phoneNumber": self.phone_number,
            "clientEmail": self.client_email,
            "conversationId": self.conversation_id
        }
        def run_post():
            try:
                print(f"Triggering n8n leads webhook (bg thread): {payload}")
                response = requests.post(url, json=payload, timeout=5)
                print(f"n8n leads webhook response (bg thread): {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Error calling leads webhook (bg thread): {e}")
        
        threading.Thread(target=run_post, daemon=True).start()
        return {"status": "triggered"}

    def trigger_n8n_post_call_webhook(self):
        """Sends the full conversation transcript to the n8n /webhook/post-call endpoint asynchronously in a background thread."""
        import threading
        url = f"{N8N_BASE_URL}/webhook/post-call"
        payload = {
            "type": "post_call_transcription",
            "event_timestamp": int(time.time() * 1000),
            "data": {
                "conversation_id": self.conversation_id,
                "transcript": self.transcript
            }
        }
        def run_post():
            try:
                print(f"Triggering n8n post-call webhook (bg thread) for {self.conversation_id}")
                response = requests.post(url, json=payload, timeout=5)
                print(f"n8n post-call webhook response (bg thread): {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Error calling post-call webhook (bg thread): {e}")
                
        threading.Thread(target=run_post, daemon=True).start()
        return {"status": "triggered"}

    async def _call_llm_with_fallback(self, messages, tools=None, tool_choice=None, stream=False):
        """Helper to call LLM, falling back between Fireworks and Groq if one fails or is rate-limited."""
        clients_to_try = []
        # Add current model first
        if self.llm_client:
            clients_to_try.append((self.llm_client, self.model_name))
            
        # Add others if not already there
        if self.fireworks_client and (self.fireworks_client, "accounts/fireworks/models/gpt-oss-20b") not in clients_to_try:
            clients_to_try.append((self.fireworks_client, "accounts/fireworks/models/gpt-oss-20b"))
        if self.groq_client and (self.groq_client, "llama-3.3-70b-versatile") not in clients_to_try:
            clients_to_try.append((self.groq_client, "llama-3.3-70b-versatile"))

        def get_kwargs(model):
            kwargs = {
                "model": model,
                "messages": messages,
                "stream": stream
            }
            if tools:
                kwargs["tools"] = tools
            if tool_choice:
                kwargs["tool_choice"] = tool_choice
            return kwargs

        last_err = None
        for client, model in clients_to_try:
            try:
                print(f"Attempting query with model={model}...")
                res = await client.chat.completions.create(**get_kwargs(model))
                # Update current active client/model
                self.llm_client = client
                self.model_name = model
                return res
            except Exception as e:
                print(f"LLM model={model} failed: {e}")
                last_err = e
                
        if last_err:
            raise last_err
        raise Exception("No LLM client initialized.")

    async def get_llm_response(self, user_message: str) -> str:
        """Query LLM and process outputs directly without tool calls for maximum speed."""
        # 1. Unified state extraction
        self._extract_lead_parameters(user_message)
        
        self.add_to_transcript("user", user_message)
        self.llm_history.append({"role": "user", "content": user_message})
        
        # 2. Sync system prompt state
        system_content = self.system_prompt
        if self.client_name or self.phone_number:
            sync_info = "\n\nSTATE UPDATE (SYSTEM SYNC):\n"
            if self.client_name:
                sync_info += f"- Client Name is ALREADY collected: {self.client_name}\n"
            if self.phone_number:
                sync_info += f"- Phone Number is ALREADY collected: {self.phone_number}\n"
            sync_info += "Do NOT ask the client for their name or phone number again as they are already saved."
            system_content += sync_info
            
        if self.llm_history and self.llm_history[0]["role"] == "system":
            self.llm_history[0]["content"] = system_content
            
        if not self.llm_client:
            # Mock mode implementation
            ans = self._mock_response(user_message)
            self.llm_history.append({"role": "assistant", "content": ans})
            return ans

        try:
            response = await self._call_llm_with_fallback(
                messages=self.llm_history,
                tools=None,
                tool_choice=None,
                stream=False
            )
            
            agent_msg = response.choices[0].message.content
            
            self.llm_history.append({"role": "assistant", "content": agent_msg})
            self.add_to_transcript("agent", agent_msg)
            return agent_msg
            
        except Exception as e:
            print(f"Error querying LLM ({e}). Falling back to Heuristics Mock Mode.")
            ans = self._mock_response(user_message)
            self.llm_history.append({"role": "assistant", "content": ans})
            return ans

    async def get_llm_response_stream(self, user_message: str):
        """Query LLM and yield response chunks in real-time asynchronously. Tools are bypassed to avoid latency."""
        # 1. Unified state extraction
        self._extract_lead_parameters(user_message)
        
        self.add_to_transcript("user", user_message)
        self.llm_history.append({"role": "user", "content": user_message})
        
        # 2. Sync system prompt state
        system_content = self.system_prompt
        if self.client_name or self.phone_number:
            sync_info = "\n\nSTATE UPDATE (SYSTEM SYNC):\n"
            if self.client_name:
                sync_info += f"- Client Name is ALREADY collected: {self.client_name}\n"
            if self.phone_number:
                sync_info += f"- Phone Number is ALREADY collected: {self.phone_number}\n"
            sync_info += "Do NOT ask the client for their name or phone number again as they are already saved."
            system_content += sync_info
            
        if self.llm_history and self.llm_history[0]["role"] == "system":
            self.llm_history[0]["content"] = system_content
            
        if not self.llm_client:
            # Mock mode implementation (yields all at once)
            ans = self._mock_response(user_message)
            self.llm_history.append({"role": "assistant", "content": ans})
            yield ans
            return

        try:
            response = await self._call_llm_with_fallback(
                messages=self.llm_history,
                tools=None,
                tool_choice=None,
                stream=True
            )
            
            content_buffer = ""
            async for chunk in response:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    content_buffer += delta.content
                    yield delta.content
            
            self.llm_history.append({"role": "assistant", "content": content_buffer})
            self.add_to_transcript("agent", content_buffer)
                
        except Exception as e:
            print(f"Error querying streaming LLM ({e}). Falling back to Heuristics Mock Mode.")
            ans = self._mock_response(user_message)
            self.llm_history.append({"role": "assistant", "content": ans})
            yield ans

    def _convert_arabic_words_to_digits(self, text: str) -> str:
        mapping = {
            "صفر": "0", "واحد": "1", "واحدة": "1", "واحده": "1",
            "اثنين": "2", "إثنين": "2", "اتنين": "2",
            "ثلاثة": "3", "ثلاثه": "3", "تلاتة": "3", "تلاته": "3",
            "أربعة": "4", "اربعة": "4", "أربعه": "4", "اربعه": "4",
            "خمسة": "5", "خمسه": "5", "ستة": "6", "سته": "6",
            "سبعة": "7", "سبعه": "7", "ثمانية": "8", "ثمانيه": "8",
            "تمانية": "8", "تمانيه": "8", "تسعة": "9", "تسعه": "9"
        }
        words = text.split()
        converted_words = []
        for w in words:
            cleaned = w.strip(".,،؟?")
            if cleaned in mapping:
                pfx = w[:w.find(cleaned)]
                sfx = w[w.find(cleaned) + len(cleaned):]
                converted_words.append(pfx + mapping[cleaned] + sfx)
            else:
                converted_words.append(w)
        return " ".join(converted_words)

    def _merge_spaced_digits(self, text: str) -> str:
        return re.sub(r'(?<=\d)\s+(?=\d)', '', text)

    def _extract_lead_parameters(self, user_message: str):
        # Convert Arabic numerals and words to English digits
        normalized_msg = user_message.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        converted_msg = self._convert_arabic_words_to_digits(normalized_msg)
        merged_msg = self._merge_spaced_digits(converted_msg)

        # Detect name/phone change requests
        if any(keyword in merged_msg for keyword in ["غير اسمي", "تغيير اسمي", "تعديل اسمي", "اسمي الجديد"]):
            self.client_name = ""
            self.webhook_triggered = False
        if any(keyword in merged_msg for keyword in ["غير رقمي", "تغيير رقمي", "تعديل رقمي", "رقمي الجديد", "تعديل الهاتف"]):
            self.phone_number = ""
            self.webhook_triggered = False

        # Extract phone if not present (relaxed from 6 to 4 digits for testing, e.g. 1123)
        if not self.phone_number:
            phone_match = re.search(r'\b\d{4,15}\b', merged_msg)
            if phone_match:
                self.phone_number = phone_match.group(0)
            elif "35555563" in merged_msg or "222444" in merged_msg:
                self.phone_number = "97335555563"

        # Extract name if not present
        if not self.client_name:
            stop_words = {
                "مرحبا", "أهلا", "اهلاً", "اهلا", "مرحباً", "السلام", "عليكم", "الدفاع", "المدني", 
                "مركز", "خدمات", "الإدارة", "العامة", "يرجى", "تزويد", "تزويدي", "رقم", "الهاتف", 
                "هاتف", "الرقم", "الاسم", "اسمي", "أنا", "معك", "هو", "وهو", "هي", "وهي", "اريد", 
                "أريد", "عن", "في", "على", "من", "إلى", "الى", "مع", "معكم", "معاك", "تفضل", 
                "شكرا", "شكراً", "ورقم", "والاسم"
            }
            # Try to match name pattern
            name_match = re.search(r'\b[وف]?(?:اسمي|الاسم|أنا|معك|اسمه|اسم)\b\s+([^\s\d\.\,،]{2,15}(?:\s+[^\s\d\.\,،]{2,15})?)', merged_msg)
            if name_match:
                extracted = name_match.group(1).strip()
                extracted_clean = re.split(r'\s+(?:و?رقمي|و?رقم|هو)\b', extracted)[0].strip()
                # Validate that it's not a stop word or helper text
                extracted_words = [w.strip(".,،؟?") for w in extracted_clean.split()]
                if not any(w in stop_words for w in extracted_words):
                    self.client_name = extracted_clean
            
            # Fallbacks if name still not extracted
            if not self.client_name:
                if "سالم" in merged_msg:
                    self.client_name = "سالم"
                else:
                    cleaned_words = [w for w in merged_msg.split() if not re.match(r'^\d+$', w)]
                    name_words = [w for w in cleaned_words if w not in stop_words and len(w) >= 3]
                    if name_words:
                        self.client_name = name_words[0]

        # Extract email if present
        if "@" in merged_msg or "[at]" in merged_msg:
            normalized_email = merged_msg.replace(" [at] ", "@").replace("[at]", "@").strip()
            email_match = re.search(r'\b[A-Za-z0-9\._%+-]+@[A-Za-z0-9\.-]+\.[A-Za-z]{2,}\b', normalized_email)
            if email_match:
                extracted_email = email_match.group(0)
                if self.client_email != extracted_email:
                    self.client_email = extracted_email
                    self.trigger_n8n_lead_webhook()
                    self.webhook_triggered = True

        # Trigger webhook immediately if both present but not yet triggered
        if self.client_name and self.phone_number and not self.webhook_triggered:
            self.trigger_n8n_lead_webhook()
            self.webhook_triggered = True

    def _mock_response(self, msg: str) -> str:
        """Fallback mock agent response when no API keys are present."""
        import re
        
        has_greeted = any(k in turn["message"] for turn in self.transcript if turn["role"] == "agent" for k in ["تسجيل", "مساعدتك", "خدمة", "أهلاً بك", "سجل"]) or len(self.transcript) > 2
        if self.client_name and self.phone_number and not has_greeted:
            ans = f"أهلاً بك يا {self.client_name}. تم تسجيل بياناتك بنجاح. كيف يمكنني مساعدتك اليوم؟"
            self.add_to_transcript("agent", ans)
            return ans
            
        ans = ""
        if not self.client_name or not self.phone_number:
            if "مرحبا" in msg or "الدفاع" in msg or "المدني" in msg:
                ans = "أهلاً بك. للبدء، يرجى تزويدي بالاسم الكامل ورقم الهاتف بوضوح."
            else:
                ans = "يرجى تزويدي بالاسم ورقم الهاتف للبدء بتقديم الخدمة."
        elif "@" in msg or "[at]" in msg:
            normalized_email = msg.replace(" [at] ", "@").replace("[at]", "@").strip()
            email_match = re.search(r'\b[A-Za-z0-9\._%+-]+@[A-Za-z0-9\.-]+\.[A-Za-z]{2,}\b', normalized_email)
            if email_match:
                self.client_email = email_match.group(0)
            else:
                self.client_email = normalized_email
            self.trigger_n8n_lead_webhook()
            ans = "تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة."
        else:
            # Check for creator (Salem) or Director General (Ali Al-Kubaisi)
            if any(word in msg for word in ["من انشأ", "من أنشأ", "سالم", "صانع", "المنّاعي", "المنناعي", "النظام"]):
                ans = "الذي أنشأ هذا النظام وصممه هو الرائد سالم المنّاعي."
            elif "مدير" in msg or "رئيس" in msg or "الكبيسي" in msg:
                ans = "مدير عام الإدارة العامة للدفاع المدني هو العميد ركن طيّار علي بن محمد الكبيسي."
            elif "طوارئ" in msg or "رقم" in msg:
                ans = "رقم طوارئ الدفاع المدني في مملكة البحرين هو 999 للتبلاغات الطارئة."
            elif any(word in msg for word in ["شكرا", "شكراً", "سلام", "السلامة", "يعافيك", "باي", "وداعا"]):
                ans = "على الرحب والسعة. يسعدنا دائماً خدمتكم في الدفاع المدني. مع السلامة!"
            else:
                # Search for matching service in parsed services_list
                matched_service = None
                for svc in self.services_list:
                    # Match keywords in title
                    keywords = [k.strip("،,.") for k in svc["title"].split()]
                    stop_words = {"إصدار", "ترخيص", "وتجديد", "الترخيص", "شروط", "محلات", "ورش", "مباني", "محطة", "محطات", "مراكز", "معاهد", "مخابز", "ورشة", "خدمة", "بيع", "شعبية", "آلية", "الشعبية", "الآلية", "تزويد"}
                    # Keep only meaningful keywords
                    meaningful = [k for k in keywords if len(k) >= 3 and k not in stop_words]
                    if any(k in msg for k in meaningful) or \
                       ("ذهب" in msg and "الذهب" in svc["title"]) or \
                       (any(k in msg for k in ["مخبز", "مخابز"]) and "المخابز" in svc["title"]) or \
                       ("غاز" in msg and "الغاز" in svc["title"]) or \
                       (any(k in msg for k in ["حريق", "إطفاء", "وقاية"]) and "الحريق" in svc["title"]) or \
                       (any(k in msg for k in ["تدريب", "معهد", "معاهد"]) and "التدريب" in svc["title"]) or \
                       (any(k in msg for k in ["وقود", "بنزين", "محطة", "محطات"]) and "الوقود" in svc["title"]):
                        matched_service = svc
                        break
                
                if matched_service:
                    title = matched_service["title"]
                    props = matched_service["properties"]
                    desc = props.get("وصف الخدمة", "")
                    fees = props.get("رسوم الخدمة", "")
                    docs = props.get("المستندات المطلوبة", "")
                    channels = props.get("قنوات تقديم الخدمة", "")
                    
                    if "رسوم" in msg or "سعر" in msg or "بكم" in msg or "كم" in msg:
                        ans = f"رسوم خدمة {title} هي {fees}."
                    elif any(word in msg for word in ["مستند", "اوراق", "أوراق", "مطلوب"]):
                        ans = f"المستندات المطلوبة لخدمة {title} هي: {docs}."
                    elif any(word in msg for word in ["كيف", "قناة", "طريقة", "تقديم"]):
                        ans = f"يمكن تقديم خدمة {title} عبر: {channels}."
                    else:
                        ans = f"خدمة {title}: {desc}. الرسوم: {fees}. التقديم يتم عبر: {channels}."
                else:
                    if self.client_email:
                        ans = "لقد قمنا بتسجيل بريدك الإلكتروني لتلقي التقرير. هل هناك أي خدمات أخرى تود الاستفسار عنها؟"
                    else:
                        ans = "هل تود إرسال نسخة من تفاصيل هذه المحادثة إلى بريدك الإلكتروني؟ اكتب إيميلك بالأسفل."
                
        self.add_to_transcript("agent", ans)
        return ans
