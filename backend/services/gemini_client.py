"""
Google Gemini API Client
Using the Two-Step Agent Pipeline for Production-Grade Structured Outputs
"""
from google import genai
from google.genai.types import GenerateContentConfig, GoogleSearch
from pydantic import BaseModel
from decouple import config
import json
import logging

logger = logging.getLogger(__name__)

# Define the exact schema the database requires
class AIAnalysisSchema(BaseModel):
    probability: float
    confidence: float
    reasoning: str
    key_factors: list[str]
    sources_consulted: str

class GeminiClient:
    """Client for Google Gemini AI using the two-step architecture"""
    
    def __init__(self):
        self.api_key = config('GEMINI_API_KEY', default='')
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("✅ Gemini client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {str(e)}")
                self.client = None
        else:
            logger.warning("No Gemini API key configured")
            self.client = None
            
    def estimate_probability(self, event_title, event_description, market_context=None):
        """Two-Step Production Pipeline: Research -> Structure"""
        if not self.client:
            logger.error("Gemini client not initialized - no API key")
            return self._default_response()
            
        try:
            logger.info(f"Phase 1: Researching '{event_title[:50]}...'")
            
            # ==========================================
            # STEP 1: THE RESEARCHER (Uses Google Search)
            # ==========================================
            research_prompt = self._build_research_prompt(event_title, event_description, market_context)
            
            research_config = GenerateContentConfig(
                temperature=0.3,
                tools=[GoogleSearch()], # Search is enabled here
            )
            
            research_response = self.client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=research_prompt,
                config=research_config,
            )
            
            logger.info("Phase 2: Formatting output into strict JSON schema")
            
            # ==========================================
            # STEP 2: THE FORMATTER (Uses Strict Schema)
            # ==========================================
            format_prompt = f"""
            Extract the data from the following research report into the required JSON schema.
            Make sure the reasoning is a single continuous paragraph without line breaks.
            
            RESEARCH REPORT:
            {research_response.text}
            """
            
            format_config = GenerateContentConfig(
                temperature=0.0, # Zero creativity, just formatting
                response_mime_type="application/json",
                response_schema=AIAnalysisSchema, # Strict JSON enforced here
            )
            
            final_response = self.client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=format_prompt,
                config=format_config,
            )
            
            # Parse the guaranteed perfect JSON
            result = self._parse_response(final_response.text)
            logger.info(f"✅ Production Pipeline Complete: {result['probability']}% (Confidence: {result['confidence']}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in Gemini Pipeline: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._default_response()

    def _build_research_prompt(self, title, description, context=None):
        """Build prompt for the Research phase"""
        prompt = f"""You are a quantitative analyst. Analyze the following prediction market event:
Title: {title}
Description: {description}

Search the web for the latest news regarding this event.
Write a comprehensive summary including:
1. A final probability percentage (0-100)
2. Your confidence level in this prediction (0-100)
3. A 2-3 sentence reasoning summary
4. 3-5 key factors driving this prediction
5. The main sources or news you found
"""
        if context:
            prompt += f"\nCurrent Market Price: ₦{context.get('current_price', 'N/A')}"
            prompt += f"\nMarket Implied Probability: {context.get('implied_probability', 'N/A')}%"
            
        return prompt

    def _parse_response(self, response_text):
        """Parse the guaranteed perfect JSON from the Formatter phase"""
        try:
            data = json.loads(response_text)
            
            # Get raw probability
            prob_raw = float(data.get('probability', 50.0))
            
            # NORMALIZE: If value is between 0 and 1, assume it's 0-1 scale and convert to 0-100
            if 0 < prob_raw <= 1:
                prob_raw = prob_raw * 100
                logger.info(f"Normalized probability from {data.get('probability')} to {prob_raw}")
            
            # Get raw confidence and normalize similarly
            conf_raw = float(data.get('confidence', 50.0))
            if 0 < conf_raw <= 1:
                conf_raw = conf_raw * 100
                logger.info(f"Normalized confidence from {data.get('confidence')} to {conf_raw}")
            
            return {
                'probability': prob_raw,  # Now always 0-100
                'confidence': conf_raw,   # Now always 0-100
                'reasoning': str(data.get('reasoning', 'Analysis complete')).replace('\n', ' '),
                'key_factors': data.get('key_factors', [])[:5],
                'sources_consulted': str(data.get('sources_consulted', ''))[:200]
            }
        except Exception as e:
            logger.error(f"Critical error parsing JSON: {str(e)}")
            return self._default_response()

    def _default_response(self):
        """Fallback for critical failures"""
        return {
            'probability': 50.0,
            'confidence': 0.0,
            'reasoning': 'AI analysis unavailable due to system error.',
            'key_factors': [],
            'sources_consulted': '',
        }

# Global instance
gemini_client = GeminiClient()