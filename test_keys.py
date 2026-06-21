import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

groq = os.getenv("GROQ_API_KEY")
openai = os.getenv("OPENAI_API_KEY")

print(f"GROQ_API_KEY: {groq[:10] if groq else None}...")
print(f"OPENAI_API_KEY: {openai[:10] if openai else None}...")
