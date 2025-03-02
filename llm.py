import os
from dotenv import load_dotenv
import logging
import google.generativeai as genai
from openai import AsyncOpenAI
import anthropic
import fireworks.client as fireworks
import groq
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage, SystemMessage

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Gemini AI
genai.configure(api_key=os.getenv('GOOGLE_API_KEY', '').strip())

# Configure OpenAI (GPT)
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY', '').strip())

# Configure Anthropic (Claude)
claude_client = anthropic.AsyncAnthropic(api_key=os.getenv('ANTHROPIC_API_KEY', '').strip())

# Configure Fireworks
fireworks.api_key = os.getenv('FIREWORKS_API_KEY', '').strip()

# Configure Groq
groq_client = groq.Client(api_key=os.getenv('GROQ_API_KEY', '').strip())

# Add a global conversation memory dictionary to store memories for different sessions
conversation_memories = {}

# Define model mappings
MODEL_MAPPINGS = {
    "gpt-4o-mini": "gpt-4o-mini",
    "gemini-flash-2.0": "gemini-1.5-flash",
    "claude-3.5-haiku": "claude-3-haiku",
    "llama-3.3": "accounts/fireworks/models/llama-3.3"
}

def get_or_create_memory(session_id):
    """Get or create a conversation memory for a session."""
    if not session_id:
        return None
    if session_id not in conversation_memories:
        conversation_memories[session_id] = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
    return conversation_memories[session_id]

def get_model_instance(model_name):
    """Get the appropriate model client based on the model name."""
    # Normalize model name using mappings if present
    model_name = MODEL_MAPPINGS.get(model_name, model_name)
    
    logger.debug(f"Getting model instance for: {model_name}")
    
    if model_name.startswith("gemini"):
        return genai.GenerativeModel(model_name)
    elif model_name in ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4"]:
        return openai_client
    elif model_name in ["claude-3-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3.5-haiku"]:
        return claude_client
    elif "llama" in model_name:
        return fireworks
    elif model_name.startswith("groq"):
        return groq_client
    else:
        logger.warning(f"Unknown model: {model_name}, defaulting to gemini-pro")
        return genai.GenerativeModel('gemini-pro')

async def generate_response(messages, model, session_id):
    """Generate a streaming response based on the model selected."""
    try:
        memory = get_or_create_memory(session_id)
        current_message = messages[-1] if messages else None
        
        if not current_message:
            logger.warning("No current message found")
            yield "Error: No message provided"
            return
            
        content = current_message["content"].strip()
        if not content:
            logger.warning("Empty message content received")
            yield "Error: Empty message content"
            return
        
        # Normalize model name using mappings if present
        mapped_model = MODEL_MAPPINGS.get(model, model)
        logger.info(f"Generating response with model: {model} (mapped to: {mapped_model})")
        
        # Handle Gemini models
        if mapped_model in ["gemini-pro", "gemini-1.5-flash"]:
            try:
                gemini_model = genai.GenerativeModel(mapped_model)
                response = gemini_model.generate_content(content, stream=True)
                for chunk in response:
                    if hasattr(chunk, 'text'):
                        yield chunk.text
            except Exception as e:
                logger.error(f"Gemini model error: {str(e)}")
                yield f"Error with Gemini model: {str(e)}"
                
        # Handle OpenAI models
        elif mapped_model in ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4"]:
            try:
                completion = await openai_client.chat.completions.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": content}],
                    stream=True,
                    max_tokens=1000
                )
                async for chunk in completion:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error(f"OpenAI model error: {str(e)}")
                yield f"Error with OpenAI model: {str(e)}"

        # Handle Claude models
        elif mapped_model in ["claude-3-haiku", "claude-3-opus", "claude-3-sonnet"]:
            try:
                response = await claude_client.messages.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": content}],
                    max_tokens=1000,
                    stream=True
                )
                async for chunk in response:
                    if chunk.delta.text:
                        yield chunk.delta.text
            except Exception as e:
                logger.error(f"Claude model error: {str(e)}")
                yield f"Error with Claude model: {str(e)}"

        # Handle Llama models
        elif "llama" in mapped_model:
            try:
                response = await fireworks.ChatCompletion.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": content}],
                    stream=True,
                    max_tokens=1000
                )
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error(f"Llama model error: {str(e)}")
                yield f"Error with Llama model: {str(e)}"
                
        # Handle unknown models with fallback
        else:
            logger.warning(f"Unsupported model: {model}, falling back to gemini-pro")
            try:
                gemini_model = genai.GenerativeModel('gemini-pro')
                response = gemini_model.generate_content(content, stream=True)
                for chunk in response:
                    if hasattr(chunk, 'text'):
                        yield chunk.text
            except Exception as e:
                logger.error(f"Fallback model error: {str(e)}")
                yield f"Error with fallback model: {str(e)}"
        
        # Update conversation memory if available
        if memory and not isinstance(content, Exception):
            try:
                memory.chat_memory.add_user_message(content)
                # We don't have the full response here for memory since we're streaming
                # You might want to accumulate the full response in another way
            except Exception as e:
                logger.error(f"Error updating memory: {str(e)}")
                
    except Exception as e:
        logger.error(f"General error in generate_response: {str(e)}")
        yield f"Error: {str(e)}"

async def generate_related_questions(message: str, model_name: str) -> list:
    """Generate related questions based on the user's message."""
    try:
        # Normalize model name using mappings if present
        mapped_model = MODEL_MAPPINGS.get(model_name, model_name)
        logger.info(f"Generating related questions with model: {model_name} (mapped to: {mapped_model})")
        
        prompt = f"Based on this message: '{message}', generate 3 related follow-up questions. Return them as a simple array of strings."
        
        # Handle Gemini models
        if mapped_model in ["gemini-pro", "gemini-1.5-flash"]:
            try:
                model = genai.GenerativeModel(mapped_model)
                response = model.generate_content(prompt)
                text_response = response.text
            except Exception as e:
                logger.error(f"Gemini related questions error: {str(e)}")
                return []
                
        # Handle OpenAI models
        elif mapped_model in ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4"]:
            try:
                response = await openai_client.chat.completions.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": prompt}]
                )
                text_response = response.choices[0].message.content
            except Exception as e:
                logger.error(f"OpenAI related questions error: {str(e)}")
                return []
                
        # Handle Claude models
        elif mapped_model in ["claude-3-haiku", "claude-3-opus", "claude-3-sonnet"]:
            try:
                response = await claude_client.messages.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1000
                )
                text_response = response.content[0].text
            except Exception as e:
                logger.error(f"Claude related questions error: {str(e)}")
                return []
                
        # Handle Llama models
        elif "llama" in mapped_model:
            try:
                response = await fireworks.ChatCompletion.create(
                    model=mapped_model,
                    messages=[{"role": "user", "content": prompt}]
                )
                text_response = response.choices[0].message.content
            except Exception as e:
                logger.error(f"Llama related questions error: {str(e)}")
                return []
                
        # Handle unknown models with fallback
        else:
            logger.warning(f"Unsupported model for related questions: {model_name}, falling back to gemini-pro")
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                text_response = response.text
            except Exception as e:
                logger.error(f"Fallback related questions error: {str(e)}")
                return []

        # Parse the response into an array
        questions = []
        for line in text_response.split('\n'):
            line = line.strip()
            if line and not line.startswith('[') and not line.startswith(']'):
                # Remove any numbers or bullet points at the start
                cleaned_line = line.lstrip('0123456789.- *•')
                cleaned_line = cleaned_line.strip('"\'').strip()
                if cleaned_line:
                    questions.append(cleaned_line)
        
        # Return at most 3 questions
        return questions[:3]

    except Exception as e:
        logger.error(f"General error generating related questions: {str(e)}")
        return [] 