"""
Google Gemini API Client with Auto-Failover
Two-Step Agent Pipeline for Production-Grade Structured Outputs
"""
from google import genai
from google.genai.types import GenerateContentConfig, Tool, GoogleSearch
from pydantic import BaseModel
from decouple import config
import json
import logging
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import concurrent.futures

logger = logging.getLogger(__name__)

# Define the exact schema the database requires
class AIAnalysisSchema(BaseModel):
    probability: float
    confidence: float
    reasoning: str
    key_factors: list[str]
    sources_consulted: str

AVAILABLE_MODELS = [
    # Proven 2.x models
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-flash-lite-latest',
    
    # Newest / Experimental models at the bottom
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
]
class GeminiClient:
    """Client for Google Gemini AI with automatic model failover"""
    
    def __init__(self):
        self.api_key = config('GEMINI_API_KEY', default='')
        self._failed_models = set()  # Track exhausted models in this session
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {str(e)}")
                self.client = None
        else:
            logger.warning("No Gemini API key configured")
            self.client = None
    
    def _get_available_model(self):
        """Get first model that hasn't been exhausted"""
        for model in AVAILABLE_MODELS:
            if model not in self._failed_models:
                return model
        return None
    
    def _mark_model_exhausted(self, model_name):
        """Mark a model as exhausted"""
        self._failed_models.add(model_name)
        logger.warning(f"Model {model_name} exhausted, will try next")
    
    def check_model_quotas(self):
        """
        Check models in AVAILABLE_MODELS for quota concurrently and reorder them.
        Finds working models and pushes them to the top.
        """
        if not self.client:
            return
            
        logger.info("Checking model quotas concurrently...")
        working_models = []
        exhausted_models = []
        
        global AVAILABLE_MODELS
        
        def check_single_model(model):
            try:
                self.client.models.generate_content(
                    model=model,
                    contents="test",
                    config=GenerateContentConfig(max_output_tokens=1)
                )
                return model, True
            except Exception as e:
                error_str = str(e)
                return model, False

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(AVAILABLE_MODELS)) as executor:
            future_to_model = {executor.submit(check_single_model, m): m for m in AVAILABLE_MODELS}
            for future in concurrent.futures.as_completed(future_to_model):
                model, success = future.result()
                if success:
                    working_models.append(model)
                    logger.info(f"Model {model} has quota.")
                else:
                    exhausted_models.append(model)
                    logger.warning(f"Model {model} is exhausted or unavailable.")
                    
        # Maintain original priority order for working models
        ordered_working = [m for m in AVAILABLE_MODELS if m in working_models]
        
        # Maintain original priority order for exhausted models
        ordered_exhausted = [m for m in AVAILABLE_MODELS if m in exhausted_models]
        
        # Reorder list: Working models first, then exhausted at the bottom
        AVAILABLE_MODELS = ordered_working + ordered_exhausted
        
        # Clear the failed models list so the working model can be used, but keep the exhausted ones
        self._failed_models = set(exhausted_models)
        
        logger.info(f"Quota check complete. Best available: {AVAILABLE_MODELS[0] if working_models else 'None'}")
        return AVAILABLE_MODELS

    def _generate_with_retry(self, model, contents, config, max_retries=2):
        """Generate content with retry on quota errors, returns (response, model_used)"""
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                return response, model  # Return both response and the model that worked
            except Exception as e:
                error_str = str(e)
                if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                    logger.warning(f"Model {model} quota exhausted (attempt {attempt + 1})")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                    else:
                        return None, model
                else:
                    logger.error(f"Error with model {model}: {error_str}")
                    raise e
        return None, model
    
    def estimate_probability(self, event_title, event_description, market_context=None):
        """Two-Step Production Pipeline with auto-failover"""
        if not self.client:
            logger.error("Gemini client not initialized - no API key")
            return self._default_response()
        
        # Get available model
        model_to_try = self._get_available_model()
        if not model_to_try:
            logger.error("All Gemini models exhausted")
            last_error = getattr(self, '_last_quota_error', "All AI models currently unavailable due to quota limits")
            return self._default_response(f"API Quota Error: {last_error}")
        
        actual_model_used = model_to_try  # Will be updated if failover happens
        
        try:
            logger.info(f"Phase 1: Researching '{event_title[:50]}...' using {model_to_try}")
            
            # ==========================================
            # STEP 1: THE RESEARCHER (Uses Google Search)
            # ==========================================
            research_prompt = self._build_research_prompt(event_title, event_description, market_context)
            
            research_config = GenerateContentConfig(
                temperature=0.3,
            )
            
            research_response, research_model = self._generate_with_retry(
                model=model_to_try,
                contents=research_prompt,
                config=research_config,
            )
            
            if research_response is None:
                self._mark_model_exhausted(model_to_try)
                return self.estimate_probability(event_title, event_description, market_context)
            
            actual_model_used = research_model  # Update with actual model that worked
            
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
                temperature=0.0,
                response_mime_type="application/json",
                response_schema=AIAnalysisSchema,
            )
            
            final_response, format_model = self._generate_with_retry(
                model=actual_model_used,
                contents=format_prompt,
                config=format_config,
            )
            
            if final_response is None:
                self._mark_model_exhausted(actual_model_used)
                return self.estimate_probability(event_title, event_description, market_context)
            
            actual_model_used = format_model  # Update again (should be same as research_model)
            
            # Parse the guaranteed perfect JSON
            result = self._parse_response(final_response.text)
            
            # 🔥 THIS IS THE KEY - Return the actual model that was used
            result['model_used'] = actual_model_used
            
            logger.info(f"✅ Pipeline Complete: {result['probability']}% (Confidence: {result['confidence']}%) using {actual_model_used}")
            
            return result
            
        except Exception as e:
            error_msg = f"API Error: {str(e)}"
            logger.error(f"Error in Gemini Pipeline: {error_msg}")
            import traceback
            traceback.print_exc()
            return self._default_response(custom_message=error_msg)

    def _fetch_live_news(self, query):
        """Fetch real-time news headlines using Google News RSS (No API Key Required)"""
        try:
            encoded_query = urllib.parse.quote(query)
            url = f'https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en'
            
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                
                news_items = []
                for item in root.findall('.//item')[:5]:  # Get top 5 headlines
                    title = item.find('title').text
                    pubDate = item.find('pubDate').text
                    news_items.append(f"- {pubDate}: {title}")
                
                if not news_items:
                    return "No recent news found."
                return "\n".join(news_items)
        except Exception as e:
            logger.warning(f"Failed to fetch live news: {str(e)}")
            return "Live news search unavailable."

    def _build_research_prompt(self, title, description, context=None):
        """Build prompt for the Research phase"""
        news_context = self._fetch_live_news(title)
        
        prompt = f"""
        Act as a professional prediction market analyst.
        Event: {title}
        Description: {description}
        Current Market Context: {json.dumps(context) if context else 'None'}
        
        Recent Live News Headlines:
        {news_context}
        
        Based on your extensive knowledge base, training data, and the provided Live News Headlines above, provide a comprehensive research report detailing:
        1. Current status and recent developments (explicitly mention news if relevant)
        2. Key factors that will influence the outcome
        3. A reasoned estimation of the probability (0-100)
        4. Your confidence level in this estimation
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
                'probability': prob_raw,
                'confidence': conf_raw,
                'reasoning': str(data.get('reasoning', 'Analysis complete')).replace('\n', ' '),
                'key_factors': data.get('key_factors', [])[:5],
                'sources_consulted': str(data.get('sources_consulted', ''))[:200]
            }
        except Exception as e:
            logger.error(f"Critical error parsing JSON: {str(e)}")
            return self._default_response()

    def _default_response(self, custom_message=None):
        """Fallback for critical failures"""
        message = custom_message or 'AI analysis unavailable due to system error.'
        return {
            'probability': 50.0,
            'confidence': 0.0,
            'reasoning': message,
            'key_factors': [],
            'sources_consulted': '',
            'model_used': 'fallback'
        }


# Global instance
gemini_client = GeminiClient()