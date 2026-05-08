import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response

_cache = {"rate": None, "ts": 0}

@api_view(['GET'])
def exchange_rate(request):
    import time
    if _cache["rate"] and time.time() - _cache["ts"] < 3600:  # 1hr cache
        return Response({"rate": _cache["rate"]})
    try:
        res = requests.get("https://api.frankfurter.app/latest?from=USD&to=NGN", timeout=5)
        rate = res.json()["rates"]["NGN"]
        _cache["rate"] = rate
        _cache["ts"] = time.time()
        return Response({"rate": rate})
    except Exception as e:
        return Response({"rate": 1600}, status=200)  # fallback
