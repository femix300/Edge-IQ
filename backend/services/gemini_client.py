"""
Google Gemini API Client
Handles AI probability estimation
"""
import google.generativeai as genai
from decouple import config
import json
import logging

logger = logging.getLogger(__name__)


class GeminiClient:
    """
    Client for Google Gemini AI
    """
    
    def __init__(self):
        self.api_key = config('GEMINI_API_KEY', default='')
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            logger.warning("No Gemini API key configured")
            self.model = None
    
    def estimate_probability(self, event_title, event_description, market_context=None):
        """
        Use Gemini to estimate true probability of an event
        
        Args:
            event_title: Title of the prediction market
            event_description: Description of the event
            market_context: Additional context (current price, volume, etc.)
            
        Returns:
            Dictionary with probability, confidence, and reasoning
        """
        if not self.model:
            logger.error("Gemini model not initialized - no API key")
            return self._default_response()
        
        try:
            # Build the prompt
            prompt = self._build_probability_prompt(
                event_title, 
                event_description, 
                market_context
            )
            
            # Configure generation with search grounding
            generation_config = genai.GenerationConfig(
                temperature=0.3,  # Lower temperature for more consistent outputs
                top_p=0.95,
                top_k=40,
                max_output_tokens=1000,
            )
            
            # Generate response with Google Search grounding
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config,
                tools='google_search_retrieval'  # Enable search grounding
            )
            
            # Parse the response
            result = self._parse_response(response.text)
            
            logger.info(f"Gemini estimate for '{event_title}': {result['probability']}% (Confidence: {result['confidence']}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return self._default_response()
    
    def _build_probability_prompt(self, title, description, context=None):
        """
        Build prompt for Gemini
        
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are a quantitative analyst specializing in probability estimation for prediction markets.

Your task is to estimate the TRUE probability of the following event occurring, based on:
1. Recent news and developments (use Google Search)
2. Historical precedents and patterns
3. Statistical analysis and expert opinions
4. Current market conditions

EVENT TO ANALYZE:
Title: {title}
Description: {description or 'No additional description provided'}
"""

        if context:
            prompt += f"""
CURRENT MARKET CONTEXT:
- Current market price: ₦{context.get('current_price', 'N/A')}
- Market implied probability: {context.get('implied_probability', 'N/A')}%
- 24h volume: ₦{context.get('volume_24h', 'N/A')}
"""

        prompt += """
INSTRUCTIONS:
1. Search for recent, relevant news and data about this event
2. Consider historical precedents - how often has this type of outcome occurred?
3. Evaluate expert opinions and statistical models
4. Form an independent probability estimate based on evidence, NOT the market price
5. Assess your confidence level in this estimate

Return your analysis in the following JSON format (and ONLY this JSON, no other text):

{
    "probability": <number between 0 and 100>,
    "confidence": <number between 0 and 100>,
    "reasoning": "<2-3 sentence summary of your analysis>",
    "key_factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
    "sources_consulted": "<brief mention of what you researched>"
}

CRITICAL: Return ONLY valid JSON. No markdown formatting, no code blocks, no preamble.
"""
        
        return prompt
    
    def _parse_response(self, response_text):
        """
        Parse Gemini's response into structured data
        
        Args:
            response_text: Raw text from Gemini
            
        Returns:
            Dictionary with parsed data
        """
        try:
            # Clean the response (remove markdown code blocks if present)
            cleaned_text = response_text.strip()
            
            # Remove ```json and ``` if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            data = json.loads(cleaned_text)
            
            # Validate and extract fields
            probability = float(data.get('probability', 50))
            confidence = float(data.get('confidence', 50))
            reasoning = data.get('reasoning', 'Analysis completed')
            key_factors = data.get('key_factors', [])
            sources = data.get('sources_consulted', '')
            
            # Clamp values to valid ranges
            probability = max(0, min(100, probability))
            confidence = max(0, min(100, confidence))
            
            return {
                'probability': probability,
                'confidence': confidence,
                'reasoning': reasoning,
                'key_factors': key_factors,
                'sources_consulted': sources,
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
            logger.error(f"Response text: {response_text}")
            
            # Attempt to extract probability from text
            return self._fallback_parse(response_text)
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {str(e)}")
            return self._default_response()
    
    def _fallback_parse(self, text):
        """
        Fallback parser if JSON parsing fails
        Attempts to extract probability from natural language
        """
        import re
        
        # Try to find probability percentage in text
        prob_match = re.search(r'(\d+)%?\s*(?:probability|chance|likely)', text, re.IGNORECASE)
        
        if prob_match:
            probability = float(prob_match.group(1))
        else:
            probability = 50  # Default to neutral
        
        return {
            'probability': max(0, min(100, probability)),
            'confidence': 50,
            'reasoning': text[:200] if text else 'Analysis completed with limited data',
            'key_factors': [],
            'sources_consulted': '',
        }
    
    def _default_response(self):
        """
        Default response when Gemini is unavailable
        """
        return {
            'probability': 50,
            'confidence': 0,
            'reasoning': 'AI analysis unavailable - using neutral estimate',
            'key_factors': [],
            'sources_consulted': '',
        }
    
    def review_backtest(self, strategy_name, results):
        """
        Generate AI review of backtest results
        
        Args:
            strategy_name: Name of the strategy tested
            results: Dictionary with backtest metrics
            
        Returns:
            Natural language review and recommendations
        """
        if not self.model:
            return "AI review unavailable - Gemini API key not configured"
        
        try:
            prompt = f"""You are reviewing a quantitative trading strategy backtest.

STRATEGY: {strategy_name}

RESULTS:
- Total Trades: {results.get('total_trades', 0)}
- Win Rate: {results.get('win_rate', 0)}%
- Total Return: {results.get('total_return_pct', 0)}%
- Max Drawdown: {results.get('max_drawdown_pct', 0)}%
- Sharpe Ratio: {results.get('sharpe_ratio', 'N/A')}

Provide a concise 3-4 sentence review that:
1. Highlights the strategy's main strength
2. Identifies its biggest weakness
3. Gives ONE specific, actionable improvement suggestion

Be direct and practical. No generic advice."""

            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating backtest review: {str(e)}")
            return "AI review unavailable"


# Global instance
gemini_client = GeminiClient()
