from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from llm import generate_response, generate_related_questions
import json
import logging
import os
from dotenv import load_dotenv
from uuid import uuid4
import time
from starlette.background import BackgroundTask
import sys

# Load environment variables
load_dotenv()

# Verify required API keys are present
if not os.getenv('GOOGLE_API_KEY') or not os.getenv('OPENAI_API_KEY') or not os.getenv('ANTHROPIC_API_KEY'):
    raise ValueError("One or more API keys are missing in environment variables!")

app = FastAPI()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session management
sessions = {}

# Add the react-agent source directory to Python's path
sys.path.append(os.path.join(os.path.dirname(__file__), 'react-agent/src'))

# Now the react_agent module can be imported
from react_agent import graph
from langchain_core.messages import HumanMessage, AIMessage

async def get_session_id(request: Request):
    """Get or create a session ID from request headers."""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        session_id = f"session_{uuid4()}"
    
    # Initialize session if it doesn't exist
    if session_id not in sessions:
        sessions[session_id] = {
            'created_at': time.time(),
            'last_accessed': time.time()
        }
    else:
        sessions[session_id]['last_accessed'] = time.time()
    
    return session_id

@app.post("/chat")
async def chat_endpoint(request: Request, session_id: str = Depends(get_session_id)):
    try:
        # Cancel previous request if header is present
        if request.headers.get('X-Cancel-Previous') == 'true':
            previous_request = sessions[session_id].get('current_request')
            if previous_request:
                sessions[session_id]['cancelled'] = True

        body = await request.json()
        message = body.get('message', '').strip()
        model = body.get('model', 'gemini-pro').strip()
        
        # Map model names to their cheaper versions
        model_mapping = {
            'gpt-4': 'gpt-3.5-turbo',
            'claude-3-opus': 'claude-3-haiku',
            'llama-70b': 'llama-v2-7b',
            'mixtral-8x7b-instruct': 'mixtral-8x7b'
        }
        
        model = model_mapping.get(model, model)
        request_id = request.headers.get('X-Request-ID')

        sessions[session_id]['current_request'] = request_id
        sessions[session_id]['cancelled'] = False

        if not message:
            raise HTTPException(status_code=400, detail="No message provided")

        # Prepare messages for the model
        messages = [
            {"role": "user", "content": message}
        ]

        # Use StreamingResponse instead of mixing yield and return
        async def response_generator():
            try:
                full_response = ""
                async for chunk in generate_response(messages, model, session_id):
                    if sessions[session_id].get('cancelled', False):
                        logger.info(f"Request {request_id} was cancelled")
                        break
                    
                    # Only send the new chunk, not the accumulated response
                    if chunk:
                        yield f"data: {chunk}\n\n"
                
                # Send DONE marker only once at the end
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Error generating response: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            response_generator(),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice-chat")
async def voice_chat_endpoint(request: Request, session_id: str = Depends(get_session_id)):
    try:
        logger.info(f"Received voice chat request for session {session_id}")
        
        # Update session last accessed time
        sessions[session_id]['last_accessed'] = time.time()
        
        body = await request.json()
        message = body.get('message', '').strip()
        model = body.get('model', 'gemini-pro').strip()
        language = body.get('language', 'en-US').strip()
        request_id = request.headers.get('X-Request-ID')

        logger.info(f"Processing voice request {request_id} with message: {message[:50]}...")

        if not message:
            logger.warning("Empty message received")
            return JSONResponse({
                "success": False,
                "detail": "No message provided"
            }, status_code=400)

        # Store the current request ID in the session
        previous_request = sessions[session_id].get('current_request')
        sessions[session_id]['current_request'] = request_id
        logger.info(f"Updated session request ID from {previous_request} to {request_id}")

        # Enhanced system prompt for multilingual support
        system_prompt = (
            f"You are a helpful assistant. Respond in {language}. "
            f"If the user speaks in Hindi, respond in Hindi. "
            f"If they speak in English, respond in English. "
            f"Maintain the same language and style as the user's input. "
            f"Keep responses natural and conversational in the detected language."
        )

        # Prepare messages for the model
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]

        try:
            response = ""
            async for chunk in generate_response(messages, model, session_id):
                # Check if the request is still valid
                if sessions[session_id].get('current_request') != request_id:
                    logger.warning(f"Request {request_id} was superseded")
                    raise HTTPException(status_code=409, detail="Request superseded")
                response += chunk

            if not response:
                raise ValueError("No response generated")

            logger.info(f"Successfully generated response for voice request {request_id}")
            return JSONResponse({
                "success": True,
                "response": response,
                "language": language
            })

        except Exception as e:
            logger.error(f"Model error: {str(e)}")
            return JSONResponse({
                "success": False,
                "detail": f"Model error: {str(e)}"
            }, status_code=500)

    except Exception as e:
        logger.error(f"Voice chat error: {str(e)}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.post("/related-questions")
async def related_questions_endpoint(request: Request):
    try:
        body = await request.json()
        message = body.get('message', '').strip()
        model = body.get('model', 'gemini-pro').strip()

        if not message:
            raise HTTPException(status_code=400, detail="No message provided")

        # Generate related questions
        questions = await generate_related_questions(message, model)

        return JSONResponse({
            "success": True,
            "questions": questions
        })

    except Exception as e:
        logger.error(f"Related questions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent-chat")
async def agent_chat_endpoint(request: Request, session_id: str = Depends(get_session_id)):
    try:
        # Update session last accessed time
        sessions[session_id]['last_accessed'] = time.time()
        
        body = await request.json()
        message = body.get('message', '').strip()
        
        if not message:
            raise HTTPException(status_code=400, detail="No message provided")
        
        logger.info(f"Agent chat request from session {session_id}: {message[:50]}...")
        
        # Format the message for the agent
        formatted_message = [("user", message)]
        
        # Setup agent response streaming
        async def response_generator():
            try:
                # Call the React agent
                result = await graph.ainvoke(
                    {"messages": formatted_message},
                    {"configurable": {"system_prompt": "You are a helpful AI assistant."}}
                )
                
                # Get the final AI message
                final_message = result["messages"][-1]
                if hasattr(final_message, "content"):
                    content = final_message.content
                    if isinstance(content, str):
                        yield f"data: {json.dumps({'content': content})}\n\n"
                    else:
                        yield f"data: {json.dumps({'content': str(content)})}\n\n"
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Agent error: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
                yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            response_generator(),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        logger.error(f"Agent chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)