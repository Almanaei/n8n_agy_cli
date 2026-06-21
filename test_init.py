from standalone.agent_logic import StandaloneAgent

try:
    agent = StandaloneAgent(conversation_id="test")
    print(f"StandaloneAgent initialized successfully!")
    print(f"groq_client: {agent.groq_client}")
    print(f"openai_client: {agent.openai_client}")
    print(f"llm_client: {agent.llm_client}")
    print(f"model_name: {agent.model_name}")
except Exception as e:
    print(f"Failed to initialize StandaloneAgent: {e}")
